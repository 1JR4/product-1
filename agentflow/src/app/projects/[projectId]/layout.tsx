"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  LayoutDashboard,
  Users,
  Kanban,
  TrendingUp,
  Settings,
  MoreVertical
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

// Mock project data - replace with Firebase integration
const mockProject = {
  id: "1",
  name: "E-commerce Platform",
  status: "active"
};

const navigationItems = [
  {
    href: "",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Project summary and quick stats"
  },
  {
    href: "/agents",
    label: "Agents",
    icon: Users,
    description: "Manage AI agents"
  },
  {
    href: "/features",
    label: "Features",
    icon: Kanban,
    description: "Feature development board"
  },
  {
    href: "/progress",
    label: "Progress",
    icon: TrendingUp,
    description: "Progress tracking and analytics"
  }
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  
  // Get current page by comparing pathname
  const getCurrentPage = () => {
    const basePath = `/projects/${projectId}`;
    
    if (pathname === basePath) return "";
    if (pathname.endsWith("/agents")) return "/agents";
    if (pathname.endsWith("/features")) return "/features";
    if (pathname.endsWith("/progress")) return "/progress";
    return "";
  };
  
  const currentPage = getCurrentPage();

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="p-4 space-y-4">
          {/* Back Navigation and Project Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{mockProject.name}</h1>
                <Badge 
                  variant={mockProject.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {mockProject.status}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {navigationItems.map((item) => {
              const href = `/projects/${projectId}${item.href}`;
              const isActive = currentPage === item.href;
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={`h-9 gap-2 ${isActive ? "bg-muted" : ""}`}
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}