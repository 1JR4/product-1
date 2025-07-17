import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProjectCard } from "@/components/projects/project-card"
import { Plus, Search, Filter } from "lucide-react"
import Link from "next/link"

const mockProjects = [
  {
    id: "1",
    name: "E-commerce Platform",
    description: "Building a modern e-commerce platform with AI-powered recommendations",
    status: "active" as const,
    techStack: ["React", "Node.js", "PostgreSQL"],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-17"),
    ownerId: "user1"
  },
  {
    id: "2", 
    name: "Data Pipeline",
    description: "ETL pipeline for processing large-scale customer data",
    status: "planning" as const,
    techStack: ["Python", "Apache Airflow", "MongoDB"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-16"),
    ownerId: "user1"
  },
  {
    id: "3",
    name: "Mobile App",
    description: "Cross-platform mobile application with real-time features",
    status: "completed" as const,
    techStack: ["React Native", "Firebase"],
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-14"),
    ownerId: "user1"
  },
  {
    id: "4",
    name: "ML Model Training",
    description: "Training recommendation engine with collaborative filtering",
    status: "active" as const,
    techStack: ["Python", "TensorFlow", "Docker"],
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-17"),
    ownerId: "user1"
  },
  {
    id: "5",
    name: "API Gateway",
    description: "Microservices API gateway with authentication and rate limiting",
    status: "active" as const,
    techStack: ["Go", "Redis", "nginx"],
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-17"),
    ownerId: "user1"
  },
  {
    id: "6",
    name: "Documentation Site",
    description: "Automated documentation generation for all project components",
    status: "paused" as const,
    techStack: ["Next.js", "MDX"],
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-15"),
    ownerId: "user1"
  }
]

export default function ProjectsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your AgentFlow projects and monitor agent activities.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProjects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockProjects.filter(p => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockProjects.filter(p => p.status === "planning").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mockProjects.filter(p => p.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}