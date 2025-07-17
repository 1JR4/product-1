import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface Message {
  id: string;
  from: string;
  to: string | string[]; // Single recipient or broadcast to multiple
  type: 'request' | 'response' | 'event' | 'broadcast';
  payload: any;
  timestamp: Date;
  correlationId?: string; // For request-response patterns
  priority: 'low' | 'normal' | 'high' | 'critical';
  ttl?: number; // Time to live in milliseconds
  retryCount?: number;
  maxRetries?: number;
}

export interface MessageRoute {
  pattern: string | RegExp;
  handler: (message: Message) => Promise<any>;
  middleware?: MessageMiddleware[];
}

export type MessageMiddleware = (message: Message, next: () => Promise<any>) => Promise<any>;

export interface QueuedMessage extends Message {
  queuedAt: Date;
  attempts: number;
  nextRetry?: Date;
}

export interface MessageMetrics {
  sent: number;
  received: number;
  failed: number;
  queued: number;
  averageLatency: number;
  messagesByType: Record<string, number>;
  messagesByPriority: Record<string, number>;
}

export class MessageBus extends EventEmitter {
  private subscribers: Map<string, Set<string>> = new Map(); // topic -> set of agent IDs
  private routes: Map<string, MessageRoute[]> = new Map(); // agent ID -> routes
  private messageQueue: Map<string, QueuedMessage[]> = new Map(); // agent ID -> messages
  private messageHistory: Map<string, Message[]> = new Map(); // conversation threads
  private activeConnections: Set<string> = new Set(); // active agent connections
  private metrics: MessageMetrics = {
    sent: 0,
    received: 0,
    failed: 0,
    queued: 0,
    averageLatency: 0,
    messagesByType: {},
    messagesByPriority: {}
  };

