#!/usr/bin/env node

/**
 * AgentFlow Agent Monitoring Script
 * 
 * This Node.js script monitors all running agents and provides:
 * - Real-time status monitoring
 * - Health checks and alerting
 * - Automatic recovery for failed agents
 * - Performance metrics collection
 * - Web dashboard for monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const WebSocket = require('ws');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  projectRoot: path.dirname(__dirname),
  stateDir: path.join(path.dirname(__dirname), '.agent-states'),
  logDir: path.join(path.dirname(__dirname), 'logs'),
  monitorInterval: 10000, // 10 seconds
  healthCheckTimeout: 5000, // 5 seconds
  recoveryAttempts: 3,
  webPort: 3001,
  wsPort: 3002
};

class AgentMonitor {
  constructor() {
    this.agents = new Map();
    this.metrics = {
      totalAgents: 0,
      runningAgents: 0,
      failedAgents: 0,
      averageUptime: 0,
      totalCommands: 0,
      systemLoad: 0,
      memoryUsage: 0
    };
    this.alerts = [];
    this.webServer = null;
    this.wsServer = null;
    this.monitorInterval = null;
    this.startTime = Date.now();
  }

  async start() {
    console.log('🚀 Starting AgentFlow Monitor...');
    
    try {
      await this.ensureDirectories();
      await this.loadExistingAgents();
      this.startMonitoring();
      await this.startWebInterface();
      await this.startWebSocketServer();
      
      console.log('✅ AgentFlow Monitor started successfully');
      console.log(`📊 Web Dashboard: http://localhost:${CONFIG.webPort}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${CONFIG.wsPort}`);
      
      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      console.error('❌ Failed to start monitor:', error.message);
      process.exit(1);
    }
  }

  async ensureDirectories() {
    await fs.mkdir(CONFIG.stateDir, { recursive: true });
    await fs.mkdir(CONFIG.logDir, { recursive: true });
  }

  async loadExistingAgents() {
    try {
      const files = await fs.readdir(CONFIG.stateDir);
      const stateFiles = files.filter(f => f.startsWith('agent-') && f.endsWith('.json'));
      
      for (const file of stateFiles) {
        try {
          const statePath = path.join(CONFIG.stateDir, file);
          const data = await fs.readFile(statePath, 'utf8');
          const agentState = JSON.parse(data);
          
          this.agents.set(agentState.id, {
            ...agentState,
            lastSeen: new Date(),
            healthStatus: 'unknown',
            recoveryAttempts: 0
          });
          
          console.log(`📋 Loaded agent ${agentState.id} (${agentState.type})`);
        } catch (error) {
          console.warn(`⚠️  Failed to load agent state from ${file}:`, error.message);
        }
      }
      
      console.log(`📊 Loaded ${this.agents.size} existing agents`);
    } catch (error) {
      console.warn('⚠️  Failed to load existing agents:', error.message);
    }
  }

  startMonitoring() {
    console.log('🔍 Starting agent monitoring...');
    
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkAllAgents();
        await this.updateSystemMetrics();
        this.broadcastMetrics();
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, CONFIG.monitorInterval);
  }

  async checkAllAgents() {
    const agentIds = Array.from(this.agents.keys());
    
    for (const agentId of agentIds) {
      await this.checkAgent(agentId);
    }
    
    // Discover new agents
    await this.discoverNewAgents();
  }

  async checkAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      // Read current state file
      const statePath = path.join(CONFIG.stateDir, `agent-${agentId}.json`);
      const data = await fs.readFile(statePath, 'utf8');
      const currentState = JSON.parse(data);
      
      // Update agent data
      const updatedAgent = {
        ...agent,
        ...currentState,
        lastSeen: new Date(),
        healthStatus: await this.performHealthCheck(agentId, currentState)
      };
      
      this.agents.set(agentId, updatedAgent);
      
      // Check for issues
      await this.checkAgentHealth(updatedAgent);
      
    } catch (error) {
      // Agent state file not found or corrupted
      agent.healthStatus = 'missing';
      agent.lastSeen = new Date();
      
      console.warn(`⚠️  Agent ${agentId} state file missing or corrupted`);
      this.addAlert('warning', `Agent ${agentId} state file is missing`, agentId);
    }
  }

  async performHealthCheck(agentId, state) {
    try {
      // Check if process is still running
      if (state.pid) {
        try {
          process.kill(state.pid, 0); // Check if process exists
        } catch {
          return 'dead';
        }
      }
      
      // Check tmux session if available
      if (state.sessionId) {
        try {
          await execAsync(`tmux has-session -t ${state.sessionId}`);
        } catch {
          return 'session_dead';
        }
      }
      
      // Check health endpoint if available
      const healthPort = this.getHealthPort(agentId);
      if (healthPort) {
        try {
          const healthData = await this.checkHealthEndpoint(healthPort);
          return healthData ? 'healthy' : 'unhealthy';
        } catch {
          return 'unreachable';
        }
      }
      
      // Check based on last update time
      const lastUpdate = new Date(state.lastUpdate || state.startedAt);
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      
      if (timeSinceUpdate > 60000) { // 1 minute
        return 'stale';
      }
      
      return state.status === 'running' ? 'healthy' : state.status;
      
    } catch (error) {
      console.error(`❌ Health check failed for ${agentId}:`, error.message);
      return 'error';
    }
  }

  async checkHealthEndpoint(port) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}`, { timeout: CONFIG.healthCheckTimeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const healthData = JSON.parse(data);
            resolve(healthData);
          } catch {
            resolve(null);
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  getHealthPort(agentId) {
    // Calculate port based on agent ID (same logic as in agent-wrapper.sh)
    const buffer = Buffer.from(agentId);
    const hash = buffer.readUInt32BE(0) % 1000;
    return 8000 + hash;
  }

  async checkAgentHealth(agent) {
    const { id, healthStatus, status, recoveryAttempts = 0 } = agent;
    
    // Alert on status changes
    if (agent.previousHealthStatus && agent.previousHealthStatus !== healthStatus) {
      const alertType = healthStatus === 'healthy' ? 'info' : 'warning';
      this.addAlert(alertType, `Agent ${id} status changed from ${agent.previousHealthStatus} to ${healthStatus}`, id);
    }
    
    agent.previousHealthStatus = healthStatus;
    
    // Handle unhealthy agents
    if (['dead', 'session_dead', 'stale', 'unreachable', 'error'].includes(healthStatus)) {
      if (recoveryAttempts < CONFIG.recoveryAttempts) {
        console.log(`🔄 Attempting recovery for agent ${id} (attempt ${recoveryAttempts + 1})`);
        await this.attemptRecovery(id);
        agent.recoveryAttempts = recoveryAttempts + 1;
      } else {
        console.error(`💀 Agent ${id} has failed permanently after ${CONFIG.recoveryAttempts} recovery attempts`);
        this.addAlert('critical', `Agent ${id} has failed permanently`, id);
        agent.healthStatus = 'failed';
      }
    } else if (healthStatus === 'healthy') {
      agent.recoveryAttempts = 0;
    }
  }

  async attemptRecovery(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      console.log(`🔧 Starting recovery for agent ${agentId}...`);
      
      // Try to gracefully stop the agent first
      await this.stopAgent(agentId, true);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Restart the agent
      await this.startAgent(agentId, agent.type);
      
      this.addAlert('info', `Recovery attempted for agent ${agentId}`, agentId);
      
    } catch (error) {
      console.error(`❌ Recovery failed for agent ${agentId}:`, error.message);
      this.addAlert('error', `Recovery failed for agent ${agentId}: ${error.message}`, agentId);
    }
  }

  async stopAgent(agentId, graceful = true) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (graceful) {
      // Create shutdown signal file
      const shutdownFile = path.join(CONFIG.stateDir, `shutdown-${agentId}`);
      await fs.writeFile(shutdownFile, '');
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Force kill if still running
    if (agent.pid) {
      try {
        process.kill(agent.pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(agent.pid, 'SIGKILL');
          } catch {}
        }, 5000);
      } catch {}
    }
    
    // Kill tmux session
    if (agent.sessionId) {
      try {
        await execAsync(`tmux kill-session -t ${agent.sessionId}`);
      } catch {}
    }
  }

  async startAgent(agentId, agentType) {
    const scriptPath = path.join(CONFIG.projectRoot, 'scripts', 'agent-wrapper.sh');
    const sessionName = `agent-${agentId}`;
    
    // Create tmux session and start agent
    const command = `tmux new-session -d -s ${sessionName} 'bash "${scriptPath}" ${agentId} ${agentType}'`;
    
    try {
      await execAsync(command);
      console.log(`✅ Started agent ${agentId} in tmux session ${sessionName}`);
    } catch (error) {
      throw new Error(`Failed to start agent ${agentId}: ${error.message}`);
    }
  }

  async discoverNewAgents() {
    try {
      const files = await fs.readdir(CONFIG.stateDir);
      const stateFiles = files.filter(f => f.startsWith('agent-') && f.endsWith('.json'));
      
      for (const file of stateFiles) {
        const agentId = file.replace('agent-', '').replace('.json', '');
        
        if (!this.agents.has(agentId)) {
          try {
            const statePath = path.join(CONFIG.stateDir, file);
            const data = await fs.readFile(statePath, 'utf8');
            const agentState = JSON.parse(data);
            
            this.agents.set(agentId, {
              ...agentState,
              lastSeen: new Date(),
              healthStatus: 'unknown',
              recoveryAttempts: 0
            });
            
            console.log(`🆕 Discovered new agent ${agentId} (${agentState.type})`);
            this.addAlert('info', `New agent discovered: ${agentId}`, agentId);
          } catch (error) {
            console.warn(`⚠️  Failed to load new agent ${agentId}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to discover new agents:', error.message);
    }
  }

  async updateSystemMetrics() {
    try {
      const agents = Array.from(this.agents.values());
      
      this.metrics.totalAgents = agents.length;
      this.metrics.runningAgents = agents.filter(a => a.healthStatus === 'healthy').length;
      this.metrics.failedAgents = agents.filter(a => ['failed', 'dead', 'error'].includes(a.healthStatus)).length;
      
      // Calculate average uptime
      const uptimes = agents
        .filter(a => a.metrics && a.metrics.uptime)
        .map(a => a.metrics.uptime);
      
      this.metrics.averageUptime = uptimes.length > 0
        ? uptimes.reduce((sum, uptime) => sum + uptime, 0) / uptimes.length
        : 0;
      
      // Calculate total commands
      this.metrics.totalCommands = agents
        .filter(a => a.metrics && a.metrics.commandsExecuted)
        .reduce((sum, a) => sum + a.metrics.commandsExecuted, 0);
      
      // Get system metrics
      try {
        // Get system load (Linux/macOS)
        const { stdout: loadAvg } = await execAsync('uptime');
        const loadMatch = loadAvg.match(/load average[s]?: ([0-9.]+)/);
        this.metrics.systemLoad = loadMatch ? parseFloat(loadMatch[1]) : 0;
      } catch {
        this.metrics.systemLoad = 0;
      }
      
      try {
        // Get memory usage
        const memInfo = process.memoryUsage();
        this.metrics.memoryUsage = Math.round((memInfo.heapUsed / memInfo.heapTotal) * 100);
      } catch {
        this.metrics.memoryUsage = 0;
      }
      
    } catch (error) {
      console.error('❌ Failed to update system metrics:', error.message);
    }
  }

  addAlert(type, message, agentId = null) {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      agentId,
      timestamp: new Date(),
      read: false
    };
    
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    console.log(`🚨 Alert [${type.toUpperCase()}]: ${message}`);
    
    // Broadcast alert via WebSocket
    this.broadcastAlert(alert);
  }

  async startWebInterface() {
    this.webServer = http.createServer((req, res) => {
      if (req.url === '/') {
        this.serveWebDashboard(res);
      } else if (req.url === '/api/agents') {
        this.serveAgentsAPI(res);
      } else if (req.url === '/api/metrics') {
        this.serveMetricsAPI(res);
      } else if (req.url === '/api/alerts') {
        this.serveAlertsAPI(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    return new Promise((resolve, reject) => {
      this.webServer.listen(CONFIG.webPort, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  serveWebDashboard(res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AgentFlow Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .agent-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .agent-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .agent-id { font-weight: bold; }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.unhealthy { background: #f8d7da; color: #721c24; }
        .status.unknown { background: #fff3cd; color: #856404; }
        .alerts { margin-top: 30px; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert.info { background: #d1ecf1; color: #0c5460; }
        .alert.warning { background: #fff3cd; color: #856404; }
        .alert.error { background: #f8d7da; color: #721c24; }
        .alert.critical { background: #f5c6cb; color: #721c24; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AgentFlow Monitor</h1>
        
        <div id="metrics" class="metrics"></div>
        <div id="agents" class="agents-grid"></div>
        <div id="alerts" class="alerts">
            <h3>Recent Alerts</h3>
            <div id="alerts-list"></div>
        </div>
    </div>
    
    <script>
        const ws = new WebSocket('ws://localhost:${CONFIG.wsPort}');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                updateMetrics(data.metrics);
                updateAgents(data.agents);
            } else if (data.type === 'alert') {
                addAlert(data.alert);
            }
        };
        
        function updateMetrics(metrics) {
            document.getElementById('metrics').innerHTML = \`
                <div class="metric-card">
                    <div class="metric-value">\${metrics.totalAgents}</div>
                    <div class="metric-label">Total Agents</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${metrics.runningAgents}</div>
                    <div class="metric-label">Running</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${metrics.failedAgents}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${Math.round(metrics.averageUptime / 1000)}s</div>
                    <div class="metric-label">Avg Uptime</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${metrics.totalCommands}</div>
                    <div class="metric-label">Commands</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${metrics.systemLoad.toFixed(2)}</div>
                    <div class="metric-label">System Load</div>
                </div>
            \`;
        }
        
        function updateAgents(agents) {
            document.getElementById('agents').innerHTML = agents.map(agent => \`
                <div class="agent-card">
                    <div class="agent-header">
                        <span class="agent-id">\${agent.id}</span>
                        <span class="status \${agent.healthStatus}">\${agent.healthStatus}</span>
                    </div>
                    <div>Type: \${agent.type}</div>
                    <div>Status: \${agent.status}</div>
                    <div>Last Seen: \${new Date(agent.lastSeen).toLocaleTimeString()}</div>
                    \${agent.metrics ? \`
                        <div>Commands: \${agent.metrics.commandsExecuted || 0}</div>
                        <div>Memory: \${agent.metrics.memoryUsage || 0} KB</div>
                        <div>CPU: \${agent.metrics.cpuUsage || 0}%</div>
                    \` : ''}
                </div>
            \`).join('');
        }
        
        function addAlert(alert) {
            const alertsDiv = document.getElementById('alerts-list');
            const alertEl = document.createElement('div');
            alertEl.className = \`alert \${alert.type}\`;
            alertEl.innerHTML = \`
                <strong>\${new Date(alert.timestamp).toLocaleString()}</strong>
                \${alert.message}
            \`;
            alertsDiv.insertBefore(alertEl, alertsDiv.firstChild);
            
            // Keep only last 20 alerts in DOM
            while (alertsDiv.children.length > 20) {
                alertsDiv.removeChild(alertsDiv.lastChild);
            }
        }
        
        // Initial load
        fetch('/api/metrics').then(r => r.json()).then(updateMetrics);
        fetch('/api/agents').then(r => r.json()).then(updateAgents);
        fetch('/api/alerts').then(r => r.json()).then(alerts => {
            alerts.forEach(addAlert);
        });
    </script>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  serveAgentsAPI(res) {
    const agents = Array.from(this.agents.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(agents));
  }

  serveMetricsAPI(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.metrics));
  }

  serveAlertsAPI(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.alerts.slice(0, 20)));
  }

  async startWebSocketServer() {
    this.wsServer = new WebSocket.Server({ port: CONFIG.wsPort });
    
    this.wsServer.on('connection', (ws) => {
      console.log('📡 New WebSocket connection');
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'metrics',
        metrics: this.metrics,
        agents: Array.from(this.agents.values())
      }));
    });
  }

  broadcastMetrics() {
    if (!this.wsServer) return;
    
    const message = JSON.stringify({
      type: 'metrics',
      metrics: this.metrics,
      agents: Array.from(this.agents.values())
    });
    
    this.wsServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastAlert(alert) {
    if (!this.wsServer) return;
    
    const message = JSON.stringify({
      type: 'alert',
      alert
    });
    
    this.wsServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async shutdown() {
    console.log('\n🛑 Shutting down AgentFlow Monitor...');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.webServer) {
      this.webServer.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    console.log('✅ Monitor shutdown complete');
    process.exit(0);
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new AgentMonitor();
  monitor.start().catch(error => {
    console.error('❌ Failed to start monitor:', error);
    process.exit(1);
  });
}

module.exports = AgentMonitor;