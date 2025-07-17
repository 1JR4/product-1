import { projectsService, featuresService, tasksService, agentsService, tokenUsageService } from '../firebase/firestore';
import { activityService } from '../firebase/realtime';
import type { Project, Feature, Task, Agent, TokenUsage } from '../types';

export interface ProjectAnalytics {
  projectId: string;
  overallProgress: number;
  featuresProgress: {
    total: number;
    completed: number;
    inProgress: number;
    backlog: number;
  };
  tasksProgress: {
    total: number;
    completed: number;
    inProgress: number;
    backlog: number;
  };
  agentStats: {
    total: number;
    active: number;
    idle: number;
    error: number;
  };
  velocity: {
    tasksPerDay: number;
    featuresPerWeek: number;
    estimatedCompletion: Date | null;
  };
  costs: {
    dailyCost: number;
    weeklyCost: number;
    monthlyCost: number;
    projectedCost: number;
  };
  timeline: {
    startDate: Date;
    estimatedEndDate: Date | null;
    milestonesCompleted: number;
    milestonesPending: number;
  };
}

export interface FeatureAnalytics {
  featureId: string;
  progress: number;
  taskBreakdown: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
  timeMetrics: {
    estimatedHours: number;
    actualHours: number;
    variance: number;
  };
  assignedAgent: string | null;
  blockers: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentPerformance {
  agentId: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageTaskTime: number;
  successRate: number;
  tokensUsed: number;
  costIncurred: number;
  uptime: number;
  errorRate: number;
  productivity: 'high' | 'medium' | 'low';
}

export class ProgressTracker {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async getProjectAnalytics(): Promise<ProjectAnalytics> {
    const [project, features, agents] = await Promise.all([
      projectsService.get(this.projectId),
      featuresService.list(this.projectId),
      agentsService.list(this.projectId)
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all tasks across all features
    const allTasks = await Promise.all(
      features.map(feature => tasksService.list(this.projectId, feature.id))
    );
    const tasks = allTasks.flat();

    // Calculate feature progress
    const featuresProgress = {
      total: features.length,
      completed: features.filter(f => f.status === 'done').length,
      inProgress: features.filter(f => f.status === 'in-progress').length,
      backlog: features.filter(f => f.status === 'backlog').length
    };

    // Calculate task progress
    const tasksProgress = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      backlog: tasks.filter(t => t.status === 'backlog').length
    };

    // Calculate overall progress
    const overallProgress = tasks.length > 0 
      ? Math.round((tasksProgress.completed / tasks.length) * 100)
      : 0;

    // Calculate agent stats
    const agentStats = {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      idle: agents.filter(a => a.status === 'idle').length,
      error: agents.filter(a => a.status === 'error').length
    };

    // Calculate velocity
    const velocity = await this.calculateVelocity(tasks);

    // Calculate costs
    const costs = await this.calculateCosts();

    // Calculate timeline
    const timeline = this.calculateTimeline(project, tasks, velocity);

    return {
      projectId: this.projectId,
      overallProgress,
      featuresProgress,
      tasksProgress,
      agentStats,
      velocity,
      costs,
      timeline
    };
  }

  async getFeatureAnalytics(featureId: string): Promise<FeatureAnalytics> {
    const [feature, tasks] = await Promise.all([
      featuresService.get(this.projectId, featureId),
      tasksService.list(this.projectId, featureId)
    ]);

    if (!feature) {
      throw new Error('Feature not found');
    }

    const taskBreakdown = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      blocked: tasks.filter(t => t.dependencies.some(dep => 
        tasks.find(depTask => depTask.id === dep)?.status !== 'done'
      )).length
    };

    const timeMetrics = {
      estimatedHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
      actualHours: tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
      variance: 0
    };
    timeMetrics.variance = timeMetrics.actualHours - timeMetrics.estimatedHours;

    return {
      featureId,
      progress: feature.progress,
      taskBreakdown,
      timeMetrics,
      assignedAgent: feature.assignedAgentId || null,
      blockers: [], // TODO: Implement blocker detection
      priority: feature.priority
    };
  }

