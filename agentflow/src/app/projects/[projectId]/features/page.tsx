"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  MoreVertical, 
  Clock, 
  User,
  AlertCircle,
  CheckCircle,
  Circle,
  Play
} from "lucide-react";
import { useParams } from "next/navigation";

// Mock data - replace with Firebase integration
const mockFeatures = [
  {
    id: "1",
    title: "User Authentication",
    description: "Implement secure login, registration, and password reset functionality",
    priority: "high" as const,
    status: "done" as const,
    progress: 100,
    assignedAgentId: "2",
    estimatedHours: 16,
    actualHours: 14,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-18"
  },
  {
    id: "2", 
    title: "Product Catalog",
    description: "Build product listing, search, filtering, and product detail pages",
    priority: "high" as const,
    status: "in-progress" as const,
    progress: 80,
    assignedAgentId: "1",
    estimatedHours: 24,
    actualHours: 20,
    createdAt: "2024-01-12",
    updatedAt: "2024-01-20"
  },
  {
    id: "3",
    title: "Shopping Cart",
    description: "Shopping cart functionality with add/remove items and quantity management",
    priority: "medium" as const,
    status: "in-progress" as const,
    progress: 45,
    assignedAgentId: "1",
    estimatedHours: 12,
    actualHours: 6,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-19"
  },
  {
    id: "4",
    title: "Payment Integration",
    description: "Integrate Stripe payment processing with multiple payment methods",
    priority: "high" as const,
    status: "review" as const,
    progress: 90,
    assignedAgentId: "3",
    estimatedHours: 20,
    actualHours: 18,
    createdAt: "2024-01-08",
    updatedAt: "2024-01-17"
  },
  {
    id: "5",
    title: "Order Management",
    description: "Order processing, status tracking, and order history",
    priority: "medium" as const,
    status: "testing" as const,
    progress: 95,
    assignedAgentId: "4",
    estimatedHours: 18,
    actualHours: 17,
    createdAt: "2024-01-14",
    updatedAt: "2024-01-21"
  },
  {
    id: "6",
    title: "Admin Dashboard",
    description: "Administrative interface for managing products, orders, and users",
    priority: "medium" as const,
    status: "backlog" as const,
    progress: 0,
    assignedAgentId: undefined,
    estimatedHours: 30,
    actualHours: 0,
    createdAt: "2024-01-16",
    updatedAt: "2024-01-16"
  },
  {
    id: "7",
    title: "Email Notifications",
    description: "Automated email notifications for orders, shipping, and account updates",
    priority: "low" as const,
    status: "backlog" as const,
    progress: 0,
    assignedAgentId: undefined,
    estimatedHours: 8,
    actualHours: 0,
    createdAt: "2024-01-17",
    updatedAt: "2024-01-17"
  },
  {
    id: "8",
    title: "Analytics Dashboard",
    description: "Sales analytics, user behavior tracking, and performance metrics",
    priority: "low" as const,
    status: "backlog" as const,
    progress: 0,
    assignedAgentId: undefined,
    estimatedHours: 25,
    actualHours: 0,
    createdAt: "2024-01-18",
    updatedAt: "2024-01-18"
  }
];

