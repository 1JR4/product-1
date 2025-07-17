import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/navigation/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

// Firebase services are available for use in components via:
// import { auth, db, realtimeDb, storage } from "@/lib/firebase";

export const metadata: Metadata = {
  title: "AgentFlow - Multi-Agent Development Orchestrator",
  description: "AI-powered project management and agent coordination platform for autonomous software development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-auto">
              <div className="min-h-full">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}