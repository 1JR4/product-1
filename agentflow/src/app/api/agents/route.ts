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

// GET /api/agents - List all agents with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sortBy') || 'id';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    const includeHealth = url.searchParams.get('includeHealth') === 'true';
    const includeMetrics = url.searchParams.get('includeMetrics') === 'true';
    
    const orch = getOrchestrator();
    let agents = orch.getAllAgents();
    
    // Apply filters
    if (projectId) {
      agents = agents.filter(agent => agent.config.projectId === projectId);
    }
    
    if (status) {
      agents = agents.filter(agent => agent.status === status);
    }
    
    if (type) {
      agents = agents.filter(agent => agent.config.type === type);
    }
    
    // Apply sorting
    agents.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'type':
          aVal = a.config.type;
          bVal = b.config.type;
          break;
        case 'lastActivity':
          aVal = a.metrics.lastActivity;
          bVal = b.metrics.lastActivity;
          break;
        case 'uptime':
          aVal = a.metrics.totalRuntime;
          bVal = b.metrics.totalRuntime;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Apply pagination
    const totalAgents = agents.length;
    const paginatedAgents = agents.slice(offset, offset + limit);
    
    // Format response
    const agentList = paginatedAgents.map(agent => {
      const agentData: any = {
        id: agent.id,
        type: agent.config.type,
        projectId: agent.config.projectId,
        status: agent.status,
        sessionId: agent.sessionId,
        capabilities: agent.config.capabilities,
        maxConcurrentTasks: agent.config.maxConcurrentTasks
      };
      
      if (includeHealth) {
        agentData.health = agent.health;
      }
      
      if (includeMetrics) {
        agentData.metrics = agent.metrics;
      }
      
      return agentData;
    });
    
    // Calculate summary statistics
    const summary = {
      total: totalAgents,
      byStatus: agents.reduce((acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: agents.reduce((acc, agent) => {
        acc[agent.config.type] = (acc[agent.config.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byProject: agents.reduce((acc, agent) => {
        acc[agent.config.projectId] = (acc[agent.config.projectId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    return NextResponse.json({
      success: true,
      agents: agentList,
      summary,
      pagination: {
        total: totalAgents,
        limit,
        offset,
        hasMore: offset + limit < totalAgents
      },
      filters: {
        projectId,
        status,
        type
      },
      sorting: {
        sortBy,
        sortOrder
      }
    });
    
  } catch (error: any) {
    console.error('Failed to list agents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list agents',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/agents - Bulk operations on agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentIds, filters, params = {} } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    const orch = getOrchestrator();
    let targetAgents: string[] = [];
    
    // Determine target agents
    if (agentIds && Array.isArray(agentIds)) {
      targetAgents = agentIds;
    } else if (filters) {
      // Filter agents based on criteria
      let agents = orch.getAllAgents();
      
      if (filters.projectId) {
        agents = agents.filter(agent => agent.config.projectId === filters.projectId);
      }
      
      if (filters.status) {
        agents = agents.filter(agent => agent.status === filters.status);
      }
      
      if (filters.type) {
        agents = agents.filter(agent => agent.config.type === filters.type);
      }
      
      targetAgents = agents.map(agent => agent.id);
    } else {
      return NextResponse.json(
        { error: 'Either agentIds or filters must be provided' },
        { status: 400 }
      );
    }
    
    if (targetAgents.length === 0) {
      return NextResponse.json(
        { 
          error: 'No agents found matching the criteria',
          filters,
          agentIds
        },
        { status: 404 }
      );
    }
    
    const results = [];
    
    // Execute action on each agent
    for (const agentId of targetAgents) {
      try {
        let result;
        
        switch (action) {
          case 'start':
            await orch.startAgent(agentId);
            result = { success: true, message: 'Agent started' };
            break;
            
          case 'stop':
            const graceful = params.graceful !== false;
            await orch.stopAgent(agentId, graceful);
            result = { success: true, message: 'Agent stopped' };
            break;
            
          case 'restart':
            const restartGraceful = params.graceful !== false;
            await orch.stopAgent(agentId, restartGraceful);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await orch.startAgent(agentId);
            result = { success: true, message: 'Agent restarted' };
            break;
            
          case 'pause':
            await orch.pauseAgent(agentId);
            result = { success: true, message: 'Agent paused' };
            break;
            
          case 'resume':
            await orch.resumeAgent(agentId);
            result = { success: true, message: 'Agent resumed' };
            break;
            
          case 'remove':
            await orch.removeAgent(agentId);
            result = { success: true, message: 'Agent removed' };
            break;
            
          case 'checkpoint':
            const description = params.description || `Bulk checkpoint at ${new Date().toISOString()}`;
            const checkpointId = await orch.createCheckpoint(agentId, description);
            result = { success: true, message: 'Checkpoint created', checkpointId };
            break;
            
          default:
            result = { success: false, error: `Unknown action: ${action}` };
        }
        
        results.push({
          agentId,
          ...result
        });
        
      } catch (error: any) {
        results.push({
          agentId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed: ${successCount} succeeded, ${failureCount} failed`,
      action,
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
    
  } catch (error: any) {
    console.error('Failed to perform bulk operation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform bulk operation',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/agents - Clean up stopped/failed agents
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeRunning = url.searchParams.get('includeRunning') === 'true';
    const olderThan = url.searchParams.get('olderThan');
    const projectId = url.searchParams.get('projectId');
    const dryRun = url.searchParams.get('dryRun') === 'true';
    
    const orch = getOrchestrator();
    let agents = orch.getAllAgents();
    
    // Filter agents for cleanup
    let agentsToCleanup = agents.filter(agent => {
      // Only include stopped/failed agents unless explicitly requested
      if (!includeRunning && !['stopped', 'error', 'failed'].includes(agent.status)) {
        return false;
      }
      
      // Filter by project if specified
      if (projectId && agent.config.projectId !== projectId) {
        return false;
      }
      
      // Filter by age if specified
      if (olderThan) {
        const cutoffDate = new Date(olderThan);
        const agentLastActivity = agent.metrics.lastActivity;
        if (agentLastActivity > cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        agentsToCleanup: agentsToCleanup.map(agent => ({
          id: agent.id,
          status: agent.status,
          type: agent.config.type,
          projectId: agent.config.projectId,
          lastActivity: agent.metrics.lastActivity
        })),
        count: agentsToCleanup.length
      });
    }
    
    const results = [];
    
    for (const agent of agentsToCleanup) {
      try {
        await orch.removeAgent(agent.id);
        results.push({
          agentId: agent.id,
          success: true,
          message: 'Agent cleaned up successfully'
        });
      } catch (error: any) {
        results.push({
          agentId: agent.id,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${successCount}/${agentsToCleanup.length} agents removed`,
      results,
      summary: {
        total: agentsToCleanup.length,
        cleaned: successCount,
        failed: agentsToCleanup.length - successCount
      }
    });
    
  } catch (error: any) {
    console.error('Failed to cleanup agents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cleanup agents',
        details: error.message
      },
      { status: 500 }
    );
  }
}