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

// GET /api/agents/[agentId]/messages - Get messages for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type'); // Filter by message type
    const since = url.searchParams.get('since'); // Get messages since timestamp
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // In a real implementation, this would fetch from the message bus
    // For now, we'll return mock messages
    const mockMessages = [
      {
        id: 'msg-1',
        from: 'system',
        to: agentId,
        type: 'task',
        payload: {
          action: 'analyze_code',
          files: ['src/main.ts'],
          priority: 'high'
        },
        timestamp: new Date(Date.now() - 60000),
        status: 'delivered'
      },
      {
        id: 'msg-2',
        from: agentId,
        to: 'system',
        type: 'response',
        payload: {
          taskId: 'task-1',
          result: 'Analysis complete',
          issues: []
        },
        timestamp: new Date(Date.now() - 30000),
        status: 'sent'
      },
      {
        id: 'msg-3',
        from: 'agent-monitor',
        to: agentId,
        type: 'health_check',
        payload: {
          checkId: 'hc-1',
          requestedAt: new Date()
        },
        timestamp: new Date(Date.now() - 10000),
        status: 'pending'
      }
    ];
    
    let filteredMessages = mockMessages;
    
    // Apply filters
    if (type) {
      filteredMessages = filteredMessages.filter(msg => msg.type === type);
    }
    
    if (since) {
      const sinceDate = new Date(since);
      filteredMessages = filteredMessages.filter(msg => msg.timestamp > sinceDate);
    }
    
    // Apply pagination
    const paginatedMessages = filteredMessages.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      agentId,
      messages: paginatedMessages,
      pagination: {
        total: filteredMessages.length,
        limit,
        offset,
        hasMore: offset + limit < filteredMessages.length
      },
      filters: {
        type,
        since
      }
    });
    
  } catch (error: any) {
    console.error(`Failed to get messages for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agent messages',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/agents/[agentId]/messages - Send a message to an agent
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    
    const { 
      type = 'command',
      payload,
      priority = 'normal',
      correlationId,
      ttl,
      expectResponse = false,
      timeout = 30000
    } = body;
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Message payload is required' },
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
    
    // Check if agent is available to receive messages
    if (agent.status === 'stopped' || agent.status === 'error') {
      return NextResponse.json(
        { 
          error: `Agent ${agentId} is not available (status: ${agent.status})`,
          status: agent.status
        },
        { status: 409 }
      );
    }
    
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: 'api',
      to: agentId,
      type,
      payload,
      timestamp: new Date(),
      priority,
      correlationId,
      ttl,
      expectResponse
    };
    
    try {
      // Send message through the orchestrator
      await orch.sendMessage(agentId, message);
      
      let response: any = {
        success: true,
        messageId: message.id,
        message: `Message sent to agent ${agentId}`,
        sentAt: message.timestamp
      };
      
      // If response is expected, wait for it
      if (expectResponse) {
        try {
          // In a real implementation, this would use the message bus to wait for response
          // For now, we'll simulate a response
          const mockResponse = {
            correlationId: message.id,
            result: 'Message processed successfully',
            processingTime: Math.random() * 1000 + 500
          };
          
          response.response = mockResponse;
          response.responseReceivedAt = new Date();
        } catch (responseError: any) {
          response.warning = `Message sent but response timeout after ${timeout}ms`;
          response.responseError = responseError.message;
        }
      }
      
      return NextResponse.json(response);
      
    } catch (sendError: any) {
      return NextResponse.json(
        { 
          error: 'Failed to send message to agent',
          details: sendError.message,
          messageId: message.id
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error(`Failed to send message to agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[agentId]/messages - Broadcast message to agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    
    const { topic, payload, priority = 'normal' } = body;
    
    if (!topic || !payload) {
      return NextResponse.json(
        { error: 'Topic and payload are required for broadcast' },
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
    
    const broadcastMessage = {
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: 'api',
      to: [agentId], // Single agent broadcast
      type: 'broadcast',
      payload: {
        topic,
        data: payload
      },
      timestamp: new Date(),
      priority
    };
    
    // Send broadcast through orchestrator
    await orch.sendMessage(agentId, broadcastMessage);
    
    return NextResponse.json({
      success: true,
      messageId: broadcastMessage.id,
      message: `Broadcast sent to agent ${agentId}`,
      topic,
      sentAt: broadcastMessage.timestamp
    });
    
  } catch (error: any) {
    console.error(`Failed to broadcast message to agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to broadcast message',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId]/messages - Clear agent message queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const url = new URL(request.url);
    const messageType = url.searchParams.get('type');
    const olderThan = url.searchParams.get('olderThan');
    
    const orch = getOrchestrator();
    const agent = orch.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // In a real implementation, this would clear messages from the message bus
    // For now, we'll simulate the operation
    
    let clearCriteria = 'all messages';
    
    if (messageType) {
      clearCriteria = `messages of type '${messageType}'`;
    }
    
    if (olderThan) {
      const olderThanDate = new Date(olderThan);
      clearCriteria += ` older than ${olderThanDate.toISOString()}`;
    }
    
    // Simulate clearing messages
    const clearedCount = Math.floor(Math.random() * 10) + 1;
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${clearCriteria} for agent ${agentId}`,
      clearedCount,
      agentId,
      clearedAt: new Date()
    });
    
  } catch (error: any) {
    console.error(`Failed to clear messages for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to clear agent messages',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[agentId]/messages - Update message status or retry failed messages
export async function PATCH(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { action, messageId, messageIds, newStatus } = body;
    
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
      case 'retry_failed':
        // Retry all failed messages for the agent
        result = {
          message: `Retrying failed messages for agent ${agentId}`,
          retriedCount: Math.floor(Math.random() * 5) + 1
        };
        break;
        
      case 'mark_read':
        const targetIds = messageIds || (messageId ? [messageId] : []);
        result = {
          message: `Marked ${targetIds.length} messages as read for agent ${agentId}`,
          messageIds: targetIds
        };
        break;
        
      case 'update_status':
        if (!messageId || !newStatus) {
          return NextResponse.json(
            { error: 'messageId and newStatus are required for update_status action' },
            { status: 400 }
          );
        }
        
        result = {
          message: `Updated message ${messageId} status to ${newStatus}`,
          messageId,
          newStatus,
          previousStatus: 'pending' // Mock previous status
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
      agentId,
      action,
      ...result,
      updatedAt: new Date()
    });
    
  } catch (error: any) {
    console.error(`Failed to update messages for agent ${params.agentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update agent messages',
        details: error.message
      },
      { status: 500 }
    );
  }
}