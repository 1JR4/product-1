import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface HealthCheckConfig {
  interval: number; // ms between checks
  timeout: number; // ms before considering check failed
  maxFailures: number; // consecutive failures before marking unhealthy
  retryDelay: number; // ms to wait before retry after failure
}

export interface HealthMetrics {
  agentId: string;
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  errorCount: number;
  lastError?: string;
  uptime: number;
  checksSinceLastFailure: number;
}

export interface HealthAlert {
  agentId: string;
  type: 'warning' | 'critical' | 'recovery';
  message: string;
  timestamp: Date;
  metrics: HealthMetrics;
}

interface AgentHealthState {
  agentId: string;
  config: HealthCheckConfig;
  metrics: HealthMetrics;
  consecutiveFailures: number;
  lastCheckTime: Date;
  checkInterval: NodeJS.Timeout | null;
  isHealthy: boolean;
  recoveryAttempts: number;
}

export class HealthMonitor extends EventEmitter {
  private agents: Map<string, AgentHealthState> = new Map();
  private globalMetrics: {
    totalChecks: number;
    totalFailures: number;
    averageResponseTime: number;
    healthyAgents: number;
    unhealthyAgents: number;
  } = {
    totalChecks: 0,
    totalFailures: 0,
    averageResponseTime: 0,
    healthyAgents: 0,
    unhealthyAgents: 0
  };

  private alertThresholds = {
    responseTimeWarning: 5000, // 5 seconds
    responseTimeCritical: 10000, // 10 seconds
    memoryWarning: 80, // 80% of limit
    memoryCritical: 95, // 95% of limit
    errorRateWarning: 0.1, // 10% error rate
    errorRateCritical: 0.25 // 25% error rate
  };

  constructor() {
    super();
    this.startGlobalMonitoring();
  }

