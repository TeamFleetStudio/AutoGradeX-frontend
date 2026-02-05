"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [assignmentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentResult, submissionsResult] = await Promise.all([
        getAssignment(assignmentId),
        getSubmissions()
      ]);
      
      if (assignmentResult.success) {
        setAssignment(assignmentResult.data);
      } else {
        setError("Failed to load assignment");
        return;
      }
      
      if (submissionsResult.success) {
        // Filter submissions for this assignment and current user
        const mySubmissions = (submissionsResult.data || []).filter(
          s => s.assignment_id === assignmentId
        );
        setSubmissions(mySubmissions);
      }
    } catch (error) {
      logger.error("Failed to load data", error);
      setError("Failed to load assignment data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
      case "graded":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Graded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canResubmit = () => {
    if (!assignment) return false;
    const maxResubmissions = assignment.max_resubmissions || 0;
    return submissions.length < maxResubmissions + 1;
  };

  return (
    <>
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
            <Skeleton className="h-8 w-64" />
            <div className="bg-card rounded-xl border border-border p-6">
              <Skeleton className="h-24 w-full mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Assignment</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/student/assignments">
              <Button>Back to Assignments</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">{assignment?.title}</h1>
                <p className="text-muted-foreground">
                  {assignment?.course_code} • Due {formatDate(assignment?.due_date)}
                </p>
              </div>
              <div className="flex gap-3">
                {canResubmit() && (
                  <Link href={`/student/submit/${assignmentId}`}>
                    <Button>
                      {submissions.length > 0 ? "Resubmit" : "Submit"}
                    </Button>
                  </Link>
                )}
                <Link href="/student/assignments">
                  <Button variant="outline">Back</Button>
                </Link>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Assignment Description</h2>
              <p className="text-muted-foreground mb-4">{assignment?.description || "No description provided."}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Points</p>
                  <p className="font-medium text-foreground">{assignment?.total_points || 100}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Submissions</p>
                  <p className="font-medium text-foreground">{submissions.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Resubmissions</p>
                  <p className="font-medium text-foreground">{assignment?.max_resubmissions || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
                  <p className="font-medium text-foreground">
                    {Math.max(0, (assignment?.max_resubmissions || 0) + 1 - submissions.length)}
                  </p>
                </div>
              </div>
            </div>

            {/* Submissions History */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Submission History</h2>
              </div>
              
              {submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-foreground mb-1">No submissions yet</h3>
                  <p className="text-muted-foreground mb-4">Submit your work to see it here.</p>
                  <Link href={`/student/submit/${assignmentId}`}>
                    <Button>Submit Now</Button>
                  </Link>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Attempt</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {submissions.map((submission, index) => (
                      <tr key={submission.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 font-medium text-foreground">
                          Attempt #{index + 1}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {formatDate(submission.submitted_at)}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(submission.status)}</td>
                        <td className="px-6 py-4">
                          {submission.score !== null && submission.score !== undefined ? (
                            <span className="font-medium text-foreground">{submission.score}%</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/student/results/${submission.id}`}>
                            <Button size="sm" variant="outline">View Result</Button>
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
    </>
  );
}