  private middleware: MessageMiddleware[] = [];
  private retryInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.startRetryProcessor();
    this.startCleanupProcessor();
  }

  // Subscription management
  subscribe(agentId: string, topics: string[] = ['*']): void {
    this.activeConnections.add(agentId);
    
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, []);
    }

    if (!this.routes.has(agentId)) {
      this.routes.set(agentId, []);
    }

    topics.forEach(topic => {
      if (!this.subscribers.has(topic)) {
        this.subscribers.set(topic, new Set());
      }
      this.subscribers.get(topic)!.add(agentId);
    });

    this.emit('agent:subscribed', agentId, topics);
  }

  unsubscribe(agentId: string, topics?: string[]): void {
    if (topics) {
      topics.forEach(topic => {
        const subscribers = this.subscribers.get(topic);
        if (subscribers) {
          subscribers.delete(agentId);
          if (subscribers.size === 0) {
            this.subscribers.delete(topic);
          }
        }
      });
    } else {
      // Unsubscribe from all topics
      for (const [topic, subscribers] of this.subscribers.entries()) {
        subscribers.delete(agentId);
        if (subscribers.size === 0) {
          this.subscribers.delete(topic);
        }
      }
      
      this.activeConnections.delete(agentId);
      this.messageQueue.delete(agentId);
      this.routes.delete(agentId);
    }

    this.emit('agent:unsubscribed', agentId, topics);
  }

  // Message routing
  addRoute(agentId: string, pattern: string | RegExp, handler: (message: Message) => Promise<any>): void {
    if (!this.routes.has(agentId)) {
      this.routes.set(agentId, []);
    }

    this.routes.get(agentId)!.push({
      pattern,
      handler,
      middleware: []
    });
  }

  removeRoute(agentId: string, pattern: string | RegExp): void {
    const routes = this.routes.get(agentId);
    if (routes) {
      const index = routes.findIndex(route => route.pattern === pattern);
      if (index >= 0) {
        routes.splice(index, 1);
      }
    }
  }

  // Middleware
  use(middleware: MessageMiddleware): void {
    this.middleware.push(middleware);
  }

  // Message sending
  async send(to: string | string[], payload: any, options: Partial<Message> = {}): Promise<string> {
    const message: Message = {
      id: this.generateMessageId(),
      from: options.from || 'system',
      to,
      type: options.type || 'event',
      payload,
      timestamp: new Date(),
      priority: options.priority || 'normal',
      ttl: options.ttl,
      correlationId: options.correlationId,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    await this.deliverMessage(message);
    return message.id;
  }

  async request(to: string, payload: any, timeout = 30000): Promise<any> {
    const correlationId = this.generateMessageId();
    
    const message: Message = {
      id: this.generateMessageId(),
      from: 'system',
      to,
      type: 'request',
      payload,
      timestamp: new Date(),
      correlationId,
      priority: 'normal',
      ttl: timeout
    };

    // Set up response listener
    const responsePromise = new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removeListener('response:' + correlationId, responseHandler);
        reject(new Error('Request timeout'));
      }, timeout);

      const responseHandler = (response: any) => {
        clearTimeout(timeoutHandle);
        resolve(response);
      };

      this.once('response:' + correlationId, responseHandler);
    });

    await this.deliverMessage(message);
    return responsePromise;
  }

  async respond(originalMessage: Message, payload: any): Promise<void> {
    if (!originalMessage.correlationId) {
      throw new Error('Cannot respond to message without correlationId');
    }

    const response: Message = {
      id: this.generateMessageId(),
      from: 'system',
      to: originalMessage.from,
      type: 'response',
      payload,
      timestamp: new Date(),
      correlationId: originalMessage.correlationId,
      priority: originalMessage.priority
    };

    await this.deliverMessage(response);
  }

  async broadcast(topic: string, payload: any, options: Partial<Message> = {}): Promise<void> {
    const subscribers = this.subscribers.get(topic) || this.subscribers.get('*') || new Set();
    
    if (subscribers.size === 0) {
      return;
    }

    const message: Message = {
      id: this.generateMessageId(),
      from: options.from || 'system',
      to: Array.from(subscribers),
      type: 'broadcast',
      payload: { topic, data: payload },
      timestamp: new Date(),
      priority: options.priority || 'normal',
      ttl: options.ttl
    };

    await this.deliverMessage(message);
  }

  // Message delivery
  private async deliverMessage(message: Message): Promise<void> {
    try {
      this.updateMetrics('sent', message);

      const recipients = Array.isArray(message.to) ? message.to : [message.to];

      for (const recipient of recipients) {
        if (this.activeConnections.has(recipient)) {
          await this.deliverToAgent(recipient, message);
        } else {
          // Queue message for offline agent
          await this.queueMessage(recipient, message);
        }
      }

      // Store in conversation history
      this.storeInHistory(message);

    } catch (error) {
      this.updateMetrics('failed', message);
      this.emit('message:delivery_failed', message, error);
      throw error;
    }
  }

  private async deliverToAgent(agentId: string, message: Message): Promise<void> {
    try {
      // Apply middleware
      await this.applyMiddleware(message);

      // Find matching routes
      const routes = this.routes.get(agentId) || [];
      const matchingRoutes = routes.filter(route => this.matchesRoute(message, route.pattern));

      if (matchingRoutes.length === 0) {
        // No specific route, deliver as general message
        this.emit('message:' + agentId, message);
      } else {
        // Execute route handlers
        for (const route of matchingRoutes) {
          try {
            const result = await route.handler(message);
            
            // If this was a request, send response
            if (message.type === 'request' && message.correlationId) {
              await this.respond(message, result);
            }
          } catch (error) {
            this.emit('route:error', agentId, route, error);
          }
        }
      }

      // Handle response messages
      if (message.type === 'response' && message.correlationId) {
        this.emit('response:' + message.correlationId, message.payload);
      }

      this.updateMetrics('received', message);
      this.emit('message:delivered', agentId, message);

    } catch (error) {
      this.updateMetrics('failed', message);
      throw error;
    }
  }

  private async queueMessage(agentId: string, message: Message): Promise<void> {
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, []);
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      queuedAt: new Date(),
      attempts: 0
    };

    const queue = this.messageQueue.get(agentId)!;
    
    // Insert based on priority
    const insertIndex = this.findInsertIndex(queue, queuedMessage);
    queue.splice(insertIndex, 0, queuedMessage);

    this.updateMetrics('queued', message);
    this.emit('message:queued', agentId, message);
  }

  private findInsertIndex(queue: QueuedMessage[], message: QueuedMessage): number {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const messagePriority = priorityOrder[message.priority];

    for (let i = 0; i < queue.length; i++) {
      const queuePriority = priorityOrder[queue[i].priority];
      if (messagePriority < queuePriority) {
        return i;
      }
    }

    return queue.length;
  }

  private async applyMiddleware(message: Message): Promise<void> {
    let index = 0;
    
    const next = async (): Promise<any> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        return middleware(message, next);
      }
    };

    await next();
  }

  private matchesRoute(message: Message, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return message.type === pattern || pattern === '*';
    } else {
      return pattern.test(message.type) || pattern.test(JSON.stringify(message.payload));
    }
  }

  private storeInHistory(message: Message): void {
    const threadId = message.correlationId || message.id;
    
    if (!this.messageHistory.has(threadId)) {
      this.messageHistory.set(threadId, []);
    }

    const history = this.messageHistory.get(threadId)!;
    history.push(message);

    // Keep only last 100 messages per thread
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  // Queue processing
  async processQueuedMessages(agentId: string): Promise<void> {
    const queue = this.messageQueue.get(agentId);
    if (!queue || queue.length === 0) {
      return;
    }

    const now = new Date();
    const messagesToProcess = queue.filter(msg => {
      // Check TTL
      if (msg.ttl && (now.getTime() - msg.timestamp.getTime()) > msg.ttl) {
        return false;
      }
      
      // Check retry timing
      if (msg.nextRetry && now < msg.nextRetry) {
        return false;
      }
      
      return true;
    });

    for (const queuedMessage of messagesToProcess) {
      try {
        await this.deliverToAgent(agentId, queuedMessage);
        
        // Remove from queue on successful delivery
        const index = queue.indexOf(queuedMessage);
        if (index >= 0) {
          queue.splice(index, 1);
        }
      } catch (error) {
        queuedMessage.attempts++;
        
        if (queuedMessage.attempts >= (queuedMessage.maxRetries || 3)) {
          // Max retries reached, remove from queue
          const index = queue.indexOf(queuedMessage);
          if (index >= 0) {
            queue.splice(index, 1);
          }
          
          this.emit('message:retry_failed', agentId, queuedMessage, error);
        } else {
          // Schedule retry
          queuedMessage.nextRetry = new Date(Date.now() + (queuedMessage.attempts * 5000));
          this.emit('message:retry_scheduled', agentId, queuedMessage);
        }
      }
    }
  }

  private startRetryProcessor(): void {
    this.retryInterval = setInterval(async () => {
      for (const agentId of this.activeConnections) {
        await this.processQueuedMessages(agentId).catch(error => {
          this.emit('queue:processing_error', agentId, error);
        });
      }
    }, 5000); // Process every 5 seconds
  }

  private startCleanupProcessor(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMessages();
      this.cleanupOldHistory();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredMessages(): void {
    const now = new Date();
    
    for (const [agentId, queue] of this.messageQueue.entries()) {
      const validMessages = queue.filter(msg => {
        if (msg.ttl && (now.getTime() - msg.timestamp.getTime()) > msg.ttl) {
          this.emit('message:expired', agentId, msg);
          return false;
        }
        return true;
      });
      
      this.messageQueue.set(agentId, validMessages);
    }
  }

  private cleanupOldHistory(): void {
    const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
    
    for (const [threadId, history] of this.messageHistory.entries()) {
      const recentMessages = history.filter(msg => msg.timestamp > cutoff);
      
      if (recentMessages.length === 0) {
        this.messageHistory.delete(threadId);
      } else {
        this.messageHistory.set(threadId, recentMessages);
      }
    }
  }

  // Utility methods
  private generateMessageId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16);
  }

  private updateMetrics(type: 'sent' | 'received' | 'failed' | 'queued', message: Message): void {
    this.metrics[type]++;
    
    if (!this.metrics.messagesByType[message.type]) {
      this.metrics.messagesByType[message.type] = 0;
    }
    this.metrics.messagesByType[message.type]++;
    
    if (!this.metrics.messagesByPriority[message.priority]) {
      this.metrics.messagesByPriority[message.priority] = 0;
    }
    this.metrics.messagesByPriority[message.priority]++;
  }

  // Public API
  getActiveConnections(): string[] {
    return Array.from(this.activeConnections);
  }

  getQueueSize(agentId: string): number {
    const queue = this.messageQueue.get(agentId);
    return queue ? queue.length : 0;
  }

  getQueuedMessages(agentId: string): QueuedMessage[] {
    const queue = this.messageQueue.get(agentId);
    return queue ? [...queue] : [];
  }

  getConversationHistory(threadId: string): Message[] {
    const history = this.messageHistory.get(threadId);
    return history ? [...history] : [];
  }

  getMetrics(): MessageMetrics {
    return { ...this.metrics };
  }

  getSubscribers(topic: string): string[] {
    const subscribers = this.subscribers.get(topic);
    return subscribers ? Array.from(subscribers) : [];
  }

  async clearQueue(agentId: string): Promise<void> {
    this.messageQueue.set(agentId, []);
    this.emit('queue:cleared', agentId);
  }

  async cleanup(): Promise<void> {
    clearInterval(this.retryInterval);
    clearInterval(this.cleanupInterval);
    
    this.subscribers.clear();
    this.routes.clear();
    this.messageQueue.clear();
    this.messageHistory.clear();
    this.activeConnections.clear();
    
    this.emit('messagebus:shutdown');
  }
}