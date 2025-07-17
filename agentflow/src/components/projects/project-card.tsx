import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Clock, 
  MoreHorizontal, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Pause,
  Archive 
} from "lucide-react"
import Link from "next/link"
import { Project } from "../../../lib/types"

interface ProjectCardProps {
  project: Project
  agentCount?: number
  progressPercentage?: number
}

export function ProjectCard({ project, agentCount = 0, progressPercentage = 0 }: ProjectCardProps) {
  const getStatusIcon = () => {
    switch (project.status) {
      case "active":
        return <Activity className="h-4 w-4" />
      case "planning":
        return <AlertCircle className="h-4 w-4" />
      case "paused":
        return <Pause className="h-4 w-4" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "archived":
        return <Archive className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (project.status) {
      case "active":
        return "bg-green-100 text-green-700 hover:bg-green-200"
      case "planning":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200"
      case "paused":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
      case "completed":
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      case "archived":
        return "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1 capitalize">{project.status}</span>
              </Badge>
              {project.techStack && project.techStack.length > 0 && (
                <Badge variant="outline">
                  {project.techStack[0]}
                  {project.techStack.length > 1 && ` +${project.techStack.length - 1}`}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="line-clamp-2">
          {project.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{agentCount} agents</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link href={`/projects/${project.id}`}>
              View Details
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/agents`}>
              Agents
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}