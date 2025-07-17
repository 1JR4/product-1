"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Target,
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  BarChart3,
  Download
} from "lucide-react";
import { useParams } from "next/navigation";

// Mock data - replace with Firebase integration
const mockProgressData = {
  overall: {
    completion: 75,
    velocity: 8.5, // features per week
    burndownRate: 12, // tasks per week
    timeline: {
      startDate: "2024-01-01",
      estimatedEnd: "2024-03-15",
      currentDate: "2024-01-22"
    }
  },
  features: {
    total: 15,
    completed: 8,
    inProgress: 4,
    blocked: 1,
    notStarted: 2
  },
  tasks: {
    total: 127,
    completed: 95,
    inProgress: 18,
    overdue: 3,
    backlog: 11
  },
  agents: {
    total: 4,
    active: 3,
    idle: 1,
    avgEfficiency: 92
  },
  timeline: [
    { week: "Week 1", planned: 8, actual: 6, completed: 5 },
    { week: "Week 2", planned: 12, actual: 10, completed: 8 },
    { week: "Week 3", planned: 15, actual: 14, completed: 12 },
    { week: "Week 4", planned: 18, actual: 16, completed: 15 },
  ],
  recentMilestones: [
    {
      id: "1",
      title: "User Authentication Complete",
      date: "2024-01-18",
      status: "completed",
      impact: "high"
    },
    {
      id: "2", 
      title: "Database Schema Finalized",
      date: "2024-01-15",
      status: "completed",
      impact: "medium"
    },
    {
      id: "3",
      title: "Payment Integration Testing",
      date: "2024-01-25",
      status: "upcoming",
      impact: "high"
    },
    {
      id: "4",
      title: "Beta Release",
      date: "2024-02-01",
      status: "upcoming", 
      impact: "high"
    }
  ],
  blockers: [
    {
      id: "1",
      title: "API Rate Limiting Issues",
      description: "Third-party payment API rate limits causing delays",
      severity: "high",
      assignedTo: "Backend Agent",
      daysBlocked: 2
    },
    {
      id: "2",
      title: "Design System Updates",
      description: "Waiting for updated design components from design team",
      severity: "medium", 
      assignedTo: "Frontend Agent",
      daysBlocked: 1
    }
  ],
  productivity: {
    thisWeek: {
      featuresCompleted: 2,
      tasksCompleted: 12,
      hoursWorked: 45,
      efficiency: 94
    },
    lastWeek: {
      featuresCompleted: 1,
      tasksCompleted: 8,
      hoursWorked: 42,
      efficiency: 87
    }
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "text-green-600";
    case "upcoming": return "text-blue-600";
    case "overdue": return "text-red-600";
    default: return "text-gray-600";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high": return "bg-red-100 text-red-800 border-red-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low": return "bg-green-100 text-green-800 border-green-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function ProgressPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { overall, features, tasks, agents, timeline, recentMilestones, blockers, productivity } = mockProgressData;
  
  const daysElapsed = Math.floor(
    (new Date(overall.timeline.currentDate).getTime() - new Date(overall.timeline.startDate).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  const totalDays = Math.floor(
    (new Date(overall.timeline.estimatedEnd).getTime() - new Date(overall.timeline.startDate).getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Progress Dashboard</h1>
          <p className="text-muted-foreground">
            Track project progress, milestones, and team productivity
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{overall.completion}%</div>
            <Progress value={overall.completion} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {daysElapsed} of {totalDays} days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Features Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {features.completed}/{features.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {features.inProgress} in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {overall.velocity}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              features per week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {blockers.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {agents.active} of {agents.total} agents active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Feature Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Progress</CardTitle>
            <CardDescription>
              Breakdown of feature development status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{features.completed}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(features.completed / features.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{features.inProgress}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(features.inProgress / features.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{features.blocked}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(features.blocked / features.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Not Started</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{features.notStarted}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${(features.notStarted / features.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Task Progress</CardTitle>
            <CardDescription>
              Detailed task completion metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{tasks.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{tasks.inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{tasks.overdue}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{tasks.backlog}</div>
                <div className="text-sm text-muted-foreground">Backlog</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Task Completion Rate</span>
                <span>{Math.round((tasks.completed / tasks.total) * 100)}%</span>
              </div>
              <Progress value={(tasks.completed / tasks.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Productivity</CardTitle>
          <CardDescription>
            This week vs last week performance comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">Features Completed</div>
              <div className="text-2xl font-bold">{productivity.thisWeek.featuresCompleted}</div>
              <div className="flex items-center justify-center gap-1 text-sm">
                {productivity.thisWeek.featuresCompleted > productivity.lastWeek.featuresCompleted ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={productivity.thisWeek.featuresCompleted > productivity.lastWeek.featuresCompleted ? "text-green-600" : "text-red-600"}>
                  {productivity.thisWeek.featuresCompleted - productivity.lastWeek.featuresCompleted > 0 ? "+" : ""}
                  {productivity.thisWeek.featuresCompleted - productivity.lastWeek.featuresCompleted}
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">Tasks Completed</div>
              <div className="text-2xl font-bold">{productivity.thisWeek.tasksCompleted}</div>
              <div className="flex items-center justify-center gap-1 text-sm">
                {productivity.thisWeek.tasksCompleted > productivity.lastWeek.tasksCompleted ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={productivity.thisWeek.tasksCompleted > productivity.lastWeek.tasksCompleted ? "text-green-600" : "text-red-600"}>
                  {productivity.thisWeek.tasksCompleted - productivity.lastWeek.tasksCompleted > 0 ? "+" : ""}
                  {productivity.thisWeek.tasksCompleted - productivity.lastWeek.tasksCompleted}
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">Hours Worked</div>
              <div className="text-2xl font-bold">{productivity.thisWeek.hoursWorked}</div>
              <div className="flex items-center justify-center gap-1 text-sm">
                {productivity.thisWeek.hoursWorked > productivity.lastWeek.hoursWorked ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={productivity.thisWeek.hoursWorked > productivity.lastWeek.hoursWorked ? "text-green-600" : "text-red-600"}>
                  {productivity.thisWeek.hoursWorked - productivity.lastWeek.hoursWorked > 0 ? "+" : ""}
                  {productivity.thisWeek.hoursWorked - productivity.lastWeek.hoursWorked}h
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">Efficiency</div>
              <div className="text-2xl font-bold">{productivity.thisWeek.efficiency}%</div>
              <div className="flex items-center justify-center gap-1 text-sm">
                {productivity.thisWeek.efficiency > productivity.lastWeek.efficiency ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={productivity.thisWeek.efficiency > productivity.lastWeek.efficiency ? "text-green-600" : "text-red-600"}>
                  {productivity.thisWeek.efficiency - productivity.lastWeek.efficiency > 0 ? "+" : ""}
                  {productivity.thisWeek.efficiency - productivity.lastWeek.efficiency}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones and Blockers */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>
              Recent achievements and upcoming targets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMilestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{milestone.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(milestone.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getSeverityColor(milestone.impact)}`}>
                    {milestone.impact}
                  </Badge>
                  <Badge 
                    variant={milestone.status === "completed" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {milestone.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Current Blockers */}
        <Card>
          <CardHeader>
            <CardTitle>Active Blockers</CardTitle>
            <CardDescription>
              Issues requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No active blockers!</p>
              </div>
            ) : (
              blockers.map((blocker) => (
                <div key={blocker.id} className="space-y-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{blocker.title}</p>
                      <p className="text-xs text-muted-foreground">{blocker.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="h-3 w-3" />
                        <span>{blocker.assignedTo}</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{blocker.daysBlocked} days</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getSeverityColor(blocker.severity)}`}>
                      {blocker.severity}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}