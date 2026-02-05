"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { handleGitHubCallback } from "@/lib/oauth-utils";
import logger from "@/lib/logger";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const hasProcessed = useRef(false); // Prevent double execution

  useEffect(() => {
    async function processCallback() {
      // Prevent double execution (React Strict Mode calls useEffect twice)
      if (hasProcessed.current) return;
      hasProcessed.current = true;
      
      try {
        // Get authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");

        if (error) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: error === "access_denied" 
              ? "You cancelled the login." 
              : `Error: ${error}`,
          });
          setIsProcessing(false);
          setTimeout(() => router.push("/signup"), 2000);
          return;
        }

        if (!code) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "No authorization code received.",
          });
          setIsProcessing(false);
          setTimeout(() => router.push("/signup"), 2000);
          return;
        }

        // Get the pending role from localStorage (set before OAuth redirect)
        const pendingRole = localStorage.getItem("oauth_pending_role") || "student";
        localStorage.removeItem("oauth_pending_role"); // Clean up

        // Exchange code for token
        const result = await handleGitHubCallback(code, pendingRole);

        if (!result.success) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: result.error || "Could not authenticate with GitHub.",
          });
          setIsProcessing(false);
          setTimeout(() => router.push("/signup"), 2000);
          return;
        }

        // Store authentication data
        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));

        toast({
          title: "Success!",
          description: result.data.isNew 
            ? "Account created successfully!" 
            : "Welcome back!",
        });

        // Redirect to appropriate dashboard
        const dashboard = result.data.user.role === "instructor" 
          ? "/instructor" 
          : "/student";

        setTimeout(() => router.push(dashboard), 500);
      } catch (error) {
        logger.error("OAuth callback error", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred.",
        });
        setIsProcessing(false);
        setTimeout(() => router.push("/signup"), 2000);
      }
    }

    processCallback();
  }, [router, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-800 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          Signing you in
        </h2>
        <p className="text-center text-slate-600 mb-6">
          {isProcessing ? "Processing your GitHub sign-in..." : "Redirecting..."}
        </p>

        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>
      </div>
    </div>
  );
}
