"use client";

import { useState } from "react";
import InstructorSidebar from "@/components/layout/InstructorSidebar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function InstructorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard requiredRole="instructor">
      <div className="min-h-screen bg-background flex">
        <InstructorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Mobile header with menu button */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground">AutoGradeX</span>
          </div>
        </div>
        
        <main className="flex-1 lg:ml-56 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 pb-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
