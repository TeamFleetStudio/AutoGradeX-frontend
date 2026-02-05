"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignment, getSubmissions } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function AssignmentSubmissionsPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentResult, submissionsResult] = await Promise.all([
        getAssignment(assignmentId),
        getSubmissions({ assignment_id: assignmentId })
      ]);
      
      if (assignmentResult.success && assignmentResult.data) {
        setAssignment(assignmentResult.data);
      } else {
        setError("Assignment not found");
      }
      
      if (submissionsResult.success) {
        setSubmissions(submissionsResult.data || []);
      }
    } catch (error) {
      logger.error("Failed to load data", error);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">Awaiting Grade</Badge>;
      case "graded":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">Graded</Badge>;
      case "in_review":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">In Review</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = (sub.student_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = submissions.filter(s => s.status === "pending" || s.status === "submitted").length;
  const gradedCount = submissions.filter(s => s.status === "graded").length;

  return (
    <div className="p-8">
      {/* Go Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Go Back
        </button>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/instructor/assignments">
              <Button>Back to Assignments</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Submissions for {assignment?.title}</h1>
                <p className="text-muted-foreground mt-1">{submissions.length} total submissions</p>
              </div>
              <Link href={`/instructor/assignments/${assignmentId}`}>
                <Button variant="outline">Back to Assignment</Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{submissions.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Submissions</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending Review</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{gradedCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Graded</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    type="text"
                    placeholder="Search by student name..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Awaiting Grade</option>
                  <option value="graded">Graded</option>
                  <option value="in_review">In Review</option>
                </select>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-foreground mb-1">No submissions found</h3>
                  <p className="text-muted-foreground">No submissions match your current filters.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {(submission.student_name || "S").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{submission.student_name || "Student"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(submission.submitted_at)}</td>
                        <td className="px-6 py-4">{getStatusBadge(submission.status)}</td>
                        <td className="px-6 py-4">
                          {submission.score !== null && submission.score !== undefined ? (
                            <span className="font-medium text-foreground">{submission.score}%</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/instructor/grade/${submission.id}`}>
                            <Button size="sm" variant={(submission.status === "pending" || submission.status === "submitted") ? "default" : "outline"}>
                              {(submission.status === "pending" || submission.status === "submitted") ? "Grade" : "Review"}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
    </div>
  );
}
