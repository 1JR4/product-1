"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Folder,
  Home,
  Settings,
  Users,
  Workflow,
  Activity
} from "lucide-react"
import { SimpleThemeToggle } from "@/components/theme-toggle"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Folder,
  },
]

const bottomNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Workflow className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-semibold text-lg">AgentFlow</h1>
          <p className="text-xs text-muted-foreground">AI Project Manager</p>
        </div>
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isActive && "bg-secondary text-secondary-foreground"
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          )
        })}
      </nav>

      <Separator />

      {/* Status Indicator */}
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
          <Activity className="h-4 w-4 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">System Status</p>
            <p className="text-xs text-muted-foreground">All agents active</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Online
          </Badge>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 space-y-2">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          )
        })}
        
        {/* Theme Toggle */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <SimpleThemeToggle />
        </div>
      </div>
    </div>
  )
}