  register(agentId: string, config: Partial<HealthCheckConfig> = {}): void {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered for health monitoring`);
    }

    const defaultConfig: HealthCheckConfig = {
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      maxFailures: 3,
      retryDelay: 5000 // 5 seconds
    };

    const finalConfig = { ...defaultConfig, ...config };

    const agentState: AgentHealthState = {
      agentId,
      config: finalConfig,
      metrics: {
        agentId,
        timestamp: new Date(),
        status: 'unknown',
        responseTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        errorCount: 0,
        uptime: 0,
        checksSinceLastFailure: 0
      },
      consecutiveFailures: 0,
      lastCheckTime: new Date(),
      checkInterval: null,
      isHealthy: true,
      recoveryAttempts: 0
    };

    this.agents.set(agentId, agentState);
    this.startMonitoring(agentId);

    this.emit('agent:registered', agentId);
  }

  unregister(agentId: string): void {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    if (agentState.checkInterval) {
      clearInterval(agentState.checkInterval);
    }

    this.agents.delete(agentId);
    this.updateGlobalMetrics();

    this.emit('agent:unregistered', agentId);
  }

  async performHealthCheck(agentId: string): Promise<HealthMetrics> {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const startTime = performance.now();

    try {
      // Perform actual health check
      const healthData = await this.checkAgentHealth(agentId);
      const responseTime = performance.now() - startTime;

      agentState.metrics = {
        agentId,
        timestamp: new Date(),
        status: this.determineHealthStatus(healthData, responseTime),
        responseTime,
        cpuUsage: healthData.cpuUsage || 0,
        memoryUsage: healthData.memoryUsage || 0,
        errorCount: agentState.metrics.errorCount,
        uptime: healthData.uptime || 0,
        checksSinceLastFailure: agentState.consecutiveFailures === 0 
          ? agentState.metrics.checksSinceLastFailure + 1 
          : 0
      };

      agentState.consecutiveFailures = 0;
      agentState.lastCheckTime = new Date();
      agentState.recoveryAttempts = 0;

      if (!agentState.isHealthy) {
        agentState.isHealthy = true;
        this.emitAlert(agentId, 'recovery', 'Agent has recovered and is now healthy');
        this.emit('agent:recovered', agentId);
      }

      this.globalMetrics.totalChecks++;
      this.updateGlobalMetrics();

      this.emit('health:check', agentId, agentState.metrics);
      return agentState.metrics;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      agentState.consecutiveFailures++;
      agentState.metrics.errorCount++;
      agentState.metrics.lastError = error.message;
      agentState.metrics.responseTime = responseTime;
      agentState.metrics.timestamp = new Date();
      agentState.metrics.checksSinceLastFailure = 0;

      this.globalMetrics.totalChecks++;
      this.globalMetrics.totalFailures++;

      if (agentState.consecutiveFailures >= agentState.config.maxFailures) {
        if (agentState.isHealthy) {
          agentState.isHealthy = false;
          agentState.metrics.status = 'unhealthy';
          
          this.emitAlert(agentId, 'critical', `Agent is unhealthy after ${agentState.consecutiveFailures} consecutive failures`);
          this.emit('agent:unhealthy', agentId);
        }
      } else if (agentState.consecutiveFailures === 1 && agentState.isHealthy) {
        agentState.metrics.status = 'degraded';
        this.emitAlert(agentId, 'warning', 'Agent health check failed, monitoring for recovery');
      }

      this.updateGlobalMetrics();
      this.emit('health:check_failed', agentId, error);

      return agentState.metrics;
    }
  }

  private startMonitoring(agentId: string): void {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    // Perform initial health check
    this.performHealthCheck(agentId).catch(() => {
      // Initial check failure is logged but doesn't prevent monitoring
    });

    // Start periodic monitoring
    agentState.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck(agentId);
      } catch (error) {
        // Error is already handled in performHealthCheck
      }
    }, agentState.config.interval);
  }

  private async checkAgentHealth(agentId: string): Promise<any> {
    // This would integrate with the actual agent to get health data
    // For now, we'll simulate the health check
    return new Promise((resolve, reject) => {
      // Simulate network delay
      const delay = Math.random() * 2000 + 500; // 500-2500ms
      
      setTimeout(() => {
        // Simulate occasional failures
        if (Math.random() < 0.05) { // 5% failure rate
          reject(new Error('Health check timeout'));
          return;
        }

        resolve({
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          uptime: Date.now() - (Math.random() * 86400000), // Random uptime up to 24 hours
          isResponsive: true,
          lastActivity: new Date(),
          errorCount: Math.floor(Math.random() * 5)
        });
      }, delay);
    });
  }

  private determineHealthStatus(healthData: any, responseTime: number): HealthMetrics['status'] {
    if (responseTime > this.alertThresholds.responseTimeCritical) {
      return 'unhealthy';
    }
    
    if (healthData.memoryUsage > this.alertThresholds.memoryCritical) {
      return 'unhealthy';
    }

    if (responseTime > this.alertThresholds.responseTimeWarning || 
        healthData.memoryUsage > this.alertThresholds.memoryWarning) {
      return 'degraded';
    }

    return 'healthy';
  }

  private emitAlert(agentId: string, type: HealthAlert['type'], message: string): void {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    const alert: HealthAlert = {
      agentId,
      type,
      message,
      timestamp: new Date(),
      metrics: { ...agentState.metrics }
    };

    this.emit('alert', alert);
  }

  private updateGlobalMetrics(): void {
    const agents = Array.from(this.agents.values());
    
    this.globalMetrics.healthyAgents = agents.filter(a => a.isHealthy).length;
    this.globalMetrics.unhealthyAgents = agents.filter(a => !a.isHealthy).length;

    const responseTimes = agents
      .map(a => a.metrics.responseTime)
      .filter(rt => rt > 0);

    this.globalMetrics.averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;
  }

  private startGlobalMonitoring(): void {
    // Global monitoring interval - every minute
    setInterval(() => {
      this.updateGlobalMetrics();
      this.emit('metrics:updated', this.globalMetrics);

      // Check for system-wide issues
      const totalAgents = this.agents.size;
      const healthyPercentage = totalAgents > 0 
        ? (this.globalMetrics.healthyAgents / totalAgents) * 100 
        : 100;

      if (healthyPercentage < 50 && totalAgents > 1) {
        this.emit('system:degraded', {
          healthyPercentage,
          totalAgents,
          timestamp: new Date()
        });
      }
    }, 60000); // Every minute
  }

  // Public API methods

  getAgentHealth(agentId: string): HealthMetrics | null {
    const agentState = this.agents.get(agentId);
    return agentState ? { ...agentState.metrics } : null;
  }

  getAllAgentHealth(): Map<string, HealthMetrics> {
    const healthMap = new Map<string, HealthMetrics>();
    
    for (const [agentId, agentState] of this.agents.entries()) {
      healthMap.set(agentId, { ...agentState.metrics });
    }

    return healthMap;
  }

  getGlobalMetrics(): typeof this.globalMetrics {
    return { ...this.globalMetrics };
  }

  isAgentHealthy(agentId: string): boolean {
    const agentState = this.agents.get(agentId);
    return agentState ? agentState.isHealthy : false;
  }

  getUnhealthyAgents(): string[] {
    return Array.from(this.agents.entries())
      .filter(([_, state]) => !state.isHealthy)
      .map(([agentId]) => agentId);
  }

  async forceHealthCheck(agentId: string): Promise<HealthMetrics> {
    return this.performHealthCheck(agentId);
  }

  updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  getAlertThresholds(): typeof this.alertThresholds {
    return { ...this.alertThresholds };
  }

  // Recovery mechanisms
  async attemptRecovery(agentId: string): Promise<boolean> {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return false;
    }

    if (agentState.recoveryAttempts >= 3) {
      this.emit('recovery:failed', agentId, 'Maximum recovery attempts reached');
      return false;
    }

    agentState.recoveryAttempts++;
    
    try {
      this.emit('recovery:attempting', agentId, agentState.recoveryAttempts);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, agentState.config.retryDelay));
      
      // Attempt health check
      const metrics = await this.performHealthCheck(agentId);
      
      if (metrics.status === 'healthy') {
        agentState.recoveryAttempts = 0;
        this.emit('recovery:successful', agentId);
        return true;
      }
      
      return false;
    } catch (error) {
      this.emit('recovery:failed', agentId, error.message);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    // Stop all monitoring intervals
    for (const [agentId, agentState] of this.agents.entries()) {
      if (agentState.checkInterval) {
        clearInterval(agentState.checkInterval);
      }
    }

    this.agents.clear();
    this.emit('monitor:shutdown');
  }

  // Diagnostic methods
  generateHealthReport(): any {
    const agents = Array.from(this.agents.values());
    
    return {
      timestamp: new Date(),
      summary: {
        totalAgents: agents.length,
        healthyAgents: this.globalMetrics.healthyAgents,
        unhealthyAgents: this.globalMetrics.unhealthyAgents,
        averageResponseTime: this.globalMetrics.averageResponseTime,
        totalChecks: this.globalMetrics.totalChecks,
        totalFailures: this.globalMetrics.totalFailures,
        successRate: this.globalMetrics.totalChecks > 0 
          ? ((this.globalMetrics.totalChecks - this.globalMetrics.totalFailures) / this.globalMetrics.totalChecks) * 100 
          : 100
      },
      agents: agents.map(agent => ({
        id: agent.agentId,
        status: agent.metrics.status,
        lastCheck: agent.lastCheckTime,
        consecutiveFailures: agent.consecutiveFailures,
        responseTime: agent.metrics.responseTime,
        uptime: agent.metrics.uptime,
        errorCount: agent.metrics.errorCount
      })),
      alertThresholds: this.alertThresholds
    };
  }
}