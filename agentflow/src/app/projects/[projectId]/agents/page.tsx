"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Plus, 
  Activity, 
  Clock, 
  TrendingUp
} from "lucide-react";
import { useParams } from "next/navigation";
import { AgentCard } from "@/components/agents/agent-card";

// Mock data - replace with Firebase integration
const mockAgents = [
  {
    id: "1",
    name: "Frontend Agent",
    type: "sonnet" as const,
    role: "frontend-dev" as const,
    status: "active" as const,
    currentTask: "Building product catalog UI components with responsive design",
    tmuxSession: "frontend-session-1",
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    capabilities: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
    hierarchy: {
      parentId: "2",
      childIds: []
    },
    stats: {
      tasksCompleted: 15,
      uptime: "2h 30m",
      tokensUsed: 45000,
      successRate: 94
    }
  },
  {
    id: "2", 
    name: "Project Manager",
    type: "opus" as const,
    role: "project-manager" as const,
    status: "active" as const,
    currentTask: "Coordinating sprint planning and reviewing feature requirements",
    tmuxSession: "pm-session-1",
    lastHeartbeat: new Date(Date.now() - 1000 * 30), // 30 seconds ago
    capabilities: ["Project Planning", "Team Coordination", "Requirements Analysis"],
    hierarchy: {
      parentId: undefined,
      childIds: ["1", "3", "4"]
    },
    stats: {
      tasksCompleted: 8,
      uptime: "3h 15m", 
      tokensUsed: 67000,
      successRate: 98
    }
  },
  {
    id: "3",
    name: "Backend Agent", 
    type: "sonnet" as const,
    role: "backend-dev" as const,
    status: "busy" as const,
    currentTask: "Implementing API endpoints for user authentication and authorization",
    tmuxSession: "backend-session-1",
    lastHeartbeat: new Date(Date.now() - 1000 * 60), // 1 minute ago
    capabilities: ["Node.js", "PostgreSQL", "Redis", "Docker", "API Design"],
    hierarchy: {
      parentId: "2",
      childIds: []
    },
    stats: {
      tasksCompleted: 12,
      uptime: "2h 45m",
      tokensUsed: 52000,
      successRate: 96
    }
  },
  {
    id: "4",
    name: "QA Agent",
    type: "haiku" as const, 
    role: "qa-lead" as const,
    status: "idle" as const,
    currentTask: "Waiting for feature completion to begin testing",
    tmuxSession: "qa-session-1",
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    capabilities: ["Test Planning", "Automated Testing", "Bug Detection"],
    hierarchy: {
      parentId: "2",
      childIds: []
    },
    stats: {
      tasksCompleted: 6,
      uptime: "1h 20m",
      tokensUsed: 23000,
      successRate: 92
    }
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-500";
    case "busy": return "bg-orange-500"; 
    case "idle": return "bg-yellow-500";
    case "error": return "bg-red-500";
    case "offline": return "bg-gray-500";
    default: return "bg-gray-500";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "opus": return "bg-purple-100 text-purple-800";
    case "sonnet": return "bg-blue-100 text-blue-800";
    case "haiku": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function AgentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const activeAgents = mockAgents.filter(agent => agent.status === "active" || agent.status === "busy");
  const idleAgents = mockAgents.filter(agent => agent.status === "idle");

  // Agent action handlers
  const handleStartAgent = (agentId: string) => {
    console.log(`Starting agent ${agentId}`);
    // TODO: Implement start agent logic
    alert(`Starting agent ${agentId}`);
  };

  const handlePauseAgent = (agentId: string) => {
    console.log(`Pausing agent ${agentId}`);
    // TODO: Implement pause agent logic
    alert(`Pausing agent ${agentId}`);
  };

  const handleStopAgent = (agentId: string) => {
    console.log(`Stopping agent ${agentId}`);
    // TODO: Implement stop agent logic
    alert(`Stopping agent ${agentId}`);
  };

  const handleMessageAgent = (agentId: string) => {
    console.log(`Opening chat with agent ${agentId}`);
    // TODO: Implement chat functionality
    alert(`Opening chat with agent ${agentId}`);
  };

  const handleConfigureAgent = (agentId: string) => {
    console.log(`Configuring agent ${agentId}`);
    // TODO: Implement configure functionality
    alert(`Configuring agent ${agentId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Agents</h1>
          <p className="text-muted-foreground">
            Manage and monitor AI agents working on this project
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAgents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeAgents.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {idleAgents.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(mockAgents.reduce((acc, agent) => acc + agent.stats.successRate, 0) / mockAgents.length)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Active Agents</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {mockAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={() => handleStartAgent(agent.id)}
              onPause={() => handlePauseAgent(agent.id)}
              onStop={() => handleStopAgent(agent.id)}
              onMessage={() => handleMessageAgent(agent.id)}
              onConfigure={() => handleConfigureAgent(agent.id)}
            />
          ))}
        </div>
      </div>

      {/* Agent Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Hierarchy</CardTitle>
          <CardDescription>
            Organizational structure and reporting relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Project Manager at top */}
            {mockAgents
              .filter(agent => !agent.hierarchy.parentId)
              .map(manager => (
                <div key={manager.id} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {manager.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{manager.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {manager.role.replace('-', ' ')}
                      </p>
                    </div>
                    <div className={`ml-auto h-2 w-2 rounded-full ${getStatusColor(manager.status)}`} />
                  </div>
                  
                  {/* Children */}
                  <div className="ml-6 space-y-2">
                    {manager.hierarchy?.childIds?.map(childId => {
                      const child = mockAgents.find(a => a.id === childId);
                      if (!child) return null;
                      
                      return (
                        <div key={child.id} className="flex items-center gap-3 p-2 bg-background border rounded-md">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {child.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{child.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {child.role.replace('-', ' ')}
                            </p>
                          </div>
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(child.status)}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}