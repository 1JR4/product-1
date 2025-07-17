"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Brain,
  Cpu,
  MemoryStick,
  Clock,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Square,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Agent, AgentHeartbeat, Task } from "../../../lib/types"
import { AgentStatus } from "./agent-status"
import { cn } from "@/lib/utils"

interface AgentCardProps {
  agent: Agent
  heartbeat?: AgentHeartbeat
  currentTasks?: Task[]
  onStart?: () => void
  onPause?: () => void
  onStop?: () => void
  onConfigure?: () => void
  onMessage?: () => void
  className?: string
}

export function AgentCard({ 
  agent, 
  heartbeat,
  currentTasks = [],
  onStart,
  onPause,
  onStop,
  onConfigure,
  onMessage,
  className 
}: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getAgentTypeConfig = () => {
    switch (agent.type) {
      case "opus":
        return {
          name: "Claude Opus",
          color: "bg-purple-100 text-purple-700",
          description: "Most capable model"
        }
      case "sonnet":
        return {
          name: "Claude Sonnet",
          color: "bg-blue-100 text-blue-700",
          description: "Balanced performance"
        }
      case "haiku":
        return {
          name: "Claude Haiku",
          color: "bg-green-100 text-green-700",
          description: "Fast and efficient"
        }
    }
  }

  const getRoleConfig = () => {
    const roleMap = {
      "product-manager": { name: "Product Manager", icon: "📋", color: "bg-orange-100 text-orange-700" },
      "project-manager": { name: "Project Manager", icon: "📊", color: "bg-blue-100 text-blue-700" },
      "architect": { name: "Architect", icon: "🏗️", color: "bg-purple-100 text-purple-700" },
      "senior-dev": { name: "Senior Developer", icon: "👨‍💻", color: "bg-green-100 text-green-700" },
      "frontend-dev": { name: "Frontend Developer", icon: "🎨", color: "bg-pink-100 text-pink-700" },
      "backend-dev": { name: "Backend Developer", icon: "⚙️", color: "bg-gray-100 text-gray-700" },
      "qa-lead": { name: "QA Lead", icon: "🎯", color: "bg-yellow-100 text-yellow-700" },
      "tester": { name: "Tester", icon: "🧪", color: "bg-indigo-100 text-indigo-700" },
      "devops": { name: "DevOps", icon: "🚀", color: "bg-red-100 text-red-700" }
    }
    return roleMap[agent.role] || { name: agent.role, icon: "🤖", color: "bg-gray-100 text-gray-700" }
  }

  const typeConfig = getAgentTypeConfig()
  const roleConfig = getRoleConfig()

  const getInitials = () => {
    return agent.name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const canStart = agent.status === "idle" || agent.status === "offline"
  const canPause = agent.status === "active" || agent.status === "busy"
  const canStop = agent.status !== "offline"

  return (
    <Card className={cn("hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={cn("text-lg font-semibold", roleConfig.color)}>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {agent.name}
                <span className="text-lg">{roleConfig.icon}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={roleConfig.color}>
                  {roleConfig.name}
                </Badge>
                <Badge variant="outline" className={typeConfig.color}>
                  {typeConfig.name}
                </Badge>
              </div>
            </div>
          </div>
          <AgentStatus agent={agent} lastHeartbeat={heartbeat} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Task */}
        {agent.currentTask && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Current Task
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
              {agent.currentTask}
            </div>
          </div>
        )}

        {/* System Stats */}
        {heartbeat?.systemStats && (
          <div className="space-y-3">
            <div className="text-sm font-medium">System Performance</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU
                </div>
                <span>{heartbeat.systemStats.cpu}%</span>
              </div>
              <Progress value={heartbeat.systemStats.cpu} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Memory
                </div>
                <span>{heartbeat.systemStats.memory}%</span>
              </div>
              <Progress value={heartbeat.systemStats.memory} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Active Tokens
                </div>
                <span>{heartbeat.systemStats.activeTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between p-0 h-auto text-sm font-medium"
          >
            Capabilities ({agent.capabilities?.length || 0})
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {isExpanded && (
            <div className="flex flex-wrap gap-1">
              {agent.capabilities?.map((capability) => (
                <Badge key={capability} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Hierarchy Info */}
        {(agent.hierarchy?.parentId || (agent.hierarchy?.childIds && agent.hierarchy.childIds.length > 0)) && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Hierarchy
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {agent.hierarchy?.parentId && (
                <div>Reports to: Agent {agent.hierarchy.parentId}</div>
              )}
              {agent.hierarchy?.childIds && agent.hierarchy.childIds.length > 0 && (
                <div>Manages: {agent.hierarchy.childIds.length} agents</div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {canStart && onStart && (
            <Button size="sm" onClick={onStart} className="flex-1 min-w-0">
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {canPause && onPause && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {canStop && onStop && (
            <Button size="sm" variant="outline" onClick={onStop}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
          {onMessage && (
            <Button size="sm" variant="outline" onClick={onMessage}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
          )}
          {onConfigure && (
            <Button size="sm" variant="outline" onClick={onConfigure}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Warning States */}
        {agent.status === "error" && (
          <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4" />
            Agent encountered an error and needs attention
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for lists
interface AgentCardCompactProps {
  agent: Agent
  heartbeat?: AgentHeartbeat
  onClick?: () => void
  className?: string
}

export function AgentCardCompact({ agent, heartbeat, onClick, className }: AgentCardCompactProps) {
  const roleConfig = {
    "product-manager": "📋",
    "project-manager": "📊", 
    "architect": "🏗️",
    "senior-dev": "👨‍💻",
    "frontend-dev": "🎨",
    "backend-dev": "⚙️",
    "qa-lead": "🎯",
    "tester": "🧪",
    "devops": "🚀"
  }[agent.role] || "🤖"

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{roleConfig}</div>
            <div>
              <div className="font-medium">{agent.name}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {agent.role.replace("-", " ")}
              </div>
            </div>
          </div>
          <AgentStatus agent={agent} lastHeartbeat={heartbeat} size="sm" showLabel={false} />
        </div>
      </CardContent>
    </Card>
  )
}