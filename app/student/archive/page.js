"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignments, getSubmissions } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function ArchivePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [archivedAssignments, setArchivedAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadArchivedAssignments();
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const loadArchivedAssignments = async () => {
    setIsLoading(true);
    try {
      const [assignmentsResult, submissionsResult] = await Promise.all([
        getAssignments(),
        getSubmissions()
      ]);
      
      if (assignmentsResult.success && submissionsResult.success) {
        const assignments = assignmentsResult.data || [];
        const submissions = submissionsResult.data || [];
        
        // Filter for past assignments (past due date) or closed status
        const now = new Date();
        const archived = assignments.filter(a => {
          const dueDate = new Date(a.due_date);
          return dueDate < now || a.status === "closed";
        }).map(assignment => {
          const submission = submissions.find(s => s.assignment_id === assignment.id);
          return {
            ...assignment,
            submission,
            hasSubmission: !!submission,
            score: submission?.score
          };
        });
        
        setArchivedAssignments(archived);
      }
    } catch (error) {
      logger.error("Failed to load archived assignments", error);
    } finally {
      setIsLoading(false);
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

  const filteredAssignments = archivedAssignments.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Archived Assignments</h1>
            <p className="text-muted-foreground">View your past assignments and grades</p>
          </div>
          <div className="w-64">
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{archivedAssignments.length}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Archived</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {archivedAssignments.filter(a => a.hasSubmission).length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {archivedAssignments.filter(a => a.score !== null && a.score !== undefined).length > 0
                ? Math.round(
                    archivedAssignments
                      .filter(a => a.score !== null && a.score !== undefined)
                      .reduce((sum, a) => sum + a.score, 0) /
                    archivedAssignments.filter(a => a.score !== null && a.score !== undefined).length
                  )
                : 0}%
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Average Score</p>
          </div>
        </div>

        {/* Archived Assignments List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="text-lg font-medium text-foreground mb-1">No archived assignments</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No assignments match your search." : "Past assignments will appear here."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignment</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Course</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{assignment.title}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {assignment.course_code || "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {formatDate(assignment.due_date)}
                    </td>
                    <td className="px-6 py-4">
                      {assignment.hasSubmission ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Submitted</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Not Submitted</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {assignment.score !== null && assignment.score !== undefined ? (
                        <span className="font-medium text-foreground">{assignment.score}%</span>
                      ) : assignment.hasSubmission ? (
                        <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100">Pending</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {assignment.submission && (
                        <Link href={`/student/results/${assignment.submission.id}`}>
                          <Button size="sm" variant="outline">View Result</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </>
  );
}
