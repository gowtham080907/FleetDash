export type MessageHandler = (channel: string, data: Buffer) => void;

export interface MessageBroker {
  connect(): Promise<void>;
  publish(channel: string, data: Buffer | string): Promise<number>;
  subscribe(channel: string, handler: MessageHandler): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  isHealthy(): boolean;
  disconnect(): Promise<void>;
  getBrokerType(): 'redis' | 'memory';
}
