"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * AuthGuard component that checks authentication status on protected routes.
 * Redirects to signin page if no valid auth token is found.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @param {string} [props.requiredRole] - Optional role requirement ('student' or 'instructor')
 */
export default function AuthGuard({ children, requiredRole }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      // No authentication found, redirect to signin
      router.replace("/signin");
      return;
    }

    try {
      const user = JSON.parse(userData);

      // Check role if required
      if (requiredRole && user.role !== requiredRole) {
        // Wrong role, redirect to correct dashboard
        router.replace(user.role === "instructor" ? "/instructor" : "/student");
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      // Invalid user data, clear and redirect
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      router.replace("/signin");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-2 mt-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
