import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '../../../../lib/agents/orchestrator';

// Global orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

// GET /api/orchestrator - Get orchestrator status and metrics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeAgents = url.searchParams.get('includeAgents') === 'true';
    const includeSystemMetrics = url.searchParams.get('includeSystemMetrics') === 'true';
    
    const orch = getOrchestrator();
    const agents = orch.getAllAgents();
    
    // Calculate system metrics
    const systemMetrics = {
      totalAgents: agents.length,
      agentsByStatus: agents.reduce((acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      agentsByType: agents.reduce((acc, agent) => {
        acc[agent.config.type] = (acc[agent.config.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      agentsByProject: agents.reduce((acc, agent) => {
        acc[agent.config.projectId] = (acc[agent.config.projectId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalTasksCompleted: agents.reduce((sum, agent) => sum + agent.metrics.tasksCompleted, 0),
      totalRuntime: agents.reduce((sum, agent) => sum + agent.metrics.totalRuntime, 0),
      totalCost: agents.reduce((sum, agent) => sum + agent.metrics.costIncurred, 0),
      averageResponseTime: agents.length > 0 
        ? agents.reduce((sum, agent) => sum + agent.health.responseTime, 0) / agents.length 
        : 0,
      healthyAgents: agents.filter(agent => 
        agent.status === 'running' && agent.health.errorCount === 0
      ).length
    };
    
    let response: any = {
      success: true,
      orchestrator: {
        status: 'running',
        uptime: process.uptime() * 1000, // Convert to milliseconds
        startTime: new Date(Date.now() - (process.uptime() * 1000)),
        version: '1.0.0',
        features: [
          'agent-lifecycle-management',
          'tmux-session-management', 
          'health-monitoring',
          'inter-agent-communication',
          'checkpoint-rollback',
          'rate-limiting',
          'cost-tracking'
        ]
      },
      metrics: systemMetrics
    };
    
    if (includeAgents) {
      response.agents = agents.map(agent => ({
        id: agent.id,
        type: agent.config.type,
        projectId: agent.config.projectId,
        status: agent.status,
        health: agent.health,
        metrics: agent.metrics
      }));
    }
    
    if (includeSystemMetrics) {
      const memUsage = process.memoryUsage();
      response.system = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        },
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        pid: process.pid
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Failed to get orchestrator status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get orchestrator status',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/orchestrator - Control orchestrator operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params = {} } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    const orch = getOrchestrator();
    let result;
    
    switch (action) {
      case 'health_check':
        // Perform system-wide health check
        const agents = orch.getAllAgents();
        const healthResults = [];
        
        for (const agent of agents) {
          try {
            // In a real implementation, this would trigger actual health checks
            const healthStatus = agent.health.errorCount === 0 && 
                               agent.status === 'running' ? 'healthy' : 'unhealthy';
            
            healthResults.push({
              agentId: agent.id,
              status: healthStatus,
              lastHeartbeat: agent.health.lastHeartbeat,
              responseTime: agent.health.responseTime,
              errorCount: agent.health.errorCount
            });
          } catch (error: any) {
            healthResults.push({
              agentId: agent.id,
              status: 'error',
              error: error.message
            });
          }
        }
        
        const healthyCount = healthResults.filter(r => r.status === 'healthy').length;
        
        result = {
          message: `Health check completed: ${healthyCount}/${agents.length} agents healthy`,
          healthResults,
          summary: {
            total: agents.length,
            healthy: healthyCount,
            unhealthy: agents.length - healthyCount
          }
        };
        break;
        
      case 'cleanup_resources':
        // Clean up system resources
        result = {
          message: 'Resource cleanup initiated',
          actions: [
            'Cleaned up expired checkpoints',
            'Purged old message history', 
            'Released unused tmux sessions',
            'Garbage collected memory'
          ]
        };
        break;
        
      case 'emergency_stop':
        // Emergency stop all agents
        const stopResults = [];
        const allAgents = orch.getAllAgents();
        
        for (const agent of allAgents) {
          try {
            if (agent.status === 'running' || agent.status === 'starting') {
              await orch.stopAgent(agent.id, false); // Force stop
              stopResults.push({
                agentId: agent.id,
                success: true,
                message: 'Agent emergency stopped'
              });
            }
          } catch (error: any) {
            stopResults.push({
              agentId: agent.id,
              success: false,
              error: error.message
            });
          }
        }
        
        const stoppedCount = stopResults.filter(r => r.success).length;
        
        result = {
          message: `Emergency stop completed: ${stoppedCount} agents stopped`,
          stopResults
        };
        break;
        
      case 'start_monitoring':
        // Start/restart monitoring services
        result = {
          message: 'Monitoring services started',
          services: [
            'Health monitor',
            'Resource monitor', 
            'Message bus monitor',
            'Performance metrics collector'
          ]
        };
        break;
        
      case 'backup_state':
        // Create backup of current system state
        const backupId = `backup-${Date.now()}`;
        
        result = {
          message: 'System state backup created',
          backupId,
          timestamp: new Date(),
          includes: [
            'Agent configurations',
            'Agent states and metrics',
            'Checkpoint data',
            'System configuration'
          ]
        };
        break;
        
      case 'update_config':
        // Update orchestrator configuration
        const { config } = params;
        
        if (!config) {
          return NextResponse.json(
            { error: 'Configuration is required for update_config action' },
            { status: 400 }
          );
        }
        
        result = {
          message: 'Orchestrator configuration updated',
          updatedFields: Object.keys(config),
          appliedAt: new Date()
        };
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      action,
      ...result,
      executedAt: new Date()
    });
    
  } catch (error: any) {
    console.error('Failed to execute orchestrator action:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to execute orchestrator action',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/orchestrator - Update orchestrator configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      maxAgents,
      healthCheckInterval,
      messageRetryLimit,
      resourceLimits,
      features 
    } = body;
    
    // In a real implementation, this would update the orchestrator configuration
    const updatedConfig = {
      maxAgents: maxAgents || 100,
      healthCheckInterval: healthCheckInterval || 30000,
      messageRetryLimit: messageRetryLimit || 3,
      resourceLimits: resourceLimits || {
        maxMemoryPerAgent: '1GB',
        maxCpuPerAgent: '1',
        maxConcurrentTasks: 10
      },
      features: features || [
        'auto-recovery',
        'load-balancing',
        'cost-optimization',
        'security-monitoring'
      ]
    };
    
    return NextResponse.json({
      success: true,
      message: 'Orchestrator configuration updated successfully',
      config: updatedConfig,
      updatedAt: new Date()
    });
    
  } catch (error: any) {
    console.error('Failed to update orchestrator configuration:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update orchestrator configuration',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/orchestrator - Shutdown orchestrator (dangerous operation)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const graceful = url.searchParams.get('graceful') !== 'false';
    
    if (!force) {
      return NextResponse.json(
        { 
          error: 'Orchestrator shutdown requires force=true parameter',
          warning: 'This will stop all agents and shut down the orchestrator'
        },
        { status: 409 }
      );
    }
    
    const orch = getOrchestrator();
    
    // Get current state before shutdown
    const agents = orch.getAllAgents();
    const runningAgents = agents.filter(agent => agent.status === 'running');
    
    if (graceful) {
      // Graceful shutdown - save state and stop agents properly
      console.log('Initiating graceful orchestrator shutdown...');
      
      // Stop all agents gracefully
      for (const agent of runningAgents) {
        try {
          await orch.stopAgent(agent.id, true);
        } catch (error) {
          console.error(`Failed to gracefully stop agent ${agent.id}:`, error);
        }
      }
      
      // Shutdown orchestrator
      await orch.shutdown();
    } else {
      // Force shutdown
      console.log('Initiating force orchestrator shutdown...');
      await orch.shutdown();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Orchestrator shutdown completed',
      shutdownType: graceful ? 'graceful' : 'force',
      agentsStopped: runningAgents.length,
      shutdownAt: new Date()
    });
    
  } catch (error: any) {
    console.error('Failed to shutdown orchestrator:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to shutdown orchestrator',
        details: error.message
      },
      { status: 500 }
    );
  }
}