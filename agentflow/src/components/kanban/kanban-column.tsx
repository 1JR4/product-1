"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Plus,
  MoreHorizontal,
  ArrowRight,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Eye
} from "lucide-react"
import { Feature, Agent, Task } from "../../../lib/types"
import { FeatureCard, FeatureCardCompact } from "../features/feature-card"
import { AgentStatus } from "../agents/agent-status"
import { EmptyStateCompact } from "../shared/empty-state"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  title: string
  status: Feature['status']
  features: Feature[]
  agents?: Agent[]
  tasks?: Record<string, Task[]>
  maxHeight?: string
  allowDrop?: boolean
  onFeatureMove?: (featureId: string, newStatus: Feature['status']) => void
  onFeatureClick?: (feature: Feature) => void
  onAddFeature?: () => void
  onColumnAction?: () => void
  className?: string
}

export function KanbanColumn({
  title,
  status,
  features,
  agents = [],
  tasks = {},
  maxHeight = "600px",
  allowDrop = true,
  onFeatureMove,
  onFeatureClick,
  onAddFeature,
  onColumnAction,
  className
}: KanbanColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [draggedOver, setDraggedOver] = useState(false)

  const getStatusConfig = () => {
    switch (status) {
      case "backlog":
        return {
          icon: Circle,
          color: "text-gray-500",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-200"
        }
      case "in-progress":
        return {
          icon: Play,
          color: "text-blue-500",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-200"
        }
      case "review":
        return {
          icon: Eye,
          color: "text-purple-500",
          bgColor: "bg-purple-100",
          borderColor: "border-purple-200"
        }
      case "testing":
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-100",
          borderColor: "border-yellow-200"
        }
      case "done":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-100",
          borderColor: "border-green-200"
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const handleDragOver = (e: React.DragEvent) => {
    if (!allowDrop) return
    e.preventDefault()
    setDraggedOver(true)
  }

  const handleDragLeave = () => {
    setDraggedOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggedOver(false)
    
    if (!allowDrop || !onFeatureMove) return
    
    const featureId = e.dataTransfer.getData("text/plain")
    if (featureId) {
      onFeatureMove(featureId, status)
    }
  }

  const assignedAgents = agents.filter(agent => 
    features.some(feature => feature.assignedAgentId === agent.id)
  )

  const totalEstimatedHours = features.reduce((sum, feature) => 
    sum + (feature.estimatedHours || 0), 0
  )

  const averageProgress = features.length > 0 
    ? features.reduce((sum, feature) => sum + feature.progress, 0) / features.length
    : 0

  return (
    <div 
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg transition-all duration-200",
        draggedOver && allowDrop && "bg-muted/60 ring-2 ring-primary/20",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 border-b bg-background rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <h3 className="font-semibold text-lg">{title}</h3>
            <Badge variant="secondary" className={config.bgColor}>
              {features.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {onAddFeature && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onAddFeature}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onColumnAction && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onColumnAction}
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Column Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {assignedAgents.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{assignedAgents.length} agents</span>
            </div>
          )}
          {totalEstimatedHours > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{totalEstimatedHours}h estimated</span>
            </div>
          )}
          {features.length > 0 && status !== "backlog" && (
            <div className="flex items-center gap-1">
              <span>{Math.round(averageProgress)}% avg progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
        <div className="p-2 space-y-2">
          {features.length === 0 ? (
            <EmptyStateCompact
              title={`No ${title.toLowerCase()} features`}
              action={onAddFeature ? {
                label: "Add Feature",
                onClick: onAddFeature
              } : undefined}
              className="m-2"
            />
          ) : (
            features.map((feature) => (
              <div
                key={feature.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", feature.id)
                }}
                className="cursor-move"
              >
                <FeatureCard
                  feature={feature}
                  assignedAgent={agents.find(a => a.id === feature.assignedAgentId)}
                  tasks={tasks[feature.id] || []}
                  onViewDetails={() => onFeatureClick?.(feature)}
                  onStatusChange={onFeatureMove ? (newStatus) => onFeatureMove(feature.id, newStatus) : undefined}
                  className="hover:shadow-md transition-shadow"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Column Footer */}
      {assignedAgents.length > 0 && (
        <div className="p-2 border-t bg-background rounded-b-lg">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Active Agents</div>
            <div className="flex flex-wrap gap-1">
              {assignedAgents.slice(0, 3).map((agent) => (
                <AgentStatus
                  key={agent.id}
                  agent={agent}
                  size="sm"
                  showLabel={false}
                />
              ))}
              {assignedAgents.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{assignedAgents.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Kanban board component that manages multiple columns
interface KanbanBoardProps {
  features: Feature[]
  agents?: Agent[]
  tasks?: Record<string, Task[]>
  onFeatureMove?: (featureId: string, newStatus: Feature['status']) => void
  onFeatureClick?: (feature: Feature) => void
  onAddFeature?: (status: Feature['status']) => void
  className?: string
}

export function KanbanBoard({
  features,
  agents = [],
  tasks = {},
  onFeatureMove,
  onFeatureClick,
  onAddFeature,
  className
}: KanbanBoardProps) {
  const columns: Array<{
    status: Feature['status']
    title: string
    description: string
  }> = [
    { status: "backlog", title: "Backlog", description: "Features waiting to be started" },
    { status: "in-progress", title: "In Progress", description: "Features currently being worked on" },
    { status: "review", title: "Review", description: "Features ready for review" },
    { status: "testing", title: "Testing", description: "Features being tested" },
    { status: "done", title: "Done", description: "Completed features" }
  ]

  const getColumnFeatures = (status: Feature['status']) => {
    return features.filter(feature => feature.status === status)
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex gap-6 min-w-max p-4">
        {columns.map((column) => (
          <div key={column.status} className="w-80 flex-shrink-0">
            <KanbanColumn
              title={column.title}
              status={column.status}
              features={getColumnFeatures(column.status)}
              agents={agents}
              tasks={tasks}
              onFeatureMove={onFeatureMove}
              onFeatureClick={onFeatureClick}
              onAddFeature={onAddFeature ? () => onAddFeature(column.status) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Compact kanban for smaller spaces
interface KanbanCompactProps {
  features: Feature[]
  maxColumns?: number
  className?: string
}

export function KanbanCompact({ 
  features, 
  maxColumns = 3,
  className 
}: KanbanCompactProps) {
  const statusCounts = features.reduce((acc, feature) => {
    acc[feature.status] = (acc[feature.status] || 0) + 1
    return acc
  }, {} as Record<Feature['status'], number>)

  const statuses: Feature['status'][] = ["backlog", "in-progress", "review", "testing", "done"]
  const visibleStatuses = statuses.slice(0, maxColumns)

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>
      {visibleStatuses.map((status) => {
        const config = {
          backlog: { label: "Backlog", color: "bg-gray-100 text-gray-700" },
          "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-700" },
          review: { label: "Review", color: "bg-purple-100 text-purple-700" },
          testing: { label: "Testing", color: "bg-yellow-100 text-yellow-700" },
          done: { label: "Done", color: "bg-green-100 text-green-700" }
        }[status]

        return (
          <Card key={status} className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}