const mockAgents = [
  { id: "1", name: "Frontend Agent", type: "sonnet" },
  { id: "2", name: "Backend Agent", type: "opus" },
  { id: "3", name: "Payment Agent", type: "sonnet" },
  { id: "4", name: "QA Agent", type: "haiku" }
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "backlog": return { 
      icon: Circle, 
      color: "text-gray-500", 
      bgColor: "bg-gray-50", 
      borderColor: "border-gray-200" 
    };
    case "in-progress": return { 
      icon: Play, 
      color: "text-blue-500", 
      bgColor: "bg-blue-50", 
      borderColor: "border-blue-200" 
    };
    case "review": return { 
      icon: AlertCircle, 
      color: "text-yellow-500", 
      bgColor: "bg-yellow-50", 
      borderColor: "border-yellow-200" 
    };
    case "testing": return { 
      icon: Clock, 
      color: "text-purple-500", 
      bgColor: "bg-purple-50", 
      borderColor: "border-purple-200" 
    };
    case "done": return { 
      icon: CheckCircle, 
      color: "text-green-500", 
      bgColor: "bg-green-50", 
      borderColor: "border-green-200" 
    };
    default: return { 
      icon: Circle, 
      color: "text-gray-500", 
      bgColor: "bg-gray-50", 
      borderColor: "border-gray-200" 
    };
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low": return "bg-green-100 text-green-800 border-green-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const columns = [
  { id: "backlog", title: "Backlog", description: "Features waiting to be started" },
  { id: "in-progress", title: "In Progress", description: "Currently being developed" },
  { id: "review", title: "Review", description: "Ready for code review" },
  { id: "testing", title: "Testing", description: "Being tested by QA" },
  { id: "done", title: "Done", description: "Completed features" }
];

export default function FeaturesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Features Board</h1>
          <p className="text-muted-foreground">
            Track feature development progress with a kanban-style board
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {columns.map((column) => {
          const count = mockFeatures.filter(f => f.status === column.id).length;
          const config = getStatusConfig(column.id);
          
          return (
            <Card key={column.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  {column.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 min-h-[600px]">
        {columns.map((column) => {
          const columnFeatures = mockFeatures.filter(feature => feature.status === column.id);
          const config = getStatusConfig(column.id);
          
          return (
            <div key={column.id} className="space-y-4">
              {/* Column Header */}
              <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                <div className="flex items-center gap-2 mb-1">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {columnFeatures.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {column.description}
                </p>
              </div>

              {/* Feature Cards */}
              <div className="space-y-3">
                {columnFeatures.map((feature) => {
                  const assignedAgent = mockAgents.find(a => a.id === feature.assignedAgentId);
                  
                  return (
                    <Card key={feature.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {feature.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {feature.description}
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-3">
                        {/* Priority Badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(feature.priority)}`}
                        >
                          {feature.priority} priority
                        </Badge>

                        {/* Progress */}
                        {feature.progress > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span>{feature.progress}%</span>
                            </div>
                            <Progress value={feature.progress} className="h-1" />
                          </div>
                        )}

                        {/* Assigned Agent */}
                        {assignedAgent && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {assignedAgent.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs">
                              <p className="font-medium">{assignedAgent.name}</p>
                              <p className="text-muted-foreground">{assignedAgent.type}</p>
                            </div>
                          </div>
                        )}

                        {/* Time Estimates */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {feature.estimatedHours}h est.
                          </div>
                          {feature.actualHours > 0 && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {feature.actualHours}h actual
                            </div>
                          )}
                        </div>

                        {/* Created Date */}
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(feature.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add Feature Button for empty columns */}
                {columnFeatures.length === 0 && (
                  <Card className="border-dashed border-2 border-muted-foreground/25">
                    <CardContent className="flex items-center justify-center p-6">
                      <Button variant="ghost" className="text-muted-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feature
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Development Summary</CardTitle>
          <CardDescription>
            Overview of feature development progress and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Progress Overview</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Completed Features</span>
                  <span>{mockFeatures.filter(f => f.status === "done").length} / {mockFeatures.length}</span>
                </div>
                <Progress 
                  value={(mockFeatures.filter(f => f.status === "done").length / mockFeatures.length) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Time Tracking</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Estimated Hours</span>
                  <span>{mockFeatures.reduce((acc, f) => acc + (f.estimatedHours || 0), 0)}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Actual Hours</span>
                  <span>{mockFeatures.reduce((acc, f) => acc + (f.actualHours || 0), 0)}h</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Priority Distribution</h4>
              <div className="text-sm space-y-1">
                {['high', 'medium', 'low'].map(priority => (
                  <div key={priority} className="flex justify-between">
                    <span className="capitalize">{priority} Priority</span>
                    <span>{mockFeatures.filter(f => f.priority === priority).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}