import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Users, Folder, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your AgentFlow workspace.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +4 since yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently active projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "E-commerce Platform", status: "active", agents: 5 },
              { name: "Data Pipeline", status: "pending", agents: 3 },
              { name: "Mobile App", status: "completed", agents: 2 },
            ].map((project, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.agents} agents assigned
                  </p>
                </div>
                <Badge
                  variant={
                    project.status === "active"
                      ? "default"
                      : project.status === "pending"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {project.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Activity</CardTitle>
            <CardDescription>
              Real-time agent status and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Frontend Agent", status: "working", task: "Building UI components" },
              { name: "Backend Agent", status: "idle", task: "Waiting for requirements" },
              { name: "QA Agent", status: "working", task: "Running test suites" },
            ].map((agent, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      agent.status === "working" ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.task}</p>
                  </div>
                </div>
                <Badge variant={agent.status === "working" ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
