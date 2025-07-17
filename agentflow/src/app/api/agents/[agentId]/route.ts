import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '../../../../../lib/agents/orchestrator';

// Global orchestrator instance (in production, this would be managed differently)
let orchestrator: AgentOrchestrator | null = null;

function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

// GET /api/agents/[agentId] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        config: agent.config,
        status: agent.status,
        health: agent.health,
        metrics: agent.metrics,
        sessionId: agent.sessionId,
        checkpoints: agent.checkpoints.map(cp => ({
          id: cp.id,
          timestamp: cp.timestamp,
          description: cp.description
        }))
      }
    });
    
  } catch (error: any) {
    console.error(`Failed to get agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agent',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[agentId] - Update agent configuration
export async function PUT(
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
    
    // Update allowed fields
    const { capabilities, maxConcurrentTasks, resourceLimits, environment } = body;
    
    if (capabilities) {
      agent.config.capabilities = capabilities;
    }
    
    if (maxConcurrentTasks) {
      agent.config.maxConcurrentTasks = maxConcurrentTasks;
    }
    
    if (resourceLimits) {
      agent.config.resourceLimits = { ...agent.config.resourceLimits, ...resourceLimits };
    }
    
    if (environment) {
      agent.config.environment = { ...agent.config.environment, ...environment };
    }
    
    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} updated successfully`,
      agent: {
        id: agent.id,
        config: agent.config,
        status: agent.status
      }
    });
    
  } catch (error: any) {
    console.error(`Failed to update agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update agent',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId] - Remove agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // Check if agent is running and force is not specified
    if (agent.status === 'running' && !force) {
      return NextResponse.json(
        { 
          error: `Agent ${agentId} is currently running. Use ?force=true to forcibly remove`,
          status: agent.status
        },
        { status: 409 }
      );
    }
    
    await orch.removeAgent(agentId);
    
    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} removed successfully`
    });
    
  } catch (error: any) {
    console.error(`Failed to remove agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove agent',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[agentId] - Agent lifecycle operations
export async function PATCH(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { action, ...actionParams } = body;
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'start':
        await orch.startAgent(agentId);
        result = { message: `Agent ${agentId} started successfully` };
        break;
        
      case 'stop':
        const graceful = actionParams.graceful !== false;
        await orch.stopAgent(agentId, graceful);
        result = { message: `Agent ${agentId} stopped successfully` };
        break;
        
      case 'pause':
        await orch.pauseAgent(agentId);
        result = { message: `Agent ${agentId} paused successfully` };
        break;
        
      case 'resume':
        await orch.resumeAgent(agentId);
        result = { message: `Agent ${agentId} resumed successfully` };
        break;
        
      case 'restart':
        const restartGraceful = actionParams.graceful !== false;
        await orch.stopAgent(agentId, restartGraceful);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await orch.startAgent(agentId);
        result = { message: `Agent ${agentId} restarted successfully` };
        break;
        
      case 'checkpoint':
        const description = actionParams.description || `Checkpoint created at ${new Date().toISOString()}`;
        const checkpointId = await orch.createCheckpoint(agentId, description);
        result = { 
          message: `Checkpoint created for agent ${agentId}`,
          checkpointId
        };
        break;
        
      case 'rollback':
        const { checkpointId: targetCheckpointId } = actionParams;
        if (!targetCheckpointId) {
          return NextResponse.json(
            { error: 'checkpointId is required for rollback action' },
            { status: 400 }
          );
        }
        await orch.rollback(agentId, targetCheckpointId);
        result = { 
          message: `Agent ${agentId} rolled back to checkpoint ${targetCheckpointId}`
        };
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    // Get updated agent status
    const updatedAgent = orch.getAgent(agentId);
    
    return NextResponse.json({
      success: true,
      ...result,
      agent: {
        id: updatedAgent!.id,
        status: updatedAgent!.status,
        health: updatedAgent!.health
      }
    });
    
  } catch (error: any) {
    console.error(`Failed to perform action on agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform action',
        details: error.message
      },
      { status: 500 }
    );
  }
}