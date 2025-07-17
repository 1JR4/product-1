import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig } from './orchestrator';

export interface AgentState {
  workingDirectory: string;
  environment: Record<string, string>;
  currentTask?: {
    id: string;
    description: string;
    startTime: Date;
    progress: number;
  };
  context: {
    projectFiles: string[];
    recentCommands: string[];
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>;
  };
  metrics: {
    commandsExecuted: number;
    filesModified: number;
    tokensUsed: number;
    apiCalls: number;
  };
}

export interface TaskRequest {
  id: string;
  type: 'code' | 'analysis' | 'documentation' | 'test' | 'deployment';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context: {
    files?: string[];
    dependencies?: string[];
    constraints?: string[];
  };
  expectedOutput: string;
  timeout: number;
}

export interface TaskResult {
  id: string;
  status: 'completed' | 'failed' | 'timeout' | 'cancelled';
  output: any;
  error?: string;
  duration: number;
  resourceUsage: {
    cpuTime: number;
    memoryPeak: number;
    apiCalls: number;
    tokensUsed: number;
  };
  artifacts: Array<{
    type: 'file' | 'log' | 'report';
    path: string;
    description: string;
  }>;
}

export class AgentWrapper extends EventEmitter {
  private config: AgentConfig;
  private process: ChildProcess | null = null;
  private state: AgentState;
  private currentTask: TaskRequest | null = null;
  private isPaused = false;
  private startTime: Date | null = null;
  private stateFile: string;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.stateFile = path.join(process.cwd(), `.agent-state-${config.id}.json`);
    
