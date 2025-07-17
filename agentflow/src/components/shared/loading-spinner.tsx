"use client"

import { Loader2, RefreshCw, Brain, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "brain" | "zap" | "refresh"
  text?: string
  className?: string
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  text,
  className 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case "sm": return "h-4 w-4"
      case "md": return "h-6 w-6"
      case "lg": return "h-8 w-8"
      case "xl": return "h-12 w-12"
    }
  }

  const getTextSize = () => {
    switch (size) {
      case "sm": return "text-sm"
      case "md": return "text-base"
      case "lg": return "text-lg"
      case "xl": return "text-xl"
    }
  }

  const getIcon = () => {
    switch (variant) {
      case "brain":
        return <Brain className={cn(getSizeClasses(), "animate-pulse text-purple-500")} />
      case "zap":
        return <Zap className={cn(getSizeClasses(), "animate-bounce text-yellow-500")} />
      case "refresh":
        return <RefreshCw className={cn(getSizeClasses(), "animate-spin text-blue-500")} />
      default:
        return <Loader2 className={cn(getSizeClasses(), "animate-spin text-muted-foreground")} />
    }
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {getIcon()}
      {text && (
        <span className={cn("text-muted-foreground font-medium", getTextSize())}>
          {text}
        </span>
      )}
    </div>
  )
}

// Full page loading overlay
interface LoadingOverlayProps {
  isVisible: boolean
  text?: string
  subtext?: string
  variant?: "default" | "brain" | "zap" | "refresh"
  className?: string
}

export function LoadingOverlay({ 
  isVisible, 
  text = "Loading...", 
  subtext,
  variant = "default",
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="flex flex-col items-center gap-4 p-8">
        <LoadingSpinner size="xl" variant={variant} />
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">{text}</div>
          {subtext && (
            <div className="text-sm text-muted-foreground">{subtext}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Card loading skeleton
interface LoadingCardProps {
  className?: string
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-4 animate-pulse",
      className
    )}>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-muted rounded w-20"></div>
        <div className="h-8 bg-muted rounded w-16"></div>
      </div>
    </div>
  )
}

// Table loading skeleton
interface LoadingTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className="h-4 bg-muted rounded animate-pulse flex-1"
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-8 bg-muted rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// List loading skeleton
interface LoadingListProps {
  items?: number
  showAvatar?: boolean
  className?: string
}

export function LoadingList({ items = 3, showAvatar = false, className }: LoadingListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 animate-pulse">
          {showAvatar && (
            <div className="w-10 h-10 bg-muted rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Progress loading with steps
interface LoadingProgressProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function LoadingProgress({ steps, currentStep, className }: LoadingProgressProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <LoadingSpinner size="sm" />
        <span className="text-sm font-medium">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              index < currentStep && "text-green-600",
              index === currentStep && "text-primary font-medium",
              index > currentStep && "text-muted-foreground"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              index < currentStep && "bg-green-500",
              index === currentStep && "bg-primary animate-pulse",
              index > currentStep && "bg-muted-foreground"
            )} />
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}

// Inline loading states
export function InlineLoading({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </span>
  )
}

// Button loading state
interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}

export function LoadingButton({ isLoading, children, className }: LoadingButtonProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </span>
  )
}

// Agent-specific loading indicators
export function AgentLoadingIndicator({ agentName, task }: { agentName: string; task?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
      <Brain className="h-6 w-6 animate-pulse text-purple-500" />
      <div>
        <div className="font-medium">{agentName}</div>
        <div className="text-sm text-muted-foreground">
          {task || "Processing..."}
        </div>
      </div>
    </div>
  )
}