import { MessageBroker, MessageHandler } from './broker.types';

export class MemoryBroker implements MessageBroker {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private healthy = false;
  private connected = false;

  public async connect(): Promise<void> {
    this.connected = true;
    this.healthy = true;
  }

  public async publish(channel: string, data: Buffer | string): Promise<number> {
    if (!this.healthy) {
      throw new Error('MemoryBroker is not connected');
    }

    const payloadBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const channelHandlers = this.handlers.get(channel);

    if (!channelHandlers || channelHandlers.size === 0) {
      return 0;
    }

    // Call handlers synchronously/asynchronously without failing publisher
    for (const handler of channelHandlers) {
      try {
        // Clone buffer to simulate network isolation / prevent mutation
        const copy = Buffer.from(payloadBuffer);
        handler(channel, copy);
      } catch (err) {
        console.error(`[MemoryBroker] Error in subscriber handler for channel "${channel}":`, err);
      }
    }

    return channelHandlers.size;
  }

  public async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
  }

  public async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
  }

  public isHealthy(): boolean {
    return this.healthy && this.connected;
  }

  public async disconnect(): Promise<void> {
    this.healthy = false;
    this.connected = false;
    this.handlers.clear();
  }

  public getBrokerType(): 'memory' {
    return 'memory';
  }
}
