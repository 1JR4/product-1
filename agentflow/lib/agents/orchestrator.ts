import { EventEmitter } from 'events';
import { TmuxManager } from './tmux-manager';
import { HealthMonitor } from './health-monitor';
import { MessageBus } from './message-bus';
import { AgentWrapper } from './agent-wrapper';

export interface AgentConfig {
  id: string;
  type: 'claude-code' | 'worker' | 'monitor';
  projectId: string;
  taskId?: string;
  capabilities: string[];
  maxConcurrentTasks: number;
  resourceLimits: {
    memory: string;
    cpu: string;
    timeout: number;
  };
  environment: Record<string, string>;
}

export interface AgentInstance {
  id: string;
  config: AgentConfig;
  wrapper: AgentWrapper;
  sessionId: string;
  status: 'pending' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';
  health: {
    lastHeartbeat: Date;
    responseTime: number;
    errorCount: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  metrics: {
    tasksCompleted: number;
    totalRuntime: number;
    costIncurred: number;
    lastActivity: Date;
  };
  checkpoints: Array<{
    id: string;
    timestamp: Date;
    state: any;
    description: string;
  }>;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private tmuxManager: TmuxManager;
  private healthMonitor: HealthMonitor;
  private messageBus: MessageBus;
  private isShuttingDown = false;

  constructor() {
    super();
    this.tmuxManager = new TmuxManager();
    this.healthMonitor = new HealthMonitor();
    this.messageBus = new MessageBus();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Health monitoring events
    this.healthMonitor.on('agent:unhealthy', (agentId: string) => {
      this.handleUnhealthyAgent(agentId);
    });

    this.healthMonitor.on('agent:recovered', (agentId: string) => {
      this.emit('agent:recovered', agentId);
    });

    // Message bus events
    this.messageBus.on('agent:message', (message) => {
      this.handleAgentMessage(message);
    });

    // Tmux session events
    this.tmuxManager.on('session:terminated', (sessionId: string) => {
      this.handleSessionTermination(sessionId);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async createAgent(config: AgentConfig): Promise<string> {
    if (this.agents.has(config.id)) {
      throw new Error(`Agent with ID ${config.id} already exists`);
    }

    try {
      // Create tmux session
      const sessionId = await this.tmuxManager.createSession({
        name: `agent-${config.id}`,
        workingDirectory: process.cwd(),
        environment: config.environment
      });

      // Create agent wrapper
      const wrapper = new AgentWrapper(config);

      // Initialize agent instance
      const agent: AgentInstance = {
        id: config.id,
        config,
        wrapper,
        sessionId,
        status: 'pending',
        health: {
          lastHeartbeat: new Date(),
          responseTime: 0,
          errorCount: 0,
          memoryUsage: 0,
          cpuUsage: 0
        },
        metrics: {
          tasksCompleted: 0,
          totalRuntime: 0,
          costIncurred: 0,
          lastActivity: new Date()
        },
        checkpoints: []
      };

      this.agents.set(config.id, agent);

      // Register with health monitor
      this.healthMonitor.register(config.id, {
        interval: 5000,
        timeout: 10000,
        maxFailures: 3
      });

      // Subscribe to message bus
      this.messageBus.subscribe(config.id);

      this.emit('agent:created', config.id);
      return config.id;
    } catch (error) {
      throw new Error(`Failed to create agent ${config.id}: ${error.message}`);
    }
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === 'running') {
      return;
    }

    try {
      agent.status = 'starting';
      this.emit('agent:status', agentId, 'starting');

      // Start agent in tmux session
      await this.tmuxManager.executeInSession(
        agent.sessionId,
        await agent.wrapper.getStartCommand()
      );

      // Wait for agent to be ready
      await this.waitForAgentReady(agentId, 30000);

      agent.status = 'running';
      agent.health.lastHeartbeat = new Date();
      
      this.emit('agent:started', agentId);
      this.emit('agent:status', agentId, 'running');
    } catch (error) {
      agent.status = 'error';
      this.emit('agent:error', agentId, error);
      throw error;
    }
  }

  async stopAgent(agentId: string, graceful = true): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === 'stopped') {
      return;
    }

    try {
      agent.status = 'stopping';
      this.emit('agent:status', agentId, 'stopping');

      if (graceful) {
        // Send graceful shutdown signal
        await agent.wrapper.shutdown();
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Terminate tmux session
      await this.tmuxManager.killSession(agent.sessionId);

      agent.status = 'stopped';
      
      // Unregister from health monitor
      this.healthMonitor.unregister(agentId);
      
      // Unsubscribe from message bus
      this.messageBus.unsubscribe(agentId);

      this.emit('agent:stopped', agentId);
      this.emit('agent:status', agentId, 'stopped');
    } catch (error) {
      agent.status = 'error';
      this.emit('agent:error', agentId, error);
      throw error;
    }
  }

  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Stop agent if running
    if (agent.status !== 'stopped') {
      await this.stopAgent(agentId, false);
    }

    this.agents.delete(agentId);
    this.emit('agent:removed', agentId);
  }

  async pauseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running`);
    }

    await agent.wrapper.pause();
    agent.status = 'paused';
    this.emit('agent:status', agentId, 'paused');
  }

  async resumeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'paused') {
      throw new Error(`Agent ${agentId} is not paused`);
    }

    await agent.wrapper.resume();
    agent.status = 'running';
    this.emit('agent:status', agentId, 'running');
  }

  async createCheckpoint(agentId: string, description: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const checkpointId = `checkpoint-${Date.now()}`;
    const state = await agent.wrapper.captureState();
    
    agent.checkpoints.push({
      id: checkpointId,
      timestamp: new Date(),
      state,
      description
    });

    // Keep only last 10 checkpoints
    if (agent.checkpoints.length > 10) {
      agent.checkpoints = agent.checkpoints.slice(-10);
    }

    this.emit('agent:checkpoint', agentId, checkpointId);
    return checkpointId;
  }

  async rollback(agentId: string, checkpointId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const checkpoint = agent.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found for agent ${agentId}`);
    }

    await agent.wrapper.restoreState(checkpoint.state);
    this.emit('agent:rollback', agentId, checkpointId);
  }

  async sendMessage(agentId: string, message: any): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await this.messageBus.send(agentId, message);
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  getAgentsByProject(projectId: string): AgentInstance[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.config.projectId === projectId);
  }

  getAgentStatus(agentId: string): AgentInstance['status'] | null {
    const agent = this.agents.get(agentId);
    return agent ? agent.status : null;
  }

  private async waitForAgentReady(agentId: string, timeout: number): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const isReady = await agent.wrapper.isReady();
        if (isReady) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Agent ${agentId} failed to become ready within ${timeout}ms`);
  }

  private async handleUnhealthyAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    agent.health.errorCount++;
    
    // Try to recover the agent
    try {
      if (agent.health.errorCount <= 3) {
        this.emit('agent:recovering', agentId);
        await this.restartAgent(agentId);
      } else {
        this.emit('agent:failed', agentId);
        await this.stopAgent(agentId, false);
      }
    } catch (error) {
      this.emit('agent:error', agentId, error);
    }
  }

  private async restartAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId, false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.startAgent(agentId);
  }

  private handleAgentMessage(message: any): void {
    this.emit('agent:message', message);
  }

  private handleSessionTermination(sessionId: string): void {
    const agent = Array.from(this.agents.values())
      .find(a => a.sessionId === sessionId);
    
    if (agent) {
      agent.status = 'stopped';
      this.emit('agent:status', agent.id, 'stopped');
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down agent orchestrator...');

    // Stop all agents gracefully
    const stopPromises = Array.from(this.agents.keys())
      .map(agentId => this.stopAgent(agentId, true).catch(console.error));

    await Promise.all(stopPromises);

    // Cleanup resources
    await this.tmuxManager.cleanup();
    await this.healthMonitor.cleanup();
    await this.messageBus.cleanup();

    this.emit('orchestrator:shutdown');
  }
}