import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TmuxSessionConfig {
  name: string;
  workingDirectory: string;
  environment: Record<string, string>;
  windowName?: string;
  shell?: string;
}

export interface TmuxSession {
  id: string;
  name: string;
  pid: number;
  windows: number;
  created: Date;
  lastActivity: Date;
  status: 'active' | 'dead';
}

export class TmuxManager extends EventEmitter {
  private sessions: Map<string, TmuxSession> = new Map();
  private monitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startMonitoring();
  }

  async createSession(config: TmuxSessionConfig): Promise<string> {
    try {
      // Check if tmux is available
      await this.ensureTmuxAvailable();

      // Generate unique session ID
      const sessionId = `${config.name}-${Date.now()}`;

      // Prepare environment variables
      const envVars = Object.entries(config.environment)
        .map(([key, value]) => `-e ${key}="${value}"`)
        .join(' ');

      // Create tmux session
      const command = [
        'tmux',
        'new-session',
        '-d',
        '-s', sessionId,
        '-c', config.workingDirectory,
        ...(config.shell ? [config.shell] : [])
      ].join(' ');

      await execAsync(command);

      // Set environment variables if any
      if (Object.keys(config.environment).length > 0) {
        for (const [key, value] of Object.entries(config.environment)) {
          await execAsync(`tmux setenv -t ${sessionId} ${key} "${value}"`);
        }
      }

      // Rename window if specified
      if (config.windowName) {
        await execAsync(`tmux rename-window -t ${sessionId} "${config.windowName}"`);
      }

      // Get session info
      const sessionInfo = await this.getSessionInfo(sessionId);
      if (sessionInfo) {
        this.sessions.set(sessionId, sessionInfo);
        this.emit('session:created', sessionId);
        return sessionId;
      }

      throw new Error('Failed to retrieve session information after creation');
    } catch (error) {
      throw new Error(`Failed to create tmux session: ${error.message}`);
    }
  }

  async executeInSession(sessionId: string, command: string): Promise<string> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Execute command in tmux session
      const tmuxCommand = `tmux send-keys -t ${sessionId} "${command.replace(/"/g, '\\"')}" Enter`;
      await execAsync(tmuxCommand);

      // Update last activity
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      this.emit('session:command', sessionId, command);
      return 'Command executed successfully';
    } catch (error) {
      throw new Error(`Failed to execute command in session ${sessionId}: ${error.message}`);
    }
  }

  async capturePane(sessionId: string, windowIndex = 0): Promise<string> {
    try {
      const { stdout } = await execAsync(`tmux capture-pane -t ${sessionId}:${windowIndex} -p`);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to capture pane for session ${sessionId}: ${error.message}`);
    }
  }

  async sendKeys(sessionId: string, keys: string): Promise<void> {
    try {
      await execAsync(`tmux send-keys -t ${sessionId} "${keys.replace(/"/g, '\\"')}"`);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);
      }
    } catch (error) {
      throw new Error(`Failed to send keys to session ${sessionId}: ${error.message}`);
    }
  }

  async createWindow(sessionId: string, windowName?: string): Promise<number> {
    try {
      const command = windowName 
        ? `tmux new-window -t ${sessionId} -n "${windowName}"`
        : `tmux new-window -t ${sessionId}`;
      
      await execAsync(command);

      // Get window list to find the new window index
      const { stdout } = await execAsync(`tmux list-windows -t ${sessionId} -F "#{window_index}"`);
      const windowIndexes = stdout.trim().split('\n').map(Number);
      const newWindowIndex = Math.max(...windowIndexes);

      this.emit('session:window_created', sessionId, newWindowIndex);
      return newWindowIndex;
    } catch (error) {
      throw new Error(`Failed to create window in session ${sessionId}: ${error.message}`);
    }
  }

  async killWindow(sessionId: string, windowIndex: number): Promise<void> {
    try {
      await execAsync(`tmux kill-window -t ${sessionId}:${windowIndex}`);
      this.emit('session:window_killed', sessionId, windowIndex);
    } catch (error) {
      throw new Error(`Failed to kill window ${windowIndex} in session ${sessionId}: ${error.message}`);
    }
  }

  async resizePane(sessionId: string, windowIndex = 0, paneIndex = 0, direction: 'up' | 'down' | 'left' | 'right', cells: number): Promise<void> {
    try {
      await execAsync(`tmux resize-pane -t ${sessionId}:${windowIndex}.${paneIndex} -${direction.charAt(0).toUpperCase()} ${cells}`);
    } catch (error) {
      throw new Error(`Failed to resize pane in session ${sessionId}: ${error.message}`);
    }
  }

  async splitPane(sessionId: string, windowIndex = 0, vertical = false): Promise<number> {
    try {
      const flag = vertical ? '-v' : '-h';
      await execAsync(`tmux split-window -t ${sessionId}:${windowIndex} ${flag}`);

      // Get pane list to find the new pane index
      const { stdout } = await execAsync(`tmux list-panes -t ${sessionId}:${windowIndex} -F "#{pane_index}"`);
      const paneIndexes = stdout.trim().split('\n').map(Number);
      const newPaneIndex = Math.max(...paneIndexes);

      this.emit('session:pane_split', sessionId, windowIndex, newPaneIndex);
      return newPaneIndex;
    } catch (error) {
      throw new Error(`Failed to split pane in session ${sessionId}: ${error.message}`);
    }
  }

  async killSession(sessionId: string): Promise<void> {
    try {
      await execAsync(`tmux kill-session -t ${sessionId}`);
      this.sessions.delete(sessionId);
      this.emit('session:killed', sessionId);
    } catch (error) {
      // Session might already be dead
      this.sessions.delete(sessionId);
      this.emit('session:terminated', sessionId);
    }
  }

  async hasSession(sessionId: string): Promise<boolean> {
    try {
      await execAsync(`tmux has-session -t ${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(): Promise<TmuxSession[]> {
    try {
      const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}:#{session_id}:#{session_created}:#{session_last_attached}:#{session_windows}"');
      
      const sessions: TmuxSession[] = [];
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      
      for (const line of lines) {
        const [name, id, created, lastAttached, windows] = line.split(':');
        sessions.push({
          id,
          name,
          pid: 0, // We'll get this separately if needed
          windows: parseInt(windows, 10),
          created: new Date(parseInt(created, 10) * 1000),
          lastActivity: new Date(parseInt(lastAttached, 10) * 1000),
          status: 'active'
        });
      }

      return sessions;
    } catch (error) {
      return [];
    }
  }

  async getSessionInfo(sessionId: string): Promise<TmuxSession | null> {
    try {
      const { stdout } = await execAsync(`tmux display-message -t ${sessionId} -p "#{session_name}:#{session_id}:#{session_created}:#{session_last_attached}:#{session_windows}"`);
      
      const [name, id, created, lastAttached, windows] = stdout.trim().split(':');
      
      return {
        id,
        name,
        pid: 0,
        windows: parseInt(windows, 10),
        created: new Date(parseInt(created, 10) * 1000),
        lastActivity: new Date(parseInt(lastAttached, 10) * 1000),
        status: 'active'
      };
    } catch (error) {
      return null;
    }
  }

  async attachToSession(sessionId: string): Promise<void> {
    try {
      // This would typically be used in an interactive context
      await execAsync(`tmux attach-session -t ${sessionId}`);
    } catch (error) {
      throw new Error(`Failed to attach to session ${sessionId}: ${error.message}`);
    }
  }

  async detachFromSession(sessionId: string): Promise<void> {
    try {
      await execAsync(`tmux detach-client -s ${sessionId}`);
    } catch (error) {
      throw new Error(`Failed to detach from session ${sessionId}: ${error.message}`);
    }
  }

  getSession(sessionId: string): TmuxSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): TmuxSession[] {
    return Array.from(this.sessions.values());
  }

  private async ensureTmuxAvailable(): Promise<void> {
    try {
      await execAsync('which tmux');
    } catch (error) {
      throw new Error('tmux is not available. Please install tmux to use the agent orchestration system.');
    }
  }

  private startMonitoring(): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.monitorInterval = setInterval(async () => {
      await this.checkSessionStatus();
    }, 10000); // Check every 10 seconds
  }

  private async checkSessionStatus(): Promise<void> {
    try {
      const activeSessions = await this.listSessions();
      const activeSessionIds = new Set(activeSessions.map(s => s.id));

      // Update existing sessions
      for (const session of activeSessions) {
        this.sessions.set(session.id, session);
      }

      // Remove dead sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (!activeSessionIds.has(sessionId)) {
          session.status = 'dead';
          this.sessions.delete(sessionId);
          this.emit('session:terminated', sessionId);
        }
      }
    } catch (error) {
      this.emit('monitor:error', error);
    }
  }

  async cleanup(): Promise<void> {
    this.monitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // Kill all managed sessions
    const killPromises = Array.from(this.sessions.keys())
      .map(sessionId => this.killSession(sessionId).catch(() => {}));

    await Promise.all(killPromises);
    this.sessions.clear();
  }

  // Utility methods for script generation
  generateStartScript(sessionId: string, command: string): string {
    return `#!/bin/bash
set -e

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed"
    exit 1
fi

# Check if session exists
if tmux has-session -t "${sessionId}" 2>/dev/null; then
    echo "Session ${sessionId} already exists"
    exit 1
fi

# Execute command in session
tmux send-keys -t "${sessionId}" "${command}" Enter

echo "Command executed in session ${sessionId}"
`;
  }

  generateMonitorScript(sessionId: string): string {
    return `#!/bin/bash

SESSION_ID="${sessionId}"
MONITOR_INTERVAL=5

monitor_session() {
    while true; do
        if tmux has-session -t "$SESSION_ID" 2>/dev/null; then
            echo "$(date): Session $SESSION_ID is active"
            
            # Capture session info
            tmux display-message -t "$SESSION_ID" -p "Windows: #{session_windows}, Last activity: #{session_last_attached}"
            
            # Check if session is responsive
            tmux send-keys -t "$SESSION_ID" "" 2>/dev/null || {
                echo "$(date): Session $SESSION_ID is unresponsive"
                exit 1
            }
        else
            echo "$(date): Session $SESSION_ID not found"
            exit 1
        fi
        
        sleep $MONITOR_INTERVAL
    done
}

monitor_session
`;
  }
}