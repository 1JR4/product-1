"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Clock,
  User,
  Calendar,
  Target,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Play,
  Pause,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Feature, Agent, Task } from "../../../lib/types"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  feature: Feature
  assignedAgent?: Agent
  tasks?: Task[]
  onStatusChange?: (newStatus: Feature['status']) => void
  onAssignAgent?: () => void
  onViewDetails?: () => void
  onAddComment?: () => void
  isDragging?: boolean
  className?: string
}

export function FeatureCard({ 
  feature, 
  assignedAgent,
  tasks = [],
  onStatusChange,
  onAssignAgent,
  onViewDetails,
  onAddComment,
  isDragging = false,
  className 
}: FeatureCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getPriorityConfig = () => {
    switch (feature.priority) {
      case "urgent":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          label: "Urgent",
          dot: "bg-red-500"
        }
      case "high":
        return {
          color: "bg-orange-100 text-orange-700 border-orange-200",
          label: "High",
          dot: "bg-orange-500"
        }
      case "medium":
        return {
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          label: "Medium",
          dot: "bg-yellow-500"
        }
      case "low":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          label: "Low",
          dot: "bg-green-500"
        }
    }
  }

  const getStatusConfig = () => {
    switch (feature.status) {
      case "backlog":
        return {
          color: "bg-gray-100 text-gray-700",
          label: "Backlog",
          canStart: true
        }
      case "in-progress":
        return {
          color: "bg-blue-100 text-blue-700",
          label: "In Progress",
          canStart: false
        }
      case "review":
        return {
          color: "bg-purple-100 text-purple-700",
          label: "Review",
          canStart: false
        }
      case "testing":
        return {
          color: "bg-yellow-100 text-yellow-700",
          label: "Testing",
          canStart: false
        }
      case "done":
        return {
          color: "bg-green-100 text-green-700",
          label: "Done",
          canStart: false
        }
    }
  }

  const priorityConfig = getPriorityConfig()
  const statusConfig = getStatusConfig()

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  const getAgentInitials = () => {
    if (!assignedAgent) return "?"
    return assignedAgent.name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const completedTasks = tasks.filter(task => task.status === "done").length
  const totalTasks = tasks.length

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer border-l-4",
        priorityConfig.dot.replace("bg-", "border-l-"),
        isDragging && "opacity-50 rotate-2 shadow-lg",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
              <Badge variant="secondary" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">
              {feature.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {feature.description}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              // Add menu actions
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{feature.progress}%</span>
          </div>
          <Progress value={feature.progress} className="h-2" />
        </div>

        {/* Task Summary */}
        {totalTasks > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Tasks</span>
            </div>
            <span className="font-medium">
              {completedTasks}/{totalTasks}
            </span>
          </div>
        )}

        {/* Assigned Agent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {assignedAgent ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getAgentInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{assignedAgent.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unassigned</span>
              </>
            )}
          </div>
          {!assignedAgent && onAssignAgent && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onAssignAgent()
              }}
            >
              Assign
            </Button>
          )}
        </div>

        {/* Time Estimates */}
        {(feature.estimatedHours || feature.actualHours) && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time</span>
            </div>
            <div className="text-right">
              {feature.actualHours && (
                <div className="font-medium">{feature.actualHours}h actual</div>
              )}
              {feature.estimatedHours && (
                <div className="text-muted-foreground text-xs">
                  {feature.estimatedHours}h estimated
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Updated</span>
          </div>
          <span>{formatDate(feature.updatedAt)}</span>
        </div>

        {/* Expandable Details */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowDetails(!showDetails)
              }}
              className="w-full justify-between p-0 h-auto text-sm font-medium"
            >
              Tasks ({tasks.length})
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showDetails && (
              <div className="space-y-1">
                {tasks.slice(0, 3).map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md"
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "flex-1 truncate",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{tasks.length - 3} more tasks
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {statusConfig.canStart && onStatusChange && (
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange("in-progress")
              }}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {onViewDetails && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
          {onAddComment && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onAddComment()
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for dense layouts
interface FeatureCardCompactProps {
  feature: Feature
  assignedAgent?: Agent
  onClick?: () => void
  className?: string
}

export function FeatureCardCompact({ feature, assignedAgent, onClick, className }: FeatureCardCompactProps) {
  const priorityConfig = {
    urgent: { color: "bg-red-500", label: "🔴" },
    high: { color: "bg-orange-500", label: "🟠" },
    medium: { color: "bg-yellow-500", label: "🟡" },
    low: { color: "bg-green-500", label: "🟢" }
  }[feature.priority]

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm leading-tight mb-1">
                {feature.title}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{priorityConfig.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {feature.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {feature.progress}%
                </span>
              </div>
            </div>
            {assignedAgent && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {assignedAgent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <Progress value={feature.progress} className="h-1" />
        </div>
      </CardContent>
    </Card>
  )
}