"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play
} from "lucide-react"
import { Feature, Task } from "../../../lib/types"
import { cn } from "@/lib/utils"

interface ProgressChartProps {
  features?: Feature[]
  tasks?: Task[]
  timeframe?: "week" | "month" | "quarter"
  variant?: "bar" | "pie" | "timeline" | "burndown"
  showDetails?: boolean
  className?: string
}

export function ProgressChart({
  features = [],
  tasks = [],
  timeframe = "month",
  variant = "bar",
  showDetails = true,
  className
}: ProgressChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  // Calculate progress data
  const calculateProgress = () => {
    const statusCounts = {
      backlog: 0,
      "in-progress": 0,
      review: 0,
      testing: 0,
      done: 0
    }

    features.forEach(feature => {
      statusCounts[feature.status] = (statusCounts[feature.status] || 0) + 1
    })

    const total = features.length
    const completed = statusCounts.done
    const inProgress = statusCounts["in-progress"] + statusCounts.review + statusCounts.testing
    const remaining = statusCounts.backlog

    return {
      statusCounts,
      total,
      completed,
      inProgress,
      remaining,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    }
  }

  const progress = calculateProgress()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "backlog": return "bg-gray-400"
      case "in-progress": return "bg-blue-500"
      case "review": return "bg-purple-500"
      case "testing": return "bg-yellow-500"
      case "done": return "bg-green-500"
      default: return "bg-gray-400"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in-progress": return "In Progress"
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const renderBarChart = () => {
    const maxCount = Math.max(...Object.values(progress.statusCounts))
    
    return (
      <div className="space-y-4">
        {Object.entries(progress.statusCounts).map(([status, count]) => (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", getStatusColor(status))} />
                <span className="font-medium">{getStatusLabel(status)}</span>
              </div>
              <span className="text-muted-foreground">{count}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all duration-500", getStatusColor(status))}
                style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPieChart = () => {
    const total = progress.total
    if (total === 0) return <div className="text-center text-muted-foreground">No data</div>

    return (
      <div className="space-y-4">
        {/* Simplified pie representation using stacked progress bars */}
        <div className="relative">
          <div className="w-32 h-32 mx-auto border-8 border-muted rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(progress.completionRate)}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(progress.statusCounts).map(([status, count]) => (
            count > 0 && (
              <div key={status} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", getStatusColor(status))} />
                <span className="text-muted-foreground">
                  {getStatusLabel(status)}: {count}
                </span>
              </div>
            )
          ))}
        </div>
      </div>
    )
  }

  const renderTimeline = () => {
    const recentFeatures = features
      .filter(f => f.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)

    return (
      <div className="space-y-4">
        {recentFeatures.map((feature, index) => (
          <div key={feature.id} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-3 h-3 rounded-full",
                feature.status === "done" ? "bg-green-500" : "bg-blue-500"
              )} />
              {index < recentFeatures.length - 1 && (
                <div className="w-px h-8 bg-muted mt-2" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="font-medium text-sm">{feature.title}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(feature.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {feature.updatedAt.toLocaleDateString()}
                </span>
              </div>
              <Progress value={feature.progress} className="h-1" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderBurndown = () => {
    // Simplified burndown chart showing remaining work over time
    const remainingWork = features.filter(f => f.status !== "done").length
    const totalWork = features.length
    const burndownData = [
      { day: "Mon", remaining: totalWork },
      { day: "Tue", remaining: Math.max(0, totalWork - 1) },
      { day: "Wed", remaining: Math.max(0, totalWork - 2) },
      { day: "Thu", remaining: Math.max(0, totalWork - 3) },
      { day: "Fri", remaining: remainingWork },
    ]

    const maxRemaining = Math.max(...burndownData.map(d => d.remaining))

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between h-32 gap-2">
          {burndownData.map((day, index) => (
            <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
              <div 
                className="w-full bg-blue-500 rounded-t transition-all duration-500"
                style={{ 
                  height: `${maxRemaining > 0 ? (day.remaining / maxRemaining) * 100 : 0}%`,
                  minHeight: day.remaining > 0 ? '4px' : '0px'
                }}
              />
              <span className="text-xs text-muted-foreground">{day.day}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Remaining features over time
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (variant) {
      case "pie": return renderPieChart()
      case "timeline": return renderTimeline()
      case "burndown": return renderBurndown()
      default: return renderBarChart()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>
              {progress.total} total features • {progress.completed} completed • {progress.inProgress} in progress
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={variant === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => {}}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={variant === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => {}}
            >
              <PieChart className="h-4 w-4" />
            </Button>
            <Button
              variant={variant === "timeline" ? "default" : "outline"}
              size="sm"
              onClick={() => {}}
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {Math.round(progress.completionRate)}%
            </span>
          </div>
          <Progress value={progress.completionRate} className="h-3" />
        </div>

        {/* Chart */}
        <div className="min-h-64">
          {renderChart()}
        </div>

        {/* Details */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{progress.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{progress.remaining}</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact progress indicator for smaller spaces
interface ProgressIndicatorProps {
  label: string
  current: number
  total: number
  variant?: "default" | "success" | "warning" | "danger"
  size?: "sm" | "md"
  className?: string
}

export function ProgressIndicator({
  label,
  current,
  total,
  variant = "default",
  size = "md",
  className
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  
  const getVariantColor = () => {
    switch (variant) {
      case "success": return "bg-green-500"
      case "warning": return "bg-yellow-500"
      case "danger": return "bg-red-500"
      default: return "bg-blue-500"
    }
  }

  const sizeClasses = size === "sm" ? "h-2" : "h-3"

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current}/{total} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className={cn("w-full bg-muted rounded-full", sizeClasses)}>
        <div
          className={cn("rounded-full transition-all duration-500", sizeClasses, getVariantColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Sprint progress with velocity tracking
interface SprintProgressProps {
  sprintName: string
  startDate: Date
  endDate: Date
  features: Feature[]
  velocity?: number
  className?: string
}

export function SprintProgress({
  sprintName,
  startDate,
  endDate,
  features,
  velocity,
  className
}: SprintProgressProps) {
  const completedFeatures = features.filter(f => f.status === "done").length
  const totalFeatures = features.length
  const daysTotal = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const daysElapsed = daysTotal - daysRemaining

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {sprintName}
        </CardTitle>
        <CardDescription>
          {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Sprint completed"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ProgressIndicator
          label="Features"
          current={completedFeatures}
          total={totalFeatures}
          variant={completedFeatures === totalFeatures ? "success" : "default"}
        />
        
        <ProgressIndicator
          label="Timeline"
          current={daysElapsed}
          total={daysTotal}
          variant={daysRemaining === 0 ? "success" : "default"}
        />
        
        {velocity && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Velocity: {velocity} features/week</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}