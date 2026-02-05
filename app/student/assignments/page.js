"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignments, getSubmissions, getSubmissionHistory } from "@/lib/api-client";
import SubmissionVersionTimeline from "@/components/ui/submission-version-timeline";
import logger from "@/lib/logger";

export default function StudentAssignmentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [submissionHistories, setSubmissionHistories] = useState({});

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const [assignmentsResult, submissionsResult] = await Promise.all([
        getAssignments(),
        getSubmissions()
      ]);
      
      if (assignmentsResult.success) {
        // Map assignments with submission status
        const assignmentsData = assignmentsResult.data || [];
        const submissionsData = submissionsResult.success ? (submissionsResult.data || []) : [];
        setSubmissions(submissionsData);
        
        // Enrich assignments with submission status
        const enrichedAssignments = assignmentsData.map(assignment => {
          const submission = submissionsData.find(s => s.assignment_id === assignment.id);
          let status = 'pending';
          let progress = 0;
          
          if (submission) {
            if (submission.status === 'graded') {
              status = 'graded';
              progress = 100;
            } else if (submission.status === 'submitted' || submission.status === 'pending') {
              // Handle both 'submitted' (new) and 'pending' (legacy) as submitted
              status = 'submitted';
              progress = 100;
            } else if (submission.status === 'draft') {
              status = 'in-progress';
              progress = 45;
            }
          } else {
            // Check if overdue
            const dueDate = new Date(assignment.due_date);
            if (dueDate < new Date()) {
              status = 'overdue';
            }
          }
          
          return {
            id: assignment.id,
            submissionId: submission?.id,
            courseCode: assignment.course_code || 'N/A',
            courseName: assignment.course_name || assignment.title,
            title: assignment.title,
            instructor: assignment.instructor_name || 'Instructor',
            instructorAvatar: null,
            dueDate: formatDueDate(assignment.due_date),
            isUrgent: isUrgentDue(assignment.due_date),
            isOverdue: status === 'overdue',
            status,
            maxAttempts: assignment.max_attempts || 3,
            usedAttempts: submissionsData.filter(s => s.assignment_id === assignment.id).length,
            attempts: `Attempt ${submission ? 1 : 0} of ${assignment.max_attempts || 3} available`,
            progress,
            // Score is stored as raw points (e.g., 45 out of 50)
            score: submission?.score,
            maxScore: assignment.total_points || 100,
            // Calculate percentage for display
            scorePercentage: submission?.score != null && assignment.total_points > 0 
              ? Math.round((submission.score / assignment.total_points) * 100) 
              : null,
            submittedDate: submission?.submitted_at ? formatSubmittedDate(submission.submitted_at) : null,
            feedbackAvailable: submission?.feedback ? true : false,
            awaitingGrade: status === 'submitted',
            assignmentType: assignment.assignment_type || 'standard',
            timeLimitMinutes: assignment.time_limit_minutes,
            isGraded: status === 'graded',
            submissionVersion: submission?.version || 1,
          };
        });
        
        setAssignments(enrichedAssignments);
      }
    } catch (error) {
      logger.error("Failed to load assignments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Due yesterday';
    if (diffDays === 0) return 'Due Today, 11:59 PM';
    if (diffDays === 1) return 'Due Tomorrow, 11:59 PM';
    return `Due in ${diffDays} days`;
  };

  const formatSubmittedDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Submitted today';
    if (diffDays === 1) return 'Sent yesterday';
    if (diffDays < 7) return `Sent ${diffDays} days ago`;
    return `Submitted ${date.toLocaleDateString()}`;
  };

  const isUrgentDue = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  };

  // Load submission history for an assignment
  const loadSubmissionHistory = async (assignmentId) => {
    // Skip if already loaded
    if (submissionHistories[assignmentId]) return;
    
    try {
      const result = await getSubmissionHistory(assignmentId);
      if (result.success && result.data) {
        setSubmissionHistories(prev => ({
          ...prev,
          [assignmentId]: result.data
        }));
      }
    } catch (error) {
      logger.error("Failed to load submission history", { assignmentId, error });
    }
  };

  // Toggle expanded assignment and load history
  const toggleExpandedAssignment = async (assignmentId) => {
    if (expandedAssignment === assignmentId) {
      setExpandedAssignment(null);
    } else {
      setExpandedAssignment(assignmentId);
      await loadSubmissionHistory(assignmentId);
    }
  };

  // Filter counts (use assignments directly from API)
  const filterCounts = {
    all: assignments.length,
    pending: assignments.filter(a => a.status === "pending" || a.status === "overdue").length,
    "in-progress": assignments.filter(a => a.status === "in-progress").length,
    submitted: assignments.filter(a => a.status === "submitted").length,
    graded: assignments.filter(a => a.status === "graded").length,
  };

  // Apply filters
  const filteredAssignments = assignments
    .filter(assignment => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          assignment.title.toLowerCase().includes(query) ||
          assignment.courseCode.toLowerCase().includes(query) ||
          assignment.courseName.toLowerCase().includes(query) ||
          assignment.instructor.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (activeFilter === "all") return true;
      if (activeFilter === "pending") return assignment.status === "pending" || assignment.status === "overdue";
      return assignment.status === activeFilter;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        // Sort by due date (soonest first)
        const dateA = a.dueDateTime ? new Date(a.dueDateTime).getTime() : Infinity;
        const dateB = b.dueDateTime ? new Date(b.dueDateTime).getTime() : Infinity;
        return dateA - dateB;
      } else if (sortBy === "course") {
        // Sort by course code
        return a.courseCode.localeCompare(b.courseCode);
      } else if (sortBy === "status") {
        // Sort by status (pending first, then in-progress, then submitted, then graded)
        const statusOrder = { pending: 0, overdue: 1, "in-progress": 2, submitted: 3, graded: 4 };
        const orderA = statusOrder[a.status] || 5;
        const orderB = statusOrder[b.status] || 5;
        return orderA - orderB;
      }
      return 0;
    });

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-0">Pending</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-0">In Progress</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-0">Overdue</Badge>;
      case "submitted":
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0">Submitted</Badge>;
      case "graded":
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border-0">Graded</Badge>;
      default:
        return null;
    }
  };

  const renderAssignmentCard = (assignment) => {
    const isPending = assignment.status === "pending";
    const isInProgress = assignment.status === "in-progress";
    const isOverdue = assignment.status === "overdue";
    const isSubmitted = assignment.status === "submitted";
    const isGraded = assignment.status === "graded";

    return (
      <div
        key={assignment.id}
        className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
              {assignment.courseCode}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{assignment.courseName}</span>
          </div>
          {getStatusBadge(assignment.status)}
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-foreground">{assignment.title}</h3>
          {assignment.assignmentType === 'quiz' && (
            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-0 text-xs">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Quiz
            </Badge>
          )}
        </div>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
            {assignment.instructorAvatar ? (
              <img
                src={assignment.instructorAvatar}
                alt={assignment.instructor}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                {assignment.instructor.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{assignment.instructor}</span>
        </div>

        {/* Status-specific content */}
        {(isPending || isOverdue) && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <svg className={`w-4 h-4 ${assignment.isUrgent || isOverdue ? "text-red-500" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={`text-sm ${assignment.isUrgent || isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                {assignment.dueDate}
              </span>
            </div>
            {isOverdue && assignment.latePenalty && (
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs text-muted-foreground">{assignment.latePenalty}</span>
              </div>
            )}
            {assignment.attempts && (
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs text-muted-foreground">{assignment.attempts}</span>
              </div>
            )}
          </>
        )}

        {isInProgress && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-muted-foreground">{assignment.dueDate}</span>
            </div>
            {assignment.draftSaved && (
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-xs text-muted-foreground">{assignment.draftSaved}</span>
              </div>
            )}
          </>
        )}

        {isGraded && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-muted-foreground">{assignment.submittedDate}</span>
            </div>
            {assignment.feedbackAvailable && (
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-xs text-muted-foreground">Feedback available</span>
              </div>
            )}
          </>
        )}

        {isSubmitted && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-sm text-muted-foreground">{assignment.submittedDate}</span>
            </div>
          </>
        )}

        {/* Version Timeline Toggle - Show for submitted or graded assignments */}
        {(isSubmitted || isGraded) && assignment.usedAttempts > 0 && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpandedAssignment(assignment.id);
              }}
              className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <svg 
                className={`w-3.5 h-3.5 transition-transform ${expandedAssignment === assignment.id ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedAssignment === assignment.id ? 'Hide' : 'Show'} submission history
              {assignment.submissionVersion > 1 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  v{assignment.submissionVersion}
                </Badge>
              )}
            </button>
            
            {/* Expanded Version Timeline */}
            {expandedAssignment === assignment.id && (
              <div className="mt-3">
                {submissionHistories[assignment.id] ? (
                  <SubmissionVersionTimeline 
                    versions={submissionHistories[assignment.id].versions || []}
                    summary={submissionHistories[assignment.id].summary || {}}
                    className="bg-muted/50"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    Loading history...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Remaining Attempts Counter - Show for pending/overdue/in-progress */}
        {(isPending || isOverdue || isInProgress) && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: assignment.maxAttempts }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < assignment.usedAttempts ? 'bg-blue-500' : 'bg-muted'}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {assignment.maxAttempts - assignment.usedAttempts} of {assignment.maxAttempts} attempts remaining
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {/* Progress or Score */}
          {isGraded ? (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Score</span>
              <p className="text-lg font-bold text-foreground">
                <span className="text-green-600 dark:text-green-400">{assignment.score}</span>
                <span className="text-muted-foreground font-normal">/{assignment.maxScore}</span>
              </p>
            </div>
          ) : isInProgress ? (
            <div className="flex-1 mr-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{assignment.progress}% complete</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${assignment.progress}%` }}
                />
              </div>
            </div>
          ) : isOverdue ? (
            <span className="text-sm font-medium text-red-500">0% complete</span>
          ) : isSubmitted ? (
            <span className="text-sm text-muted-foreground">Awaiting grade...</span>
          ) : (
            <span className="text-sm text-muted-foreground">Not started</span>
          )}

          {/* Action Button */}
          {isPending && assignment.assignmentType === 'quiz' && (
            <Link href={`/student/quiz/${assignment.id}`}>
              <Button variant="outline" size="sm" className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Take Quiz
                {assignment.timeLimitMinutes && <span className="text-xs opacity-75">({assignment.timeLimitMinutes}m)</span>}
              </Button>
            </Link>
          )}
          {isPending && assignment.assignmentType !== 'quiz' && (
            <Link href={`/student/submit/${assignment.id}`}>
              <Button variant="outline" size="sm" className="gap-1">
                Start Assignment
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </Link>
          )}
          {isInProgress && (
            <Link href={`/student/submit/${assignment.id}`}>
              <Button size="sm" className="bg-teal-500 hover:bg-teal-600 gap-1">
                Continue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </Link>
          )}
          {isOverdue && (
            <Link href={`/student/submit/${assignment.id}`}>
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 gap-1">
                Late Submit
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </Button>
            </Link>
          )}
          {isGraded && assignment.submissionId && (
            <Link href={`/student/results/${assignment.submissionId}`}>
              <Button variant="outline" size="sm" className="gap-1">
                View Result
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Button>
            </Link>
          )}
          {isSubmitted && (
            <Link href={`/student/submissions/${assignment.id}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View Submission
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">My Assignments</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage and track your coursework progress.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm font-medium text-foreground bg-transparent border-0 focus:ring-0 cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="course">Course</option>
                <option value="status">Status</option>
              </select>
            </div>
            {/* Filter button */}
            <Button variant="outline" size="icon" className="h-10 w-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            All
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeFilter === "all" ? "bg-white/20" : "bg-muted"
            }`}>
              {filterCounts.all}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "pending"
                ? "bg-amber-500 text-white"
                : "bg-card border border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === "pending" ? "bg-white" : "bg-amber-500"}`} />
            Pending
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeFilter === "pending" ? "bg-white/20" : "bg-muted"
            }`}>
              {filterCounts.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("in-progress")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "in-progress"
                ? "bg-blue-500 text-white"
                : "bg-card border border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === "in-progress" ? "bg-white" : "bg-blue-500"}`} />
            In Progress
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeFilter === "in-progress" ? "bg-white/20" : "bg-muted"
            }`}>
              {filterCounts["in-progress"]}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("submitted")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "submitted"
                ? "bg-muted-foreground text-white"
                : "bg-card border border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === "submitted" ? "bg-white" : "bg-muted-foreground"}`} />
            Submitted
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeFilter === "submitted" ? "bg-white/20" : "bg-muted"
            }`}>
              {filterCounts.submitted}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("graded")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "graded"
                ? "bg-green-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === "graded" ? "bg-white" : "bg-green-500"}`} />
            Graded
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeFilter === "graded" ? "bg-white/20" : "bg-muted"
            }`}>
              {filterCounts.graded}
            </span>
          </button>
        </div>

        {/* Assignments Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-6 w-48 mb-3" />
                <Skeleton className="h-4 w-40 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAssignments.map(renderAssignmentCard)}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "No assignments match the selected filter"}
            </p>
          </div>
        )}
    </>
  );
}
