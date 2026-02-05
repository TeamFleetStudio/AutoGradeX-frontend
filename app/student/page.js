"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentDashboardStats, getAssignments, getSubmissions } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function StudentDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsResult, assignmentsResult, submissionsResult] = await Promise.all([
        getStudentDashboardStats(),
        getAssignments(),
        getSubmissions(),
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data || []);
      }
      if (submissionsResult.success) {
        setSubmissions(submissionsResult.data || []);
      }
    } catch (error) {
      logger.error("Failed to load dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = () => {
    const options = { month: "long", day: "numeric", year: "numeric" };
    return new Date().toLocaleDateString("en-US", options);
  };

  const defaultStats = {
    pendingAssignments: 0,
    averageScore: 0,
    completedAssignments: 0,
    totalGrades: 0,
  };

  const displayStats = stats || defaultStats;

  const renderAssignmentIcon = (icon) => {
    switch (icon) {
      case "code":
        return (
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        );
      case "math":
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "essay":
        return (
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Here&apos;s your academic progress overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm bg-card px-3 py-2 rounded-lg border border-border self-start">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
                <Skeleton className="h-8 w-12 sm:w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Pending Assignments */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">Due soon</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{displayStats.pendingAssignments}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            </div>

            {/* Average Score */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs text-green-500 dark:text-green-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  +2%
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{displayStats.averageScore}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Average</p>
            </div>

            {/* Graded Submissions */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">All time</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{displayStats.totalGrades}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Graded</p>
            </div>

            {/* Submitted Assignments */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">All time</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{displayStats.completedAssignments}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
            </div>
          </>
        )}
      </div>

      {/* Main Grid - Deadlines and GPA/Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Upcoming Deadlines - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h2>
            <Link href="/student/assignments" className="text-primary hover:text-primary/80 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border rounded-xl">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-xl border ${
                      assignment.isUrgent ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/20" : "border-border"
                    } flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-4">
                      {renderAssignmentIcon(assignment.icon)}
                      <div>
                        <h3 className="font-medium text-foreground">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.instructor} • {assignment.course}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${assignment.isUrgent ? "text-red-500 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                        {assignment.isUrgent && (
                          <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {assignment.dueDate}
                      </span>
                      {assignment.isUrgent ? (
                        <Link href={`/student/submit/${assignment.id}`}>
                          <Button size="sm">
                            Submit →
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/student/submit/${assignment.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No upcoming deadlines
              </p>
            )}
          </div>
        </div>

        {/* Right Column - GPA Card and Recent Results */}
        <div className="space-y-6">
          {/* Overall Average Score Card */}
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2D5A87] rounded-xl p-5 text-white">
            <p className="text-sm text-blue-200 mb-2">Overall Average</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-4xl font-bold">{displayStats.averageScore}</span>
                <span className="text-xl text-blue-200">%</span>
                <p className="text-sm text-blue-200 mt-1">
                  {displayStats.totalGrades > 0 
                    ? `Based on ${displayStats.totalGrades} graded submission${displayStats.totalGrades > 1 ? 's' : ''}`
                    : 'No grades yet'}
                </p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={displayStats.averageScore >= 70 ? "#4ADE80" : displayStats.averageScore >= 50 ? "#FBBF24" : "#F87171"}
                    strokeWidth="3"
                    strokeDasharray={`${(displayStats.averageScore / 100) * 97.5} 97.5`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {displayStats.averageScore >= 70 ? (
                    <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Recent Results</h3>
              <Link href="/student/grades" className="text-primary hover:text-primary/80 text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {submissions.filter(s => s.score !== null && s.score !== undefined).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No graded submissions yet</p>
                  ) : (
                    submissions.filter(s => s.score !== null && s.score !== undefined).slice(0, 5).map((submission) => {
                      // Score is stored as raw points (e.g., 45 out of 50)
                      const pointsEarned = submission.score;
                      const maxPoints = submission.total_points || 100;
                      // Calculate percentage for color coding
                      const scorePercentage = maxPoints > 0 ? (pointsEarned / maxPoints) * 100 : 0;
                      
                      return (
                      <div key={submission.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{submission.assignment_title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(submission.submitted_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            scorePercentage >= 90 ? "text-green-600 dark:text-green-400" :
                            scorePercentage >= 80 ? "text-blue-600 dark:text-blue-400" :
                            "text-amber-600 dark:text-amber-400"
                          }`}>
                            {pointsEarned}/{maxPoints}
                          </span>
                          <Link href={`/student/results/${submission.id}`}>
                            <button className="text-muted-foreground hover:text-primary">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </Link>
                        </div>
                      </div>
                    );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archive Section */}
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <div className="w-12 h-12 bg-muted rounded-xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h3 className="font-semibold text-foreground mb-1">Looking for older assignments?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Check the archive to view past terms and completed courses.<br />
          Your academic history is always available.
        </p>
        <Link href="/student/archive" className="text-primary hover:text-primary/80 font-medium text-sm">
          Go to Archive
        </Link>
      </div>
    </>
  );
}
