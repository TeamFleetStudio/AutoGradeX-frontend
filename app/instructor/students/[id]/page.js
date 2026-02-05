"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubmissions, getGrades } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function StudentDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    setIsLoading(true);
    try {
      // For now, we'll get student data from submissions
      const [submissionsResult, gradesResult] = await Promise.all([
        getSubmissions(),
        getGrades()
      ]);
      
      if (submissionsResult.success) {
        const studentSubmissions = (submissionsResult.data || []).filter(
          s => s.student_id === studentId
        );
        setSubmissions(studentSubmissions);
        
        // Build student info from first submission
        if (studentSubmissions.length > 0) {
          const firstSub = studentSubmissions[0];
          setStudent({
            id: studentId,
            name: firstSub.student_name || "Student",
            email: firstSub.student_email || "student@university.edu"
          });
        } else {
          setStudent({
            id: studentId,
            name: "Student",
            email: "student@university.edu"
          });
        }
      }
      
      if (gradesResult.success) {
        // Filter grades for this student by matching submission IDs
        const studentSubmissionIds = (submissionsResult.data || [])
          .filter(s => s.student_id === studentId)
          .map(s => s.id);
        
        const studentGrades = (gradesResult.data || []).filter(
          g => studentSubmissionIds.includes(g.submission_id) || g.student_id === studentId
        );
        setGrades(studentGrades);
      }
    } catch (error) {
      logger.error("Failed to load student data", error);
      setError("Failed to load student data");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Awaiting Grade</Badge>;
      case "graded":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Graded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Calculate graded count from submissions with status 'graded' or from grades array
  const gradedCount = submissions.filter(s => s.status === "graded").length || grades.length;
  
  // Calculate average score from grades that have a score
  const gradesWithScore = grades.filter(g => g.score !== null && g.score !== undefined);
  const avgScore = gradesWithScore.length > 0 
    ? Math.round(gradesWithScore.reduce((sum, g) => sum + (g.score || 0), 0) / gradesWithScore.length)
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
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Student</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/instructor/students">
              <Button>Back to Students</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Student Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xl font-medium">
                  {(student?.name || "S").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{student?.name}</h1>
                <p className="text-muted-foreground">{student?.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
                <p className="text-sm text-muted-foreground">Submissions</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{gradedCount}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {submissions.filter(s => s.status === "pending" || s.status === "submitted").length}
                </p>
                <p className="text-sm text-muted-foreground">Awaiting Grade</p>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Recent Submissions</h2>
              </div>
              
              {submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-foreground mb-1">No submissions yet</h3>
                  <p className="text-muted-foreground">This student hasn't submitted any assignments.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignment</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 font-medium text-foreground">{submission.assignment_title || "Assignment"}</td>
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
                            <Button size="sm" variant="outline">View</Button>
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
