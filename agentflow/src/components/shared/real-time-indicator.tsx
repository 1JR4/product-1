"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Signal
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RealTimeIndicatorProps {
  isConnected: boolean
  lastUpdate?: Date
  updateCount?: number
  latency?: number
  retryCount?: number
  onReconnect?: () => void
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RealTimeIndicator({
  isConnected,
  lastUpdate,
  updateCount = 0,
  latency,
  retryCount = 0,
  onReconnect,
  showLabel = true,
  size = "md",
  className
}: RealTimeIndicatorProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("")

  useEffect(() => {
    if (!lastUpdate) return

    const updateTimer = () => {
      const now = Date.now()
      const diff = now - lastUpdate.getTime()
      
      if (diff < 1000) {
        setTimeSinceUpdate("just now")
      } else if (diff < 60000) {
        setTimeSinceUpdate(`${Math.floor(diff / 1000)}s ago`)
      } else if (diff < 3600000) {
        setTimeSinceUpdate(`${Math.floor(diff / 60000)}m ago`)
      } else {
        setTimeSinceUpdate(`${Math.floor(diff / 3600000)}h ago`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [lastUpdate])

  const getConnectionStatus = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        color: "text-red-500",
        bgColor: "bg-red-100 border-red-200",
        label: "Disconnected",
        pulse: false
      }
    }

    if (retryCount > 0) {
      return {
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-100 border-yellow-200",
        label: "Reconnecting",
        pulse: true
      }
    }

    if (latency && latency > 1000) {
      return {
        icon: Clock,
        color: "text-orange-500",
        bgColor: "bg-orange-100 border-orange-200",
        label: "Slow Connection",
        pulse: false
      }
    }

    return {
      icon: Wifi,
      color: "text-green-500",
      bgColor: "bg-green-100 border-green-200",
      label: "Connected",
      pulse: false
    }
  }

  const status = getConnectionStatus()
  const Icon = status.icon

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

  const getLatencyColor = () => {
    if (!latency) return "text-muted-foreground"
    if (latency < 100) return "text-green-600"
    if (latency < 500) return "text-yellow-600"
    if (latency < 1000) return "text-orange-600"
    return "text-red-600"
  }

  const indicator = (
    <Badge 
      variant="outline" 
      className={cn(
        status.bgColor,
        status.color,
        getBadgeSize(),
        "font-medium transition-all duration-200 cursor-pointer",
        status.pulse && "animate-pulse",
        className
      )}
      onClick={!isConnected && onReconnect ? onReconnect : undefined}
    >
      <Icon 
        className={cn(
          getIconSize(),
          showLabel && "mr-1",
          status.pulse && "animate-pulse"
        )} 
      />
      {showLabel && status.label}
      {retryCount > 0 && showLabel && ` (${retryCount})`}
    </Badge>
  )

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">Connection Status</div>
      <div className="space-y-1 text-sm">
        <div>Status: {status.label}</div>
        {latency && (
          <div className={getLatencyColor()}>
            Latency: {latency}ms
          </div>
        )}
        {lastUpdate && (
          <div>Last update: {timeSinceUpdate}</div>
        )}
        {updateCount > 0 && (
          <div>Updates received: {updateCount.toLocaleString()}</div>
        )}
        {retryCount > 0 && (
          <div className="text-yellow-600">
            Retry attempts: {retryCount}
          </div>
        )}
      </div>
      {!isConnected && onReconnect && (
        <div className="text-xs text-muted-foreground border-t pt-1">
          Click to reconnect
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Simplified version for headers/navigation
interface ConnectionStatusProps {
  isConnected: boolean
  showPulse?: boolean
  className?: string
}

export function ConnectionStatus({ isConnected, showPulse = true, className }: ConnectionStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          isConnected ? "bg-green-500" : "bg-red-500",
          isConnected && showPulse && "animate-pulse"
        )}
      />
      <span className="text-sm text-muted-foreground">
        {isConnected ? "Live" : "Offline"}
      </span>
    </div>
  )
}

// Real-time activity indicator with signal strength
interface ActivityIndicatorProps {
  activity: "low" | "medium" | "high"
  isConnected: boolean
  className?: string
}

export function ActivityIndicator({ activity, isConnected, className }: ActivityIndicatorProps) {
  const getSignalBars = () => {
    const baseClasses = "w-1 bg-muted rounded-full transition-all duration-200"
    const activeClasses = isConnected ? "bg-green-500" : "bg-gray-400"
    
    switch (activity) {
      case "low":
        return [
          `${baseClasses} h-2 ${activeClasses}`,
          `${baseClasses} h-3`,
          `${baseClasses} h-4`
        ]
      case "medium":
        return [
          `${baseClasses} h-2 ${activeClasses}`,
          `${baseClasses} h-3 ${activeClasses}`,
          `${baseClasses} h-4`
        ]
      case "high":
        return [
          `${baseClasses} h-2 ${activeClasses}`,
          `${baseClasses} h-3 ${activeClasses}`,
          `${baseClasses} h-4 ${activeClasses}`
        ]
    }
  }

  const bars = getSignalBars()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-end gap-0.5", className)}>
            {bars.map((barClass, index) => (
              <div key={index} className={barClass} />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            Activity: {activity}
            <br />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact real-time status for status bars
interface RealTimeStatusProps {
  isConnected: boolean
  activeAgents: number
  totalUpdates: number
  className?: string
}

export function RealTimeStatus({ 
  isConnected, 
  activeAgents, 
  totalUpdates, 
  className 
}: RealTimeStatusProps) {
  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <ConnectionStatus isConnected={isConnected} showPulse={isConnected} />
      <div className="flex items-center gap-1 text-muted-foreground">
        <Signal className="h-3 w-3" />
        <span>{activeAgents} active</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        <span>{totalUpdates.toLocaleString()}</span>
      </div>
    </div>
  )
}