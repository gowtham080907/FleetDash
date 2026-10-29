import { io, Socket } from 'socket.io-client';
import { VehicleTelemetry, GeofenceEventPayload, validateTelemetryBatch } from '@/types/telemetry';
import { decodeBinaryBatch } from '@/services/telemetry/binaryDecoder';
import { positionStore } from '@/stores/vehiclePositionStore';
import { useToastStore } from '@/stores/toastStore';

export type SocketConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ProposedEventContract {
  'telemetry:batch': (data: VehicleTelemetry[] | ArrayBuffer) => void;
  'vehicle:updated': (data: VehicleTelemetry) => void;
  'vehicle:status': (data: { vehicleId: string; status: 'active' | 'idle' | 'offline' }) => void;
  'geofence:breach': (data: GeofenceEventPayload) => void;
  'geofence:clear': (data: { vehicleId: string; geofenceId: string; timestamp: number }) => void;
  'fleet:stats': (data: Record<string, unknown>) => void;
}

export type SocketEventHandler<T = unknown> = (payload: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private status: SocketConnectionStatus = 'disconnected';
  private serverUrl: string;
  private isDemoMode: boolean;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private initialBackoffMs = 1000;
  private maxBackoffMs = 10000;

  // Listeners by event name
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private statusListeners = new Set<(status: SocketConnectionStatus) => void>();

  constructor() {
    this.serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    this.isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
  }

  public getStatus(): SocketConnectionStatus {
    return this.status;
  }

  public getUrl(): string {
    return this.serverUrl;
  }

  public setUrl(url: string): void {
    if (this.serverUrl !== url) {
      this.serverUrl = url;
      if (this.socket) {
        this.disconnect();
        this.connect();
      }
    }
  }

  /**
   * Initializes the Socket.IO connection.
   */
  public connect(): void {
    if (this.socket?.connected || this.status === 'connecting') {
      return;
    }

    this.updateStatus('connecting');

    // In demo mode without backend, indicate demo connection
    if (this.isDemoMode) {
      setTimeout(() => {
        this.updateStatus('connected');
      }, 300);
      return;
    }

    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.initialBackoffMs,
        reconnectionDelayMax: this.maxBackoffMs,
        timeout: 10000,
      });

      this.setupSocketHandlers();
    } catch (err) {
      console.error('Socket initialization error:', err);
      this.updateStatus('error');
      this.handleReconnection();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * Subscribes safely to a proposed socket event.
   * Returns an unsubscribe disposal function to prevent memory leaks.
   */
  public on<E extends keyof ProposedEventContract>(
    event: E,
    handler: ProposedEventContract[E]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const set = this.listeners.get(event)!;
    set.add(handler as SocketEventHandler);

    return () => {
      set.delete(handler as SocketEventHandler);
    };
  }

  /**
   * Subscribes to socket connection lifecycle changes.
   */
  public onStatusChange(listener: (status: SocketConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Dispatches an event locally to all registered handlers (used by both real socket & demo simulator).
   */
  public dispatch<E extends keyof ProposedEventContract>(
    event: E,
    payload: Parameters<ProposedEventContract[E]>[0]
  ): void {
    // 1. Process ingestion pipelines directly into spatial position store
    if (event === 'telemetry:batch') {
      if (payload instanceof ArrayBuffer) {
        const decoded = decodeBinaryBatch(payload);
        positionStore.updateBatch(decoded.records, decoded.rejectedCount);
      } else if (Array.isArray(payload)) {
        const validated = validateTelemetryBatch(payload);
        positionStore.updateBatch(validated.valid, validated.rejectedCount);
      }
    } else if (event === 'vehicle:updated') {
      const v = payload as VehicleTelemetry;
      positionStore.updateBatch([v], 0);
    } else if (event === 'geofence:breach') {
      const breach = payload as GeofenceEventPayload;
      useToastStore.getState().addToast({
        type: 'error',
        title: `GEOFENCE BREACH: ${breach.vehicleId}`,
        message: `Exited authorized boundary "${breach.geofenceName}" at ${breach.speed} km/h`,
        duration: 6000,
      });
    }

    // 2. Notify event handlers
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(payload);
        } catch (e) {
          console.error(`Error in socket event handler for ${event}:`, e);
        }
      }
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.updateStatus('disconnected');
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', () => {
      this.updateStatus('error');
      this.handleReconnection();
    });

    // Wire proposed backend event names
    const events: (keyof ProposedEventContract)[] = [
      'telemetry:batch',
      'vehicle:updated',
      'vehicle:status',
      'geofence:breach',
      'geofence:clear',
      'fleet:stats',
    ];

    for (const evt of events) {
      this.socket.on(evt, (data: unknown) => {
        this.dispatch(evt, data as never);
      });
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    const backoff = Math.min(
      this.initialBackoffMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxBackoffMs
    );

    setTimeout(() => {
      if (this.status !== 'connected') {
        this.connect();
      }
    }, backoff);
  }

  private updateStatus(newStatus: SocketConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const l of this.statusListeners) {
        l(newStatus);
      }
    }
  }
}

export const socketService = new SocketService();