    this.state = {
      workingDirectory: process.cwd(),
      environment: config.environment,
      context: {
        projectFiles: [],
        recentCommands: [],
        conversationHistory: []
      },
      metrics: {
        commandsExecuted: 0,
        filesModified: 0,
        tokensUsed: 0,
        apiCalls: 0
      }
    };
  }

  async getStartCommand(): Promise<string> {
    const scriptPath = path.join(process.cwd(), 'scripts', 'agent-wrapper.sh');
    
    // Ensure the wrapper script exists
    await this.ensureWrapperScript(scriptPath);
    
    return `bash "${scriptPath}" ${this.config.id} ${this.config.type}`;
  }

  async isReady(): Promise<boolean> {
    try {
      // Check if agent process is running
      if (!this.process || this.process.killed) {
        return false;
      }

      // Check if agent is responsive by sending a ping
      const pingResult = await this.sendCommand('ping', { timeout: 5000 });
      return pingResult.status === 'success';
    } catch {
      return false;
    }
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    if (this.currentTask) {
      throw new Error('Agent is already executing a task');
    }

    if (this.isPaused) {
      throw new Error('Agent is paused');
    }

    this.currentTask = task;
    const startTime = Date.now();

    try {
      this.state.currentTask = {
        id: task.id,
        description: task.description,
        startTime: new Date(),
        progress: 0
      };

      await this.saveState();
      this.emit('task:started', task.id);

      // Execute the task based on type
      const result = await this.executeTaskByType(task);

      const duration = Date.now() - startTime;
      
      const taskResult: TaskResult = {
        id: task.id,
        status: 'completed',
        output: result,
        duration,
        resourceUsage: {
          cpuTime: 0, // Would be measured in real implementation
          memoryPeak: 0,
          apiCalls: this.state.metrics.apiCalls,
          tokensUsed: this.state.metrics.tokensUsed
        },
        artifacts: await this.collectArtifacts(task)
      };

      this.state.metrics.commandsExecuted++;
      this.currentTask = null;
      this.state.currentTask = undefined;
      
      await this.saveState();
      this.emit('task:completed', task.id, taskResult);
      
      return taskResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const taskResult: TaskResult = {
        id: task.id,
        status: 'failed',
        output: null,
        error: error.message,
        duration,
        resourceUsage: {
          cpuTime: 0,
          memoryPeak: 0,
          apiCalls: this.state.metrics.apiCalls,
          tokensUsed: this.state.metrics.tokensUsed
        },
        artifacts: []
      };

      this.currentTask = null;
      this.state.currentTask = undefined;
      
      await this.saveState();
      this.emit('task:failed', task.id, error);
      
      return taskResult;
    }
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    
    if (this.process) {
      this.process.kill('SIGSTOP');
    }
    
    await this.saveState();
    this.emit('agent:paused');
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    
    if (this.process) {
      this.process.kill('SIGCONT');
    }
    
    await this.saveState();
    this.emit('agent:resumed');
  }

  async shutdown(): Promise<void> {
    if (this.currentTask) {
      this.emit('task:cancelled', this.currentTask.id);
      this.currentTask = null;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          resolve(void 0);
        }, 5000);

        this.process!.on('exit', () => {
          clearTimeout(timeout);
          resolve(void 0);
        });
      });
    }

    await this.saveState();
    this.emit('agent:shutdown');
  }

  async captureState(): Promise<AgentState> {
    await this.saveState();
    return { ...this.state };
  }

  async restoreState(state: AgentState): Promise<void> {
    this.state = { ...state };
    await this.saveState();
    this.emit('agent:state_restored');
  }

  getHealth(): any {
    return {
      isRunning: this.process && !this.process.killed,
      isPaused: this.isPaused,
      currentTask: this.currentTask,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      memoryUsage: process.memoryUsage(),
      state: this.state
    };
  }

  getMetrics(): AgentState['metrics'] {
    return { ...this.state.metrics };
  }

  private async executeTaskByType(task: TaskRequest): Promise<any> {
    switch (task.type) {
      case 'code':
        return this.executeCodeTask(task);
      case 'analysis':
        return this.executeAnalysisTask(task);
      case 'documentation':
        return this.executeDocumentationTask(task);
      case 'test':
        return this.executeTestTask(task);
      case 'deployment':
        return this.executeDeploymentTask(task);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async executeCodeTask(task: TaskRequest): Promise<any> {
    // Implementation for code generation/modification tasks
    this.state.context.conversationHistory.push({
      role: 'user',
      content: task.description,
      timestamp: new Date()
    });

    // Simulate Claude Code execution
    const command = this.buildClaudeCommand(task);
    const result = await this.sendCommand('execute', {
      command,
      timeout: task.timeout
    });

    this.state.metrics.apiCalls++;
    this.state.metrics.tokensUsed += 1000; // Estimated

    return result;
  }

  private async executeAnalysisTask(task: TaskRequest): Promise<any> {
    // Implementation for code analysis tasks
    const files = task.context.files || [];
    const analysis = {
      filesAnalyzed: files.length,
      complexity: 'medium',
      suggestions: [],
      issues: []
    };

    this.state.metrics.apiCalls++;
    return analysis;
  }

  private async executeDocumentationTask(task: TaskRequest): Promise<any> {
    // Implementation for documentation generation
    const docs = {
      generatedFiles: [],
      coverage: '85%',
      format: 'markdown'
    };

    this.state.metrics.apiCalls++;
    this.state.metrics.filesModified++;
    return docs;
  }

  private async executeTestTask(task: TaskRequest): Promise<any> {
    // Implementation for test execution/generation
    const testResult = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      coverage: '0%'
    };

    this.state.metrics.apiCalls++;
    return testResult;
  }

  private async executeDeploymentTask(task: TaskRequest): Promise<any> {
    // Implementation for deployment tasks
    const deployment = {
      status: 'success',
      environment: 'staging',
      url: '',
      deploymentTime: Date.now()
    };

    this.state.metrics.apiCalls++;
    return deployment;
  }

  private buildClaudeCommand(task: TaskRequest): string {
    // Build appropriate command for Claude Code execution
    return `claude-code --task="${task.description}" --project-dir="${this.state.workingDirectory}"`;
  }

  private async sendCommand(command: string, options: any = {}): Promise<any> {
    // Mock implementation for sending commands to Claude Code
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, options.timeout || 30000);

      // Simulate command execution
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({
          status: 'success',
          output: `Executed: ${command}`,
          timestamp: new Date()
        });
      }, 1000);
    });
  }

  private async collectArtifacts(task: TaskRequest): Promise<TaskResult['artifacts']> {
    const artifacts: TaskResult['artifacts'] = [];

    // Check for generated files
    try {
      const logFile = path.join(process.cwd(), `logs/agent-${this.config.id}-${task.id}.log`);
      if (await this.fileExists(logFile)) {
        artifacts.push({
          type: 'log',
          path: logFile,
          description: 'Task execution log'
        });
      }
    } catch {
      // Ignore if log file doesn't exist
    }

    return artifacts;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.emit('error', new Error(`Failed to save state: ${error.message}`));
    }
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
    } catch {
      // State file doesn't exist or is invalid, use default state
    }
  }

  private async ensureWrapperScript(scriptPath: string): Promise<void> {
    try {
      await fs.access(scriptPath);
    } catch {
      // Script doesn't exist, we'll create it when we create the scripts
      throw new Error(`Agent wrapper script not found at ${scriptPath}`);
    }
  }

  // Rate limiting and cost tracking
  async checkRateLimit(): Promise<boolean> {
    // Implementation for rate limiting
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window
    
    // Count recent API calls
    const recentCalls = this.state.context.conversationHistory
      .filter(entry => entry.timestamp.getTime() > windowStart)
      .length;

    return recentCalls < 60; // Max 60 calls per minute
  }

  async trackCost(operation: string, cost: number): Promise<void> {
    // Implementation for cost tracking
    this.emit('cost:incurred', {
      agentId: this.config.id,
      operation,
      cost,
      timestamp: new Date()
    });
  }
}