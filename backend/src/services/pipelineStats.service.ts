import { RawCoordinatePoint } from '../types/telemetry';

export interface PipelineStats {
  received: number;
  accepted: number;
  rejected: number;
  published: number;
  broadcast: number;
  dropped: number;
  inFlight: number;
  eventsPerSecond: number;
  activeVehicles: number;
  skippedFrames: number;
}

interface SecondBucket {
  second: number;
  count: number;
}

export class PipelineStatsService {
  private received = 0;
  private accepted = 0;
  private rejected = 0;
  private published = 0;
  private broadcast = 0;
  private dropped = 0;
  private inFlight = 0;
  private skippedFrames = 0;

  // Rolling window of recent events for eventsPerSecond calculation (last 10 seconds)
  private buckets: SecondBucket[] = [];
  private readonly WINDOW_SECONDS = 5;

  // Bounded latest vehicle state store (max 10,000 vehicles)
  private readonly MAX_VEHICLES = 10000;
  private vehicleStates: Map<string, RawCoordinatePoint> = new Map();

  public recordReceived(count: number): void {
    this.received += count;
    this.recordRollingEvent(count);
  }

  public recordAccepted(count: number): void {
    this.accepted += count;
  }

  public recordRejected(count: number): void {
    this.rejected += count;
  }

  public recordPublished(count: number): void {
    this.published += count;
  }

  public recordBroadcast(count: number): void {
    this.broadcast += count;
  }

  public recordDropped(count: number): void {
    this.dropped += count;
  }

  public recordSkippedFrame(count = 1): void {
    this.skippedFrames += count;
  }

  public incrementInFlight(count: number): void {
    this.inFlight += count;
  }

  public decrementInFlight(count: number): void {
    this.inFlight = Math.max(0, this.inFlight - count);
  }

  public getInFlightCount(): number {
    return this.inFlight;
  }

  public setVehicleState(vehicleId: string, record: RawCoordinatePoint): void {
    if (this.vehicleStates.size >= this.MAX_VEHICLES && !this.vehicleStates.has(vehicleId)) {
      // Remove oldest vehicle entry to keep bounded memory
      const firstKey = this.vehicleStates.keys().next().value;
      if (firstKey) {
        this.vehicleStates.delete(firstKey);
      }
    }
    this.vehicleStates.set(vehicleId, record);
  }

  public getVehicleStates(): RawCoordinatePoint[] {
    return Array.from(this.vehicleStates.values());
  }

  private recordRollingEvent(count: number): void {
    const currentSecond = Math.floor(Date.now() / 1000);
    this.cleanOldBuckets(currentSecond);

    const latest = this.buckets[this.buckets.length - 1];
    if (latest && latest.second === currentSecond) {
      latest.count += count;
    } else {
      this.buckets.push({ second: currentSecond, count });
    }
  }

  private cleanOldBuckets(currentSecond: number): void {
    const cutoff = currentSecond - this.WINDOW_SECONDS;
    while (this.buckets.length > 0 && this.buckets[0]!.second < cutoff) {
      this.buckets.shift();
    }
  }

  public getEventsPerSecond(): number {
    const currentSecond = Math.floor(Date.now() / 1000);
    this.cleanOldBuckets(currentSecond);

    if (this.buckets.length === 0) {
      return 0;
    }

    const totalEvents = this.buckets.reduce((sum, b) => sum + b.count, 0);
    // Use actual span or window
    const span = Math.max(1, currentSecond - this.buckets[0]!.second + 1);
    return Math.round(totalEvents / span);
  }

  public getStats(): PipelineStats {
    return {
      received: this.received,
      accepted: this.accepted,
      rejected: this.rejected,
      published: this.published,
      broadcast: this.broadcast,
      dropped: this.dropped,
      inFlight: this.inFlight,
      eventsPerSecond: this.getEventsPerSecond(),
      activeVehicles: this.vehicleStates.size,
      skippedFrames: this.skippedFrames,
    };
  }

  public reset(): void {
    this.received = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.published = 0;
    this.broadcast = 0;
    this.dropped = 0;
    this.inFlight = 0;
    this.skippedFrames = 0;
    this.buckets = [];
    this.vehicleStates.clear();
  }
}

export const pipelineStats = new PipelineStatsService();
