"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAssignment, getSubmissions, updateAssignment } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function AssignmentDetailPage({ params }) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const result = await updateAssignment(assignmentId, { status: 'active' });
      if (result.success) {
        setAssignment({ ...assignment, status: 'active' });
        toast({ title: 'Published!', description: 'Students can now access this quiz.' });
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to publish', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to publish', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
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
      logger.error("Failed to load assignment", error);
      setError("Failed to load assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case "draft":
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Draft</Badge>;
      case "closed":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const pendingCount = submissions.filter(s => s.status === "pending" || s.status === "submitted").length;
  const gradedCount = submissions.filter(s => s.status === "graded").length;
  const avgScore = gradedCount > 0 
    ? Math.round(submissions.filter(s => s.score !== null).reduce((sum, s) => sum + (s.score || 0), 0) / gradedCount)
    : 0;

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
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Assignment Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/instructor/assignments">
              <Button>Back to Assignments</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">{assignment?.title}</h1>
                  {getStatusBadge(assignment?.status)}
                  {assignment?.assignment_type === 'quiz' && (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Quiz
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {assignment?.course_code || "No course"} • Due: {formatDate(assignment?.due_date)}
                </p>
              </div>
              <div className="flex gap-3">
                {assignment?.status === 'draft' && (
                  <Button 
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPublishing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Publish
                      </>
                    )}
                  </Button>
                )}
                {assignment?.assignment_type === 'quiz' && (
                  <Link href={`/instructor/assignments/${assignmentId}/quiz`}>
                    <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Questions
                    </Button>
                  </Link>
                )}
                <Link href={`/instructor/assignments/${assignmentId}/edit`}>
                  <Button variant="outline">Edit Assignment</Button>
                </Link>
                <Link href={`/instructor/assignments/${assignmentId}/submissions`}>
                  <Button>View Submissions</Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{avgScore}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>

            {/* Assignment Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 sm:p-6">
                <h2 className="font-semibold text-foreground mb-4">Assignment Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-muted-foreground">{assignment?.description || "No description provided."}</p>
                  </div>

                  {assignment?.reference_answer && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Reference Answer</h3>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-muted-foreground font-sans text-sm">
                          {assignment.reference_answer}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Points</h3>
                      <p className="text-muted-foreground">{assignment?.total_points || 100} points</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Max Resubmissions</h3>
                      <p className="text-muted-foreground">{assignment?.max_resubmissions || 2}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Submissions */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Recent Submissions</h2>
                  <Link href={`/instructor/assignments/${assignmentId}/submissions`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View All
                  </Link>
                </div>

                {submissions.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.slice(0, 5).map((sub) => (
                      <Link 
                        key={sub.id} 
                        href={`/instructor/grade/${sub.id}`}
                        className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{sub.student_name || "Student"}</span>
                          <Badge className={sub.status === "graded" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} variant="secondary">
                            {sub.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "N/A"}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </div>
  );
}
