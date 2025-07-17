import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '../../../../../../lib/agents/orchestrator';

// Global orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

// GET /api/agents/[agentId]/status - Get agent status and health
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    const status = {
      id: agent.id,
      status: agent.status,
      health: {
        lastHeartbeat: agent.health.lastHeartbeat,
        responseTime: agent.health.responseTime,
        errorCount: agent.health.errorCount,
        memoryUsage: agent.health.memoryUsage,
        cpuUsage: agent.health.cpuUsage
      },
      metrics: {
        tasksCompleted: agent.metrics.tasksCompleted,
        totalRuntime: agent.metrics.totalRuntime,
        costIncurred: agent.metrics.costIncurred,
        lastActivity: agent.metrics.lastActivity
      },
      sessionId: agent.sessionId
    };
    
    if (detailed) {
      (status as any).config = agent.config;
      (status as any).checkpoints = agent.checkpoints.map(cp => ({
        id: cp.id,
        timestamp: cp.timestamp,
        description: cp.description
      }));
    }
    
    return NextResponse.json({
      success: true,
      ...status
    });
    
  } catch (error: any) {
    console.error(`Failed to get status for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agent status',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/agents/[agentId]/status - Update agent status (for agent self-reporting)
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // Update health metrics
    if (body.health) {
      const { responseTime, memoryUsage, cpuUsage, errorCount } = body.health;
      
      if (responseTime !== undefined) {
        agent.health.responseTime = responseTime;
      }
      
      if (memoryUsage !== undefined) {
        agent.health.memoryUsage = memoryUsage;
      }
      
      if (cpuUsage !== undefined) {
        agent.health.cpuUsage = cpuUsage;
      }
      
      if (errorCount !== undefined) {
        agent.health.errorCount = errorCount;
      }
      
      agent.health.lastHeartbeat = new Date();
    }
    
    // Update metrics
    if (body.metrics) {
      const { tasksCompleted, totalRuntime, costIncurred } = body.metrics;
      
      if (tasksCompleted !== undefined) {
        agent.metrics.tasksCompleted = tasksCompleted;
      }
      
      if (totalRuntime !== undefined) {
        agent.metrics.totalRuntime = totalRuntime;
      }
      
      if (costIncurred !== undefined) {
        agent.metrics.costIncurred = costIncurred;
      }
      
      agent.metrics.lastActivity = new Date();
    }
    
    // Update status if provided
    if (body.status && ['pending', 'starting', 'running', 'paused', 'stopping', 'stopped', 'error'].includes(body.status)) {
      agent.status = body.status;
    }
    
    return NextResponse.json({
      success: true,
      message: `Status updated for agent ${agentId}`,
      status: agent.status,
      health: agent.health,
      metrics: agent.metrics
    });
    
  } catch (error: any) {
    console.error(`Failed to update status for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update agent status',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[agentId]/status - Force status update (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { status, force = false } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    if (!['pending', 'starting', 'running', 'paused', 'stopping', 'stopped', 'error'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // Check for valid status transitions unless force is true
    if (!force) {
      const validTransitions: Record<string, string[]> = {
        'pending': ['starting', 'stopped', 'error'],
        'starting': ['running', 'error', 'stopped'],
        'running': ['paused', 'stopping', 'error'],
        'paused': ['running', 'stopping', 'error'],
        'stopping': ['stopped', 'error'],
        'stopped': ['starting', 'pending'],
        'error': ['starting', 'stopped', 'pending']
      };
      
      const allowedNextStates = validTransitions[agent.status] || [];
      
      if (!allowedNextStates.includes(status)) {
        return NextResponse.json(
          { 
            error: `Invalid status transition from ${agent.status} to ${status}`,
            currentStatus: agent.status,
            allowedTransitions: allowedNextStates
          },
          { status: 409 }
        );
      }
    }
    
    const previousStatus = agent.status;
    agent.status = status;
    
    // Emit status change event
    orch.emit('agent:status', agentId, status);
    
    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} status changed from ${previousStatus} to ${status}`,
      previousStatus,
      currentStatus: status,
      forced: force
    });
    
  } catch (error: any) {
    console.error(`Failed to force status update for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update agent status',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/[agentId]/status/history - Get status change history
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    // In a real implementation, this would fetch from a database
    // For now, we'll return a mock history
    const mockHistory = [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        duration: 5000,
        reason: 'Agent created'
      },
      {
        status: 'starting',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5000),
        duration: 10000,
        reason: 'Agent initialization'
      },
      {
        status: 'running',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 15000),
        duration: 86370000,
        reason: 'Agent operational'
      }
    ];
    
    return NextResponse.json({
      success: true,
      agentId,
      days,
      history: mockHistory
    });
    
  } catch (error: any) {
    console.error(`Failed to get status history for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get status history',
        details: error.message
      },
      { status: 500 }
    );
  }
}