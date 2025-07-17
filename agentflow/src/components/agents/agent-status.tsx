"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Circle, 
  AlertTriangle, 
  Clock,
  Zap,
  Wifi,
  WifiOff 
} from "lucide-react"
import { Agent, AgentHeartbeat } from "../../../lib/types"
import { cn } from "@/lib/utils"

interface AgentStatusProps {
  agent: Agent
  lastHeartbeat?: AgentHeartbeat
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AgentStatus({ 
  agent, 
  lastHeartbeat, 
  showLabel = true, 
  size = "md",
  className 
}: AgentStatusProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check if agent is online based on last heartbeat
    if (lastHeartbeat) {
      const timeDiff = Date.now() - lastHeartbeat.timestamp.getTime()
      setIsOnline(timeDiff < 30000) // 30 seconds timeout
    } else {
      setIsOnline(false)
    }
  }, [lastHeartbeat])

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: "text-gray-500",
        bgColor: "bg-gray-100",
        label: "Offline",
        pulse: false
      }
    }

    switch (agent.status) {
      case "idle":
        return {
          icon: Circle,
          color: "text-green-500",
          bgColor: "bg-green-100",
          label: "Idle",
          pulse: false
        }
      case "active":
        return {
          icon: Zap,
          color: "text-blue-500",
          bgColor: "bg-blue-100",
          label: "Active",
          pulse: true
        }
      case "busy":
        return {
          icon: Clock,
          color: "text-yellow-500",
          bgColor: "bg-yellow-100",
          label: "Busy",
          pulse: true
        }
      case "error":
        return {
          icon: AlertTriangle,
          color: "text-red-500",
          bgColor: "bg-red-100",
          label: "Error",
          pulse: false
        }
      case "offline":
        return {
          icon: WifiOff,
          color: "text-gray-500",
          bgColor: "bg-gray-100",
          label: "Offline",
          pulse: false
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const getIconSize = () => {
    switch (size) {
      case "sm": return "h-3 w-3"
      case "md": return "h-4 w-4"
      case "lg": return "h-5 w-5"
    }
  }

  const getBadgeSize = () => {
    switch (size) {
      case "sm": return "text-xs px-2 py-0.5"
      case "md": return "text-sm px-2 py-1"
      case "lg": return "text-base px-3 py-1"
    }
  }

  const statusContent = (
    <Badge 
      variant="secondary" 
      className={cn(
        config.bgColor,
        config.color,
        getBadgeSize(),
        "font-medium transition-all duration-200",
        config.pulse && "animate-pulse",
        className
      )}
    >
      <Icon 
        className={cn(
          getIconSize(),
          showLabel && "mr-1",
          config.pulse && "animate-pulse"
        )} 
      />
      {showLabel && config.label}
    </Badge>
  )

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium">{agent.name}</div>
      <div className="text-sm">Status: {config.label}</div>
      {agent.currentTask && (
        <div className="text-sm">Task: {agent.currentTask}</div>
      )}
      {lastHeartbeat && (
        <div className="text-xs text-muted-foreground">
          Last seen: {new Date(lastHeartbeat.timestamp).toLocaleTimeString()}
        </div>
      )}
      {lastHeartbeat?.systemStats && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>CPU: {lastHeartbeat.systemStats.cpu}%</div>
          <div>Memory: {lastHeartbeat.systemStats.memory}%</div>
          <div>Tokens: {lastHeartbeat.systemStats.activeTokens}</div>
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {statusContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Real-time status indicator for multiple agents
interface AgentStatusListProps {
  agents: Agent[]
  heartbeats?: Record<string, AgentHeartbeat>
  className?: string
}

export function AgentStatusList({ agents, heartbeats = {}, className }: AgentStatusListProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {agents.map((agent) => (
        <AgentStatus
          key={agent.id}
          agent={agent}
          lastHeartbeat={heartbeats[agent.id]}
          size="sm"
          showLabel={false}
        />
      ))}
    </div>
  )
}