  async getAgentPerformance(agentId: string): Promise<AgentPerformance> {
    const agent = await agentsService.get(this.projectId, agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get all features to find tasks assigned to this agent
    const features = await featuresService.list(this.projectId);
    const allTasks = await Promise.all(
      features.map(feature => tasksService.list(this.projectId, feature.id))
    );
    const agentTasks = allTasks.flat().filter(task => task.assignedAgentId === agentId);

    const tasksCompleted = agentTasks.filter(t => t.status === 'done').length;
    const tasksInProgress = agentTasks.filter(t => t.status === 'in-progress').length;

    // Calculate average task completion time
    const completedTasks = agentTasks.filter(t => t.status === 'done' && t.completedAt);
    const averageTaskTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          const duration = task.completedAt!.getTime() - task.createdAt.getTime();
          return sum + duration;
        }, 0) / completedTasks.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    const successRate = agentTasks.length > 0 
      ? (tasksCompleted / agentTasks.length) * 100 
      : 0;

    // Get token usage (simplified - would need date range in real implementation)
    const today = new Date().toISOString().split('T')[0];
    const tokenUsage = await tokenUsageService.getDailyUsage(this.projectId, today);
    const agentTokenUsage = tokenUsage.find(usage => usage.agentId === agentId);

    const tokensUsed = agentTokenUsage?.inputTokens + agentTokenUsage?.outputTokens || 0;
    const costIncurred = agentTokenUsage?.totalCost || 0;

    // Calculate uptime (simplified)
    const now = Date.now();
    const lastHeartbeat = agent.lastHeartbeat.getTime();
    const uptime = Math.max(0, (now - lastHeartbeat) / (1000 * 60)); // Minutes

    const productivity: 'high' | 'medium' | 'low' = 
      successRate > 80 ? 'high' : 
      successRate > 60 ? 'medium' : 'low';

    return {
      agentId,
      tasksCompleted,
      tasksInProgress,
      averageTaskTime,
      successRate,
      tokensUsed,
      costIncurred,
      uptime,
      errorRate: 0, // TODO: Implement error rate calculation
      productivity
    };
  }

  private async calculateVelocity(tasks: Task[]) {
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);
    
    if (completedTasks.length === 0) {
      return {
        tasksPerDay: 0,
        featuresPerWeek: 0,
        estimatedCompletion: null
      };
    }

    // Calculate daily velocity based on last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTasks = completedTasks.filter(t => t.completedAt! >= sevenDaysAgo);
    const tasksPerDay = recentTasks.length / 7;

    // Estimate features per week (simplified)
    const featuresPerWeek = tasksPerDay * 7 / 5; // Assume 5 tasks per feature

    // Estimate completion date
    const remainingTasks = tasks.filter(t => t.status !== 'done').length;
    const estimatedCompletion = tasksPerDay > 0
      ? new Date(Date.now() + (remainingTasks / tasksPerDay) * 24 * 60 * 60 * 1000)
      : null;

    return {
      tasksPerDay,
      featuresPerWeek,
      estimatedCompletion
    };
  }

  private async calculateCosts() {
    // Get recent token usage
    const today = new Date().toISOString().split('T')[0];
    const tokenUsage = await tokenUsageService.getDailyUsage(this.projectId, today);
    
    const dailyCost = tokenUsage.reduce((sum, usage) => sum + usage.totalCost, 0);
    const weeklyCost = dailyCost * 7; // Simplified estimation
    const monthlyCost = dailyCost * 30; // Simplified estimation
    const projectedCost = dailyCost * 90; // 3-month projection

    return {
      dailyCost,
      weeklyCost,
      monthlyCost,
      projectedCost
    };
  }

  private calculateTimeline(project: Project, tasks: Task[], velocity: any) {
    const completedTasks = tasks.filter(t => t.status === 'done');
    const totalMilestones = Math.ceil(tasks.length / 10); // 10 tasks per milestone
    const milestonesCompleted = Math.floor(completedTasks.length / 10);
    const milestonesPending = totalMilestones - milestonesCompleted;

    return {
      startDate: project.createdAt,
      estimatedEndDate: velocity.estimatedCompletion,
      milestonesCompleted,
      milestonesPending
    };
  }

  // Real-time monitoring methods
  subscribeToProgress(callback: (analytics: ProjectAnalytics) => void) {
    // Subscribe to project changes and recalculate analytics
    const unsubscribe = featuresService.subscribe(this.projectId, async () => {
      const analytics = await this.getProjectAnalytics();
      callback(analytics);
    });

    return unsubscribe;
  }

  async logProgress(milestone: string, details?: any) {
    await activityService.logActivity(
      this.projectId,
      'system',
      `Progress milestone: ${milestone}`,
      details
    );
  }
}