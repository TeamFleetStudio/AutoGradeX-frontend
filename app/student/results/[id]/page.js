"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubmission } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function ResultPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResult();
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [submissionId]);

  const loadResult = async () => {
    setIsLoading(true);
    try {
      const submissionResult = await getSubmission(submissionId);
      
      if (submissionResult.success) {
        setSubmission(submissionResult.data);
      } else {
        setError("Failed to load submission result");
      }
    } catch (error) {
      logger.error("Failed to load result", error);
      setError("Failed to load submission result");
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

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getGradeLetter = (score) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  // Calculate percentage score
  // Score is stored as raw points (e.g., 45 out of 50)
  const getScorePercentage = () => {
    if (submission?.score === null || submission?.score === undefined) return null;
    if (submission?.total_points && submission.total_points > 0) {
      // Calculate percentage: raw score / total points * 100
      const percentage = Math.round((submission.score / submission.total_points) * 100);
      return Math.min(100, percentage);
    }
    // If no total_points, assume score is already a percentage
    return Math.min(100, submission.score);
  };

  // Get actual points earned (score IS the raw points)
  const getPointsEarned = () => {
    if (submission?.score === null || submission?.score === undefined) return null;
    // Score is already stored as raw points, so just return it
    return submission.score;
  };

  const scorePercentage = getScorePercentage();
  const pointsEarned = getPointsEarned();

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
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Result</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/student/grades">
              <Button>Back to Grades</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {submission?.assignment_title || "Assignment Result"}
              </h1>
              <Link href="/student/grades">
                <Button variant="outline">Back to Grades</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Result */}
              <div className="lg:col-span-2 space-y-6">
                {/* Score Card */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">Your Score</h2>
                      <p className="text-sm text-muted-foreground">
                        Graded on {formatDate(submission?.graded_at)}
                      </p>
                    </div>
                    {scorePercentage !== null ? (
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getScoreColor(scorePercentage)}`}>
                          {scorePercentage}%
                        </div>
                        <div className="text-lg font-medium text-muted-foreground">
                          Grade: {getGradeLetter(scorePercentage)}
                        </div>
                        {submission?.total_points && pointsEarned !== null && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {pointsEarned} / {submission.total_points} points
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-lg px-4 py-2">
                        Pending
                      </Badge>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {scorePercentage !== null && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            scorePercentage >= 90 ? "bg-green-500" :
                            scorePercentage >= 70 ? "bg-blue-500" :
                            scorePercentage >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${scorePercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Instructor Feedback</h2>
                  {submission?.feedback ? (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <svg className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p>No feedback provided yet.</p>
                    </div>
                  )}
                </div>

                {/* Your Submission */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Your Submission</h2>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {submission?.content || "No content available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                {/* Assignment Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Assignment Details</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Course</p>
                      <p className="font-medium text-foreground">{submission?.course_code || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</p>
                      <p className="font-medium text-foreground">{formatDate(submission?.due_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Submitted</p>
                      <p className="font-medium text-foreground">{formatDate(submission?.submitted_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Points</p>
                      <p className="font-medium text-foreground">{submission?.total_points || 100}</p>
                    </div>
                    {submission?.score !== null && submission?.score !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Score</p>
                        <p className="font-medium text-foreground">{pointsEarned !== null ? pointsEarned : submission.score} / {submission?.total_points || 100}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Status</h2>
                  <div className="flex items-center gap-2">
                    {submission?.status === "graded" ? (
                      <>
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-700 font-medium">Graded</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-amber-700 font-medium">Pending Review</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </>
  );
}
