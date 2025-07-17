"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  Target,
  Clock,
  DollarSign,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  progress?: {
    value: number
    max: number
    label?: string
  }
  icon?: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "warning" | "danger" | "info"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  progress,
  icon: Icon,
  variant = "default",
  size = "md",
  className
}: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          border: "border-green-200",
          iconBg: "bg-green-100",
          iconColor: "text-green-600",
          accent: "text-green-600"
        }
      case "warning":
        return {
          border: "border-yellow-200", 
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          accent: "text-yellow-600"
        }
      case "danger":
        return {
          border: "border-red-200",
          iconBg: "bg-red-100", 
          iconColor: "text-red-600",
          accent: "text-red-600"
        }
      case "info":
        return {
          border: "border-blue-200",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600", 
          accent: "text-blue-600"
        }
      default:
        return {
          border: "border-border",
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          accent: "text-primary"
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          padding: "p-4",
          valueText: "text-xl",
          titleText: "text-sm",
          iconSize: "h-4 w-4",
          iconContainer: "h-8 w-8"
        }
      case "lg":
        return {
          padding: "p-6",
          valueText: "text-4xl",
          titleText: "text-lg",
          iconSize: "h-6 w-6", 
          iconContainer: "h-12 w-12"
        }
      default:
        return {
          padding: "p-5",
          valueText: "text-3xl",
          titleText: "text-base",
          iconSize: "h-5 w-5",
          iconContainer: "h-10 w-10"
        }
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()

  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend.isPositive === undefined) {
      return <Minus className="h-3 w-3" />
    }
    
    return trend.isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    )
  }

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground"
    
    if (trend.isPositive === undefined) {
      return "text-muted-foreground"
    }
    
    return trend.isPositive ? "text-green-600" : "text-red-600"
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val
  }

  return (
    <Card className={cn(variantStyles.border, className)}>
      <CardContent className={sizeStyles.padding}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn("font-medium", sizeStyles.titleText)}>
              {title}
            </p>
            <p className={cn("font-bold tracking-tight", sizeStyles.valueText, variantStyles.accent)}>
              {formatValue(value)}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            
            {trend && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs", getTrendColor())}>
                {getTrendIcon()}
                <span>{trend.value}% {trend.label}</span>
              </div>
            )}
            
            {progress && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {progress.label || "Progress"}
                  </span>
                  <span className="font-medium">
                    {progress.value}/{progress.max}
                  </span>
                </div>
                <Progress 
                  value={(progress.value / progress.max) * 100} 
                  className="h-2" 
                />
              </div>
            )}
          </div>
          
          {Icon && (
            <div className={cn(
              "flex items-center justify-center rounded-full",
              variantStyles.iconBg,
              sizeStyles.iconContainer
            )}>
              <Icon className={cn(sizeStyles.iconSize, variantStyles.iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized stats cards for different metrics
export function ProjectStatsCard({ 
  totalProjects, 
  activeProjects, 
  completedProjects,
  className 
}: {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  className?: string
}) {
  const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0
  
  return (
    <StatsCard
      title="Projects"
      value={totalProjects}
      description={`${activeProjects} active, ${completedProjects} completed`}
      progress={{
        value: completedProjects,
        max: totalProjects,
        label: "Completed"
      }}
      icon={Target}
      variant="info"
      className={className}
    />
  )
}

export function AgentStatsCard({ 
  totalAgents, 
  activeAgents, 
  utilization,
  className 
}: {
  totalAgents: number
  activeAgents: number
  utilization: number
  className?: string
}) {
  const trend = utilization > 75 ? { 
    value: Math.round(utilization), 
    label: "utilization", 
    isPositive: true 
  } : undefined
  
  return (
    <StatsCard
      title="AI Agents"
      value={totalAgents}
      description={`${activeAgents} currently active`}
      trend={trend}
      icon={Users}
      variant={activeAgents > 0 ? "success" : "default"}
      className={className}
    />
  )
}

export function TaskStatsCard({ 
  totalTasks, 
  completedTasks, 
  inProgressTasks,
  className 
}: {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  className?: string
}) {
  return (
    <StatsCard
      title="Tasks"
      value={totalTasks}
      description={`${inProgressTasks} in progress`}
      progress={{
        value: completedTasks,
        max: totalTasks,
        label: "Completed"
      }}
      icon={CheckCircle2}
      variant="default"
      className={className}
    />
  )
}

export function PerformanceStatsCard({ 
  completionRate, 
  averageTime, 
  trend,
  className 
}: {
  completionRate: number
  averageTime: number
  trend: { value: number; isPositive: boolean }
  className?: string
}) {
  return (
    <StatsCard
      title="Performance"
      value={`${completionRate}%`}
      description={`${averageTime}h avg completion time`}
      trend={{
        value: Math.abs(trend.value),
        label: "vs last week",
        isPositive: trend.isPositive
      }}
      icon={BarChart3}
      variant={completionRate >= 80 ? "success" : completionRate >= 60 ? "warning" : "danger"}
      className={className}
    />
  )
}

export function CostStatsCard({ 
  totalCost, 
  dailyCost, 
  trend,
  className 
}: {
  totalCost: number
  dailyCost: number
  trend: { value: number; isPositive: boolean }
  className?: string
}) {
  return (
    <StatsCard
      title="Token Cost"
      value={`$${totalCost.toFixed(2)}`}
      description={`$${dailyCost.toFixed(2)} today`}
      trend={{
        value: Math.abs(trend.value),
        label: "vs yesterday",
        isPositive: !trend.isPositive // Cost increase is negative
      }}
      icon={DollarSign}
      variant="info"
      className={className}
    />
  )
}

// Stats card with chart preview
interface StatsCardWithChartProps extends StatsCardProps {
  chartData?: number[]
  chartType?: "line" | "bar"
}

export function StatsCardWithChart({
  chartData = [],
  chartType = "line",
  ...props
}: StatsCardWithChartProps) {
  const maxValue = Math.max(...chartData)
  
  return (
    <Card className={props.className}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="font-medium text-base">{props.title}</p>
            <p className="font-bold tracking-tight text-3xl text-primary">
              {typeof props.value === 'number' ? props.value.toLocaleString() : props.value}
            </p>
            {props.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {props.description}
              </p>
            )}
          </div>
          
          {props.icon && (
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
              <props.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Mini chart */}
        {chartData.length > 0 && (
          <div className="h-16 flex items-end gap-1">
            {chartData.map((value, index) => (
              <div
                key={index}
                className="bg-primary/20 rounded-sm flex-1 transition-all duration-200 hover:bg-primary/40"
                style={{
                  height: `${(value / maxValue) * 100}%`,
                  minHeight: '2px'
                }}
              />
            ))}
          </div>
        )}
        
        {props.trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            props.trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {props.trend.isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>{props.trend.value}% {props.trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}