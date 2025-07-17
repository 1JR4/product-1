"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  FolderOpen,
  Users,
  Zap,
  Plus,
  Search,
  FileText,
  Settings,
  RefreshCw,
  Inbox,
  Target,
  Calendar,
  BookOpen,
  Coffee,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  variant?: "projects" | "agents" | "features" | "tasks" | "search" | "generic"
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  variant = "generic", 
  title,
  description,
  action,
  secondaryAction,
  className 
}: EmptyStateProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case "projects":
        return {
          icon: FolderOpen,
          defaultTitle: "No projects yet",
          defaultDescription: "Create your first project to get started with AgentFlow. Projects help organize your AI agents and track their progress.",
          defaultAction: { label: "Create Project", variant: "default" as const },
          iconColor: "text-blue-500",
          bgColor: "bg-blue-50"
        }
      case "agents":
        return {
          icon: Users,
          defaultTitle: "No agents assigned",
          defaultDescription: "Add AI agents to this project to start automating your development workflow. Different agent types excel at different tasks.",
          defaultAction: { label: "Add Agent", variant: "default" as const },
          iconColor: "text-purple-500",
          bgColor: "bg-purple-50"
        }
      case "features":
        return {
          icon: Target,
          defaultTitle: "No features defined",
          defaultDescription: "Break down your project into features to track progress and assign work to your AI agents.",
          defaultAction: { label: "Add Feature", variant: "default" as const },
          iconColor: "text-green-500",
          bgColor: "bg-green-50"
        }
      case "tasks":
        return {
          icon: FileText,
          defaultTitle: "No tasks created",
          defaultDescription: "Tasks help break down features into manageable chunks that can be assigned to specific agents.",
          defaultAction: { label: "Create Task", variant: "default" as const },
          iconColor: "text-orange-500",
          bgColor: "bg-orange-50"
        }
      case "search":
        return {
          icon: Search,
          defaultTitle: "No results found",
          defaultDescription: "Try adjusting your search criteria or check your spelling. You can also browse all items below.",
          defaultAction: { label: "Clear Search", variant: "outline" as const },
          iconColor: "text-gray-500",
          bgColor: "bg-gray-50"
        }
      default:
        return {
          icon: Inbox,
          defaultTitle: "Nothing here yet",
          defaultDescription: "This section is empty. Check back later or try refreshing the page.",
          defaultAction: { label: "Refresh", variant: "outline" as const },
          iconColor: "text-gray-500",
          bgColor: "bg-gray-50"
        }
    }
  }

  const config = getVariantConfig()
  const Icon = config.icon

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full mb-4",
          config.bgColor
        )}>
          <Icon className={cn("w-8 h-8", config.iconColor)} />
        </div>
        
        <h3 className="text-lg font-medium mb-2">
          {title || config.defaultTitle}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md">
          {description || config.defaultDescription}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || config.defaultAction.variant}
            >
              <Plus className="w-4 h-4 mr-2" />
              {action.label || config.defaultAction.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact empty state for smaller areas
interface EmptyStateCompactProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyStateCompact({ 
  icon: IconComponent = Inbox,
  title, 
  action,
  className 
}: EmptyStateCompactProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-lg",
      className
    )}>
      <IconComponent className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{title}</p>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Specialized empty states for specific contexts
export function EmptyProjectList({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <EmptyState
      variant="projects"
      action={{
        label: "Create Your First Project",
        onClick: onCreateProject
      }}
      secondaryAction={{
        label: "Import Project",
        onClick: () => console.log("Import clicked")
      }}
    />
  )
}

export function EmptyAgentList({ onAddAgent }: { onAddAgent: () => void }) {
  return (
    <EmptyState
      variant="agents"
      title="Ready to add AI agents?"
      description="Choose from different agent types like Product Managers, Developers, or QA specialists. Each brings unique capabilities to your project."
      action={{
        label: "Add First Agent",
        onClick: onAddAgent
      }}
    />
  )
}

export function EmptyFeatureBoard({ onCreateFeature }: { onCreateFeature: () => void }) {
  return (
    <EmptyState
      variant="features"
      title="Start building features"
      description="Features represent the main functionality you want to build. Break them down into tasks that your agents can work on."
      action={{
        label: "Create Feature",
        onClick: onCreateFeature
      }}
    />
  )
}

export function EmptySearchResults({ 
  query, 
  onClearSearch 
}: { 
  query: string
  onClearSearch: () => void 
}) {
  return (
    <EmptyState
      variant="search"
      title={`No results for "${query}"`}
      description="We couldn't find anything matching your search. Try different keywords or check your spelling."
      action={{
        label: "Clear Search",
        onClick: onClearSearch,
        variant: "outline"
      }}
    />
  )
}

// Loading state placeholder
export function EmptyStateLoading() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 animate-pulse">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
        <h3 className="text-lg font-medium mb-2">Loading...</h3>
        <p className="text-muted-foreground">Fetching your data</p>
      </CardContent>
    </Card>
  )
}

// Error state
interface EmptyStateErrorProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function EmptyStateError({ 
  title = "Something went wrong",
  description = "We encountered an error while loading your data. Please try again.",
  onRetry,
  className 
}: EmptyStateErrorProps) {
  return (
    <Card className={cn("border-dashed border-red-200", className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-red-900">{title}</h3>
        <p className="text-red-700 mb-6 max-w-md">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Fun empty states for better UX
export function EmptyStateWithIllustration({ 
  variant,
  children 
}: { 
  variant: "coffee" | "celebration" | "thinking"
  children: React.ReactNode 
}) {
  const getIllustration = () => {
    switch (variant) {
      case "coffee":
        return <Coffee className="w-12 h-12 text-amber-500" />
      case "celebration":
        return <span className="text-4xl">🎉</span>
      case "thinking":
        return <span className="text-4xl">🤔</span>
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          {getIllustration()}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}