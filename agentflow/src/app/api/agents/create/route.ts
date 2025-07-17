import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator, AgentConfig } from '../../../../../lib/agents/orchestrator';

// Global orchestrator instance (in production, this would be managed differently)
let orchestrator: AgentOrchestrator | null = null;

function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { id, type, projectId, capabilities = [], maxConcurrentTasks = 1, resourceLimits, environment = {} } = body;
    
    if (!id || !type || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: id, type, projectId' },
        { status: 400 }
      );
    }
    
    // Validate agent type
    if (!['claude-code', 'worker', 'monitor'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid agent type. Must be one of: claude-code, worker, monitor' },
        { status: 400 }
      );
    }
    
    // Default resource limits
    const defaultResourceLimits = {
      memory: '1GB',
      cpu: '1',
      timeout: 300000 // 5 minutes
    };
    
    const agentConfig: AgentConfig = {
      id,
      type,
      projectId,
      taskId: body.taskId,
      capabilities,
      maxConcurrentTasks,
      resourceLimits: { ...defaultResourceLimits, ...resourceLimits },
      environment
    };
    
    const orch = getOrchestrator();
    const agentId = await orch.createAgent(agentConfig);
    
    return NextResponse.json({
      success: true,
      agentId,
      message: `Agent ${agentId} created successfully`
    });
    
  } catch (error: any) {
    console.error('Failed to create agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create agent',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orch = getOrchestrator();
    const agents = orch.getAllAgents();
    
    return NextResponse.json({
      success: true,
      agents: agents.map(agent => ({
        id: agent.id,
        type: agent.config.type,
        projectId: agent.config.projectId,
        status: agent.status,
        capabilities: agent.config.capabilities,
        health: agent.health,
        metrics: agent.metrics,
        createdAt: agent.config.environment.CREATED_AT || new Date().toISOString()
      }))
    });
    
  } catch (error: any) {
    console.error('Failed to get agents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agents',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Batch create multiple agents
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agents } = body;
    
    if (!Array.isArray(agents)) {
      return NextResponse.json(
        { error: 'Expected array of agent configurations' },
        { status: 400 }
      );
    }
    
    const orch = getOrchestrator();
    const results = [];
    
    for (const agentConfig of agents) {
      try {
        const agentId = await orch.createAgent(agentConfig);
        results.push({
          success: true,
          agentId,
          config: agentConfig
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          config: agentConfig
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Created ${successCount}/${agents.length} agents`,
      results
    });
    
  } catch (error: any) {
    console.error('Failed to batch create agents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to batch create agents',
        details: error.message
      },
      { status: 500 }
    );
  }
}