import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/env';
import { WorkerRequest, WorkerResponse } from '../types/worker-protocol';
import { AppError } from '../utils/AppError';

export interface PendingTask {
  requestId: string;
  workerIndex: number;
  resolve: (value: WorkerResponse) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
  createdAt: number;
}

export interface WorkerInstance {
  id: number;
  worker: Worker;
  ready: boolean;
  activeTasks: number;
  restartCount: number;
  lastRestartTime: number;
  isTerminating: boolean;
}

export interface WorkerPoolStatus {
  ready: boolean;
  poolSize: number;
  activeWorkers: number;
  pendingTasks: number;
  isShuttingDown: boolean;
}

export class WorkerPoolService {
  private workers: WorkerInstance[] = [];
  private pendingTasks: Map<string, PendingTask> = new Map();
  private poolSize: number;
  private defaultTimeoutMs: number;
  private maxQueueSize: number;
  private isShuttingDown = false;
  private isInitialized = false;

  constructor(
    poolSize = config.WORKER_POOL_SIZE,
    defaultTimeoutMs = config.WORKER_TASK_TIMEOUT_MS,
    maxQueueSize = config.WORKER_QUEUE_MAX_SIZE
  ) {
    this.poolSize = Math.max(1, poolSize);
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Resolves the worker script path dynamically:
   * - In development (running .ts via tsx/ts-node): uses src/workers/telemetry.worker.ts with tsx loader
   * - In compiled production (running .js via dist): uses dist/workers/telemetry.worker.js
   */
  private resolveWorkerPath(): { workerPath: string; execArgv?: string[] } {
    const isTs = __filename.endsWith('.ts');
    if (isTs) {
      const tsWorkerPath = path.resolve(__dirname, '../workers/telemetry.worker.ts');
      const hasTsLoader = process.execArgv.some(
        (arg) => arg.includes('tsx') || arg.includes('ts-node')
      );
      return {
        workerPath: tsWorkerPath,
        execArgv: hasTsLoader ? undefined : ['--import', 'tsx'],
      };
    }

    const jsWorkerPath = path.resolve(__dirname, '../workers/telemetry.worker.js');
    return {
      workerPath: jsWorkerPath,
    };
  }

  /**
   * Spawns a single worker instance and attaches event listeners.
   */
  private spawnWorker(id: number): WorkerInstance {
    const { workerPath, execArgv } = this.resolveWorkerPath();
    const worker = new Worker(workerPath, {
      execArgv: execArgv ?? process.execArgv,
    });

    const instance: WorkerInstance = {
      id,
      worker,
      ready: false,
      activeTasks: 0,
      restartCount: 0,
      lastRestartTime: Date.now(),
      isTerminating: false,
    };

    worker.on('message', (message: WorkerResponse) => {
      this.handleWorkerMessage(instance, message);
    });

    worker.on('error', (err) => {
      this.handleWorkerFailure(instance, `Worker error: ${err.message}`);
    });

    worker.on('messageerror', (err) => {
      this.handleWorkerFailure(instance, `Worker message deserialization error: ${err.message}`);
    });

    worker.on('exit', (code) => {
      if (!instance.isTerminating && !this.isShuttingDown) {
        this.handleWorkerFailure(instance, `Worker exited unexpectedly with code ${code}`, code);
      }
    });

    return instance;
  }

  /**
   * Handles incoming message from a worker.
   */
  private handleWorkerMessage(instance: WorkerInstance, message: WorkerResponse): void {
    if (message.type === 'READY') {
      instance.ready = true;
      return;
    }

    const { requestId } = message;
    const task = this.pendingTasks.get(requestId);
    if (!task) {
      return;
    }

    clearTimeout(task.timer);
    this.pendingTasks.delete(requestId);
    instance.activeTasks = Math.max(0, instance.activeTasks - 1);

    task.resolve(message);
  }

  /**
   * Handles unexpected worker failure (error or non-zero exit):
   * Rejects in-flight tasks and triggers automatic respawn with rate limiting.
   */
  private handleWorkerFailure(instance: WorkerInstance, reason: string, _exitCode?: number): void {
    if (instance.isTerminating || this.isShuttingDown) {
      return;
    }

    instance.isTerminating = true;
    instance.ready = false;

    // Reject all in-flight tasks assigned to this worker
    for (const [requestId, task] of this.pendingTasks.entries()) {
      if (task.workerIndex === instance.id) {
        clearTimeout(task.timer);
        this.pendingTasks.delete(requestId);
        task.reject(
          new AppError(
            `Worker task failed: ${reason}`,
            500,
            'WORKER_CRASHED',
            [{ requestId, reason }]
          )
        );
      }
    }
    instance.activeTasks = 0;

    // Respawn with rate limiting (max 5 restarts within 30 seconds)
    const now = Date.now();
    if (now - instance.lastRestartTime > 30000) {
      instance.restartCount = 0;
    }
    instance.restartCount += 1;
    instance.lastRestartTime = now;

    if (instance.restartCount > 5) {
      console.error(`[WorkerPool] Worker ${instance.id} exceeded crash loop threshold (5 crashes in 30s). Not respawning.`);
      return;
    }

    const backoffMs = Math.min(100 * Math.pow(2, instance.restartCount - 1), 2000);
    setTimeout(() => {
      if (this.isShuttingDown) return;
      try {
        const newInstance = this.spawnWorker(instance.id);
        newInstance.restartCount = instance.restartCount;
        newInstance.lastRestartTime = instance.lastRestartTime;

        const idx = this.workers.findIndex((w) => w.id === instance.id);
        if (idx !== -1) {
          this.workers[idx] = newInstance;
        } else {
          this.workers.push(newInstance);
        }
      } catch (err) {
        console.error(`[WorkerPool] Failed to respawn worker ${instance.id}:`, err);
      }
    }, backoffMs);
  }

  /**
   * Initializes the pool by spawning WORKER_POOL_SIZE workers and waiting for them to be READY.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isShuttingDown = false;
    this.workers = [];

    const readyPromises: Promise<void>[] = [];

    for (let i = 0; i < this.poolSize; i++) {
      const instance = this.spawnWorker(i);
      this.workers.push(instance);

      readyPromises.push(
        new Promise<void>((resolve) => {
          if (instance.ready) {
            resolve();
            return;
          }
          const checkInterval = setInterval(() => {
            if (instance.ready || this.isShuttingDown) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 20);

          // Fallback timeout for READY state
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 3000);
        })
      );
    }

    await Promise.all(readyPromises);
    this.isInitialized = true;
  }

  /**
   * Dispatches a request to an available worker using least-busy scheduling.
   * Includes bounded queue check (backpressure) and per-task timeout.
   */
  public async run(
    request: WorkerRequest,
    customTimeoutMs?: number
  ): Promise<WorkerResponse> {
    if (this.isShuttingDown) {
      throw new AppError('Worker pool is shutting down', 503, 'WORKER_UNAVAILABLE');
    }

    if (this.workers.length === 0) {
      throw new AppError('No workers available in the pool', 503, 'WORKER_UNAVAILABLE');
    }

    // Bounded queue backpressure check
    if (this.pendingTasks.size >= this.maxQueueSize) {
      throw new AppError(
        `Worker pool queue full: current pending ${this.pendingTasks.size} exceeds maximum ${this.maxQueueSize}`,
        503,
        'WORKER_QUEUE_FULL'
      );
    }

    // Select least-busy ready worker
    const readyWorkers = this.workers.filter((w) => w.ready && !w.isTerminating);
    const candidateWorkers = readyWorkers.length > 0 ? readyWorkers : this.workers.filter((w) => !w.isTerminating);

    if (candidateWorkers.length === 0) {
      throw new AppError('All workers are currently terminating or restarting', 503, 'WORKER_UNAVAILABLE');
    }

    // Pick worker with minimum active tasks
    let selectedWorker = candidateWorkers[0]!;
    for (let i = 1; i < candidateWorkers.length; i++) {
      const candidate = candidateWorkers[i]!;
      if (candidate.activeTasks < selectedWorker.activeTasks) {
        selectedWorker = candidate;
      }
    }

    const { requestId } = request;
    const timeoutMs = customTimeoutMs ?? this.defaultTimeoutMs;

    return new Promise<WorkerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingTasks.delete(requestId);
        selectedWorker.activeTasks = Math.max(0, selectedWorker.activeTasks - 1);
        reject(
          new AppError(
            `Worker task ${requestId} timed out after ${timeoutMs}ms`,
            504,
            'WORKER_TIMEOUT',
            [{ requestId, timeoutMs }]
          )
        );
      }, timeoutMs);

      const pendingTask: PendingTask = {
        requestId,
        workerIndex: selectedWorker.id,
        resolve,
        reject,
        timer,
        createdAt: Date.now(),
      };

      this.pendingTasks.set(requestId, pendingTask);
      selectedWorker.activeTasks += 1;

      try {
        selectedWorker.worker.postMessage(request);
      } catch (err) {
        clearTimeout(timer);
        this.pendingTasks.delete(requestId);
        selectedWorker.activeTasks = Math.max(0, selectedWorker.activeTasks - 1);
        reject(
          new AppError(
            `Failed to post message to worker: ${err instanceof Error ? err.message : String(err)}`,
            500,
            'WORKER_DISPATCH_FAILED'
          )
        );
      }
    });
  }

  /**
   * Returns current pool health and metrics.
   */
  public getStatus(): WorkerPoolStatus {
    const activeWorkers = this.workers.filter((w) => w.ready && !w.isTerminating).length;
    const ready = activeWorkers > 0 && !this.isShuttingDown;

    return {
      ready,
      poolSize: this.workers.length || this.poolSize,
      activeWorkers,
      pendingTasks: this.pendingTasks.size,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Graceful shutdown:
   * - Clears timers and rejects pending tasks with 503
   * - Terminates all workers
   * - Idempotent
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown && this.workers.length === 0) {
      return;
    }

    this.isShuttingDown = true;
    this.isInitialized = false;

    // Reject all pending tasks immediately
    for (const [requestId, task] of this.pendingTasks.entries()) {
      clearTimeout(task.timer);
      task.reject(
        new AppError(
          'Worker pool shutting down',
          503,
          'WORKER_SHUTDOWN',
          [{ requestId }]
        )
      );
    }
    this.pendingTasks.clear();

    // Terminate all workers cleanly
    const terminationPromises = this.workers.map((w) => {
      w.isTerminating = true;
      w.ready = false;
      return w.worker.terminate();
    });

    await Promise.allSettled(terminationPromises);
    this.workers = [];
  }
}

// Singleton worker pool instance
export const workerPool = new WorkerPoolService();
