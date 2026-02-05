"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getInstructorDashboardStats, getAssignments, getSubmissions } from "@/lib/api-client";
import logger from "@/lib/logger";

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * Get a consistent color for a name
 * @param {string} name - Name to hash
 * @returns {string} Color class
 */
function getColorForName(name) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function InstructorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsResult, assignmentsResult, submissionsResult] = await Promise.all([
        getInstructorDashboardStats(),
        getAssignments(),
        getSubmissions({ status: 'submitted' }),
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data || []);
      }
      if (submissionsResult.success) {
        const submissions = (submissionsResult.data || []).map(sub => ({
          id: sub.id,
          studentName: sub.student_name,
          studentInitials: getInitials(sub.student_name),
          avatarColor: getColorForName(sub.student_name),
          assignment: sub.assignment_title,
          submittedTime: sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Unknown',
          status: sub.status,
          content: sub.content,
          assignment_id: sub.assignment_id,
          score: sub.score,
          feedback: sub.feedback,
        }));
        setPendingSubmissions(submissions);
      }
    } catch (error) {
      logger.error("Failed to load dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = () => {
    const options = { weekday: "long", month: "short", day: "numeric" };
    return new Date().toLocaleDateString("en-US", options);
  };

  const defaultStats = {
    totalAssignments: 0,
    pendingSubmissions: 0,
    gradedThisWeek: 0,
  };

  const displayStats = stats ? {
    totalAssignments: stats.totalAssignments || 0,
    pendingSubmissions: stats.pendingGrading || stats.pendingSubmissions || 0,
    gradedThisWeek: stats.gradedCount || stats.gradedThisWeek || 0,
    averageScore: stats.averageScore || 0,
  } : defaultStats;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate()}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 sm:p-6">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-10 w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Total Assignments */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Active
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{displayStats.totalAssignments}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Assignments</p>
            </div>

            {/* Pending Submissions */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-amber-500 dark:text-amber-400">Needs attention</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{displayStats.pendingSubmissions}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Awaiting Grade</p>
            </div>

            {/* Graded This Week */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">+15% vs last week</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{displayStats.gradedThisWeek}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Graded This Week</p>
            </div>
          </>
        )}
      </div>

      {/* Two Column Layout: Submissions Awaiting Grade & My Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
        {/* Submissions Awaiting Grade Table */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Submissions Awaiting Grade</h2>
            <Link href="/instructor/submissions" className="text-sm text-primary hover:text-primary/80 font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Student Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Assignment</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Submitted</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </td>
                        <td className="px-6 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-3"><Skeleton className="h-7 w-14" /></td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {pendingSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-border/50 last:border-b-0">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${submission.avatarColor} flex items-center justify-center`}>
                              <span className="text-white text-xs font-medium">{submission.studentInitials}</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">{submission.studentName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-muted-foreground">{submission.assignment}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-muted-foreground">{submission.submittedTime}</span>
                        </td>
                        <td className="px-6 py-3">
                          <Link href={`/instructor/grade/${submission.id}`}>
                            <Button size="sm" className="h-7 px-3 text-xs">
                              Grade
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Assignments */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">My Assignments</h2>
            <button className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-6 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-6 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-3"><Skeleton className="h-6 w-14" /></td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                        <td className="px-6 py-3">
                          <Link href={`/instructor/assignments/${assignment.id}`} className="block">
                            <span className="text-sm font-medium text-foreground hover:text-primary block">{assignment.title}</span>
                            <span className="text-xs text-muted-foreground">{assignment.course}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-muted-foreground">{assignment.dueDate}</span>
                        </td>
                        <td className="px-6 py-3">
                          <Badge
                            className={
                              assignment.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 border-0"
                                : assignment.status === "draft"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-0"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0"
                            }
                          >
                            {assignment.status === "active" ? "Active" : assignment.status === "draft" ? "Draft" : "Closed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        © 2026 AutoGradeX. All rights reserved.
      </div>
    </>
  );
}
