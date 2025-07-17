#!/usr/bin/env node

/**
 * AgentFlow Example Usage Script
 * 
 * This script demonstrates how to use the AgentFlow orchestration system
 * to create, manage, and monitor agents.
 */

const { AgentOrchestrator } = require('../lib/agents/orchestrator');

async function demonstrateAgentFlow() {
  console.log('🚀 AgentFlow Orchestration System Demo');
  console.log('=====================================\n');

  // Initialize the orchestrator
  const orchestrator = new AgentOrchestrator();
  
  try {
    // 1. Create different types of agents
    console.log('📋 Step 1: Creating agents...');
    
    const codeAgentConfig = {
      id: 'claude-agent-1',
      type: 'claude-code',
      projectId: 'demo-project',
      capabilities: ['code-generation', 'code-analysis', 'documentation'],
      maxConcurrentTasks: 3,
      resourceLimits: {
        memory: '2GB',
        cpu: '2',
        timeout: 600000 // 10 minutes
      },
      environment: {
        NODE_ENV: 'development',
        PROJECT_ROOT: process.cwd(),
        CLAUDE_MODEL: 'claude-3-sonnet'
      }
    };

    const workerAgentConfig = {
      id: 'worker-agent-1',
      type: 'worker',
      projectId: 'demo-project',
      capabilities: ['task-processing', 'file-operations'],
      maxConcurrentTasks: 5,
      resourceLimits: {
        memory: '1GB',
        cpu: '1',
        timeout: 300000 // 5 minutes
      },
      environment: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'general'
      }
    };

    const monitorAgentConfig = {
      id: 'monitor-agent-1',
      type: 'monitor',
      projectId: 'demo-project',
      capabilities: ['system-monitoring', 'health-checks'],
      maxConcurrentTasks: 1,
      resourceLimits: {
        memory: '512MB',
        cpu: '0.5',
        timeout: 60000 // 1 minute
      },
      environment: {
        NODE_ENV: 'development',
        MONITOR_INTERVAL: '30000'
      }
    };

    await orchestrator.createAgent(codeAgentConfig);
    await orchestrator.createAgent(workerAgentConfig);
    await orchestrator.createAgent(monitorAgentConfig);

    console.log('✅ Created 3 agents successfully\n');

    // 2. Start the agents
    console.log('🔄 Step 2: Starting agents...');
    
    await orchestrator.startAgent('claude-agent-1');
    console.log('  ✅ Claude Code agent started');
    
    await orchestrator.startAgent('worker-agent-1');
    console.log('  ✅ Worker agent started');
    
    await orchestrator.startAgent('monitor-agent-1');
    console.log('  ✅ Monitor agent started\n');

    // 3. Monitor agent status
    console.log('📊 Step 3: Monitoring agent status...');
    
    const agents = orchestrator.getAllAgents();
    
    for (const agent of agents) {
      console.log(`  Agent: ${agent.id}`);
      console.log(`    Type: ${agent.config.type}`);
      console.log(`    Status: ${agent.status}`);
      console.log(`    Health: Last heartbeat ${agent.health.lastHeartbeat}`);
      console.log(`    Metrics: ${agent.metrics.tasksCompleted} tasks completed`);
      console.log('');
    }

    // 4. Send messages to agents
    console.log('💬 Step 4: Sending messages to agents...');
    
    await orchestrator.sendMessage('claude-agent-1', {
      type: 'task',
      action: 'analyze_code',
      files: ['lib/agents/orchestrator.ts'],
      priority: 'high'
    });
    console.log('  ✅ Sent code analysis task to Claude agent');

    await orchestrator.sendMessage('worker-agent-1', {
      type: 'task', 
      action: 'process_files',
      directory: './logs',
      priority: 'normal'
    });
    console.log('  ✅ Sent file processing task to Worker agent');

    await orchestrator.sendMessage('monitor-agent-1', {
      type: 'command',
      action: 'health_check',
      targets: ['claude-agent-1', 'worker-agent-1']
    });
    console.log('  ✅ Sent health check command to Monitor agent\n');

    // 5. Create checkpoints
    console.log('💾 Step 5: Creating checkpoints...');
    
    const checkpoint1 = await orchestrator.createCheckpoint('claude-agent-1', 'After code analysis task');
    console.log(`  ✅ Created checkpoint for Claude agent: ${checkpoint1}`);

    const checkpoint2 = await orchestrator.createCheckpoint('worker-agent-1', 'After file processing');
    console.log(`  ✅ Created checkpoint for Worker agent: ${checkpoint2}\n`);

    // 6. Demonstrate pause/resume
    console.log('⏸️  Step 6: Testing pause/resume functionality...');
    
    await orchestrator.pauseAgent('worker-agent-1');
    console.log('  ⏸️  Worker agent paused');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await orchestrator.resumeAgent('worker-agent-1');
    console.log('  ▶️  Worker agent resumed\n');

    // 7. Get system metrics
    console.log('📈 Step 7: System metrics...');
    
    const projectAgents = orchestrator.getAgentsByProject('demo-project');
    console.log(`  Project agents: ${projectAgents.length}`);
    
    const runningCount = agents.filter(a => a.status === 'running').length;
    console.log(`  Running agents: ${runningCount}/${agents.length}`);
    
    const totalTasks = agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0);
    console.log(`  Total tasks completed: ${totalTasks}`);
    
    const totalCost = agents.reduce((sum, a) => sum + a.metrics.costIncurred, 0);
    console.log(`  Total cost incurred: $${totalCost.toFixed(2)}\n`);

    // 8. Test error recovery
    console.log('🔧 Step 8: Testing error recovery...');
    
    // Simulate an error condition
    const claudeAgent = orchestrator.getAgent('claude-agent-1');
    if (claudeAgent) {
      claudeAgent.health.errorCount = 3;
      console.log('  ⚠️  Simulated error condition for Claude agent');
      
      // The health monitor would normally handle this automatically
      console.log('  🔄 Health monitor would attempt recovery...');
    }

    // 9. Demonstrate rollback
    console.log('⏪ Step 9: Testing rollback functionality...');
    
    try {
      await orchestrator.rollback('claude-agent-1', checkpoint1);
      console.log(`  ✅ Rolled back Claude agent to checkpoint ${checkpoint1}`);
    } catch (error) {
      console.log(`  ⚠️  Rollback simulation: ${error.message}`);
    }

    // 10. Clean shutdown
    console.log('\n🛑 Step 10: Clean shutdown...');
    
    console.log('  Stopping all agents gracefully...');
    for (const agent of agents) {
      if (agent.status === 'running' || agent.status === 'paused') {
        await orchestrator.stopAgent(agent.id, true);
        console.log(`    ✅ Stopped ${agent.id}`);
      }
    }

    console.log('  Removing agents...');
    for (const agent of agents) {
      await orchestrator.removeAgent(agent.id);
      console.log(`    ✅ Removed ${agent.id}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the web monitor: node scripts/monitor-agents.js');
    console.log('2. Set up tmux environment: bash scripts/setup-tmux.sh');
    console.log('3. Use the API endpoints to manage agents programmatically');
    console.log('4. Integrate with your CI/CD pipeline');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    try {
      await orchestrator.shutdown();
    } catch (shutdownError) {
      console.error('Failed to shutdown orchestrator:', shutdownError.message);
    }
  }
}

// Event handlers for demonstration
function setupEventHandlers(orchestrator) {
  orchestrator.on('agent:created', (agentId) => {
    console.log(`🎯 Event: Agent ${agentId} created`);
  });

  orchestrator.on('agent:started', (agentId) => {
    console.log(`🚀 Event: Agent ${agentId} started`);
  });

  orchestrator.on('agent:stopped', (agentId) => {
    console.log(`🛑 Event: Agent ${agentId} stopped`);
  });

  orchestrator.on('agent:error', (agentId, error) => {
    console.log(`❌ Event: Agent ${agentId} error - ${error.message}`);
  });

  orchestrator.on('agent:status', (agentId, status) => {
    console.log(`📊 Event: Agent ${agentId} status changed to ${status}`);
  });

  orchestrator.on('agent:message', (message) => {
    console.log(`💬 Event: Message from ${message.from} to ${message.to}`);
  });

  orchestrator.on('agent:checkpoint', (agentId, checkpointId) => {
    console.log(`💾 Event: Checkpoint ${checkpointId} created for agent ${agentId}`);
  });

  orchestrator.on('agent:rollback', (agentId, checkpointId) => {
    console.log(`⏪ Event: Agent ${agentId} rolled back to checkpoint ${checkpointId}`);
  });
}

// Helper function to display agent architecture
function displayArchitecture() {
  console.log('\n📐 AgentFlow Architecture Overview');
  console.log('==================================\n');
  
  console.log('Core Components:');
  console.log('├── AgentOrchestrator    - Main coordination system');
  console.log('├── TmuxManager          - Session management');
  console.log('├── HealthMonitor        - Agent health monitoring');
  console.log('├── MessageBus           - Inter-agent communication');
  console.log('└── AgentWrapper         - Individual agent execution\n');
  
  console.log('Agent Types:');
  console.log('├── claude-code          - AI-powered coding assistant');
  console.log('├── worker               - Task processing agent');
  console.log('└── monitor              - System monitoring agent\n');
  
  console.log('Features:');
  console.log('├── Lifecycle Management - Create, start, stop, remove agents');
  console.log('├── Health Monitoring    - Automated health checks and recovery');
  console.log('├── Message Passing      - Reliable inter-agent communication');
  console.log('├── Checkpoint/Rollback  - State management and recovery');
  console.log('├── Resource Management  - CPU, memory, and cost tracking');
  console.log('├── Rate Limiting        - Prevent API abuse and cost overruns');
  console.log('└── Web Dashboard        - Real-time monitoring interface\n');
  
  console.log('API Endpoints:');
  console.log('├── POST   /api/agents/create           - Create new agent');
  console.log('├── GET    /api/agents                  - List all agents');
  console.log('├── GET    /api/agents/[id]             - Get agent details');
  console.log('├── PATCH  /api/agents/[id]             - Agent lifecycle ops');
  console.log('├── GET    /api/agents/[id]/status      - Get agent status');
  console.log('├── POST   /api/agents/[id]/messages    - Send message to agent');
  console.log('└── GET    /api/orchestrator            - System status\n');
}

// Main execution
if (require.main === module) {
  displayArchitecture();
  
  // Check if this is just a help request
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('AgentFlow Demo Usage:');
    console.log('  node scripts/example-usage.js           - Run full demo');
    console.log('  node scripts/example-usage.js --help    - Show this help');
    console.log('  node scripts/example-usage.js --arch    - Show architecture only');
    process.exit(0);
  }
  
  if (process.argv.includes('--arch')) {
    process.exit(0);
  }
  
  demonstrateAgentFlow().catch(error => {
    console.error('Demo execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  demonstrateAgentFlow,
  setupEventHandlers,
  displayArchitecture
};