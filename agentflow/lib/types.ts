export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  type: 'opus' | 'sonnet' | 'haiku';
  role: 'product-manager' | 'project-manager' | 'architect' | 'senior-dev' | 'frontend-dev' | 'backend-dev' | 'qa-lead' | 'tester' | 'devops';
  tmuxSession: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  lastHeartbeat: Date;
  currentTask?: string;
  capabilities: string[];
  hierarchy: {
    parentId?: string;
    childIds: string[];
  };
}

export interface Feature {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'backlog' | 'in-progress' | 'review' | 'testing' | 'done';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  assignedAgentId?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface Task {
  id: string;
  projectId: string;
  featureId: string;
  title: string;
  description: string;
  assignedAgentId?: string;
  status: 'backlog' | 'assigned' | 'in-progress' | 'review' | 'done';
  dependencies: string[]; // Task IDs
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  projectId: string;
  type: 'task-assignment' | 'status-update' | 'request-help' | 'collaboration' | 'notification';
  content: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export interface AgentHeartbeat {
  agentId: string;
  timestamp: Date;
  status: Agent['status'];
  currentTask?: string;
  systemStats?: {
    cpu: number;
    memory: number;
    activeTokens: number;
  };
}

export interface ProjectSharedMemory {
  projectId: string;
  context: {
    currentSprint?: string;
    blockers: string[];
    decisions: Array<{
      decision: string;
      rationale: string;
      timestamp: Date;
      agentId: string;
    }>;
    techStack: string[];
    architecture: string;
  };
  lastUpdated: Date;
}

export interface TokenUsage {
  agentId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface AgentCheckpoint {
  id: string;
  agentId: string;
  projectId: string;
  state: any;
  timestamp: Date;
  description: string;
}