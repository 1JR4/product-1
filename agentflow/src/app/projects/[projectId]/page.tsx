"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Users, 
  Calendar, 
  Code, 
  TrendingUp, 
  Settings,
  Play,
  Pause,
  Archive,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock data - replace with Firebase integration
const mockProject = {
  id: "1",
  name: "E-commerce Platform",
  description: "Building a modern e-commerce platform with AI-powered recommendations and real-time analytics.",
  status: "active",
  progress: 75,
  createdAt: "2024-01-15",
  techStack: ["React", "Node.js", "PostgreSQL", "Redis", "Docker"],
  ownerId: "user-1",
  agents: [
    { id: "1", name: "Frontend Agent", type: "sonnet", status: "active", currentTask: "Building product catalog UI" },
    { id: "2", name: "Backend Agent", type: "opus", status: "active", currentTask: "API development" },
    { id: "3", name: "QA Agent", type: "haiku", status: "idle", currentTask: "Test planning" },
  ],
  recentFeatures: [
    { id: "1", title: "User Authentication", status: "done", progress: 100 },
    { id: "2", title: "Product Catalog", status: "in-progress", progress: 80 },
    { id: "3", title: "Shopping Cart", status: "in-progress", progress: 45 },
    { id: "4", title: "Payment Integration", status: "backlog", progress: 0 },
  ],
  stats: {
    completedFeatures: 12,
    activeFeatures: 5,
    totalTasks: 48,
    completedTasks: 36,
    activeAgents: 2,
    totalAgents: 3,
  }
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // In a real app, you'd fetch project data based on projectId
  // const { project, loading, error } = useProject(projectId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{mockProject.name}</h1>
            <Badge 
              variant={mockProject.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {mockProject.status}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {mockProject.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {mockProject.createdAt}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {mockProject.agents.length} agents
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {mockProject.progress}% complete
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>
            Overall completion status and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{mockProject.progress}%</span>
            </div>
            <Progress value={mockProject.progress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockProject.stats.completedFeatures}
              </div>
              <div className="text-sm text-muted-foreground">
                Features Done
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mockProject.stats.activeFeatures}
              </div>
              <div className="text-sm text-muted-foreground">
                In Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {mockProject.stats.completedTasks}
              </div>
              <div className="text-sm text-muted-foreground">
                Tasks Done
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mockProject.stats.activeAgents}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Agents
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
          <CardDescription>
            Technologies and frameworks used in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mockProject.techStack.map((tech) => (
              <Badge key={tech} variant="outline" className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
            <CardDescription>
              Agents currently working on this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProject.agents.slice(0, 3).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      agent.status === "active" ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.currentTask}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {agent.type}
                </Badge>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href={`/projects/${projectId}/agents`}>
                View All Agents
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Features */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Features</CardTitle>
            <CardDescription>
              Latest feature development status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProject.recentFeatures.slice(0, 3).map((feature) => (
              <div key={feature.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{feature.title}</p>
                  <Badge
                    variant={
                      feature.status === "done"
                        ? "default"
                        : feature.status === "in-progress"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {feature.status}
                  </Badge>
                </div>
                {feature.progress > 0 && (
                  <Progress value={feature.progress} className="h-1" />
                )}
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href={`/projects/${projectId}/features`}>
                View All Features
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common project management actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href={`/projects/${projectId}/features`}>
                <Activity className="h-4 w-4 mr-2" />
                View Features Board
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/projects/${projectId}/agents`}>
                <Users className="h-4 w-4 mr-2" />
                Manage Agents
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/projects/${projectId}/progress`}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Progress Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}