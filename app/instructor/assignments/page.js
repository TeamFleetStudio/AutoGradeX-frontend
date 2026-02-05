"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAssignments, createAssignment, deleteAssignment } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCourseCode, setFilterCourseCode] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    course_code: "",
    due_date: "",
    type: "essay",
    total_points: 100,
  });

  useEffect(() => {
    const courseCode = searchParams.get('course_code');
    if (courseCode) {
      setFilterCourseCode(courseCode);
    }
    loadAssignments(courseCode);
  }, [searchParams]);

  const loadAssignments = async (courseCode = null) => {
    setIsLoading(true);
    try {
      const filters = {};
      if (courseCode) {
        filters.course_code = courseCode;
      }
      const result = await getAssignments(filters);
      if (result.success) {
        // Transform API data to match UI expectations
        const transformedData = (result.data || []).map(a => ({
          id: a.id,
          title: a.title,
          subtitle: a.description ? a.description.substring(0, 30) + '...' : '',
          icon: a.type === 'coding' ? 'code' : a.type === 'quiz' ? 'math' : 'essay',
          course: a.course_code || 'N/A',
          dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date',
          dueSoon: getDueSoonText(a.due_date),
          submissions: parseInt(a.submission_count) || 0,
          totalStudents: parseInt(a.total_students) || 0,
          percentage: a.total_students > 0 ? Math.round((parseInt(a.submission_count) || 0) / parseInt(a.total_students) * 100) : 0,
          status: a.status || 'draft',
          pendingCount: parseInt(a.pending_count) || 0,
          gradedCount: parseInt(a.graded_count) || 0,
        }));
        setAssignments(transformedData);
      }
    } catch (error) {
      logger.error("Failed to load assignments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDueSoonText = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return null;
  };

  const handleNewAssignmentChange = (field, value) => {
    setNewAssignment((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.course_code) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    setIsCreating(true);
    try {
      const result = await createAssignment({
        title: newAssignment.title,
        description: newAssignment.description,
        course_code: newAssignment.course_code,
        due_date: newAssignment.due_date ? new Date(newAssignment.due_date).toISOString() : null,
        total_points: parseInt(newAssignment.total_points) || 100,
        status: 'draft',
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Assignment created successfully',
        });
        // Reload assignments to get the new one
        await loadAssignments(filterCourseCode || null);
        // Reset form and close modal
        setNewAssignment({
          title: "",
          description: "",
          course_code: "",
          due_date: "",
          type: "essay",
          total_points: 100,
        });
        setPdfFile(null);
        setIsModalOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create assignment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error("Failed to create assignment", error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    setDeleteConfirmId(assignmentId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      const result = await deleteAssignment(deleteConfirmId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Assignment deleted successfully',
        });
        setAssignments(prev => prev.filter(a => a.id !== deleteConfirmId));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete assignment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error("Failed to delete assignment", error);
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmId(null);
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || assignment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getAssignmentIcon = (icon) => {
    switch (icon) {
      case "brain":
        return (
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        );
      case "math":
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "essay":
        return (
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case "code":
        return (
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Active</Badge>;
      case "draft":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Draft</Badge>;
      case "closed":
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0">Closed</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Assignments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage and track all your assignments</p>
        </div>
        <div className="flex gap-3">
          <Link href="/instructor/quizzes/new">
            <Button 
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create Quiz
            </Button>
          </Link>
          <Link href="/instructor/assignments/new">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Assignment
            </Button>
          </Link>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Assignments</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{assignments.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Now</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{assignments.filter(a => a.status === 'active').length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Review</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{assignments.reduce((sum, a) => sum + (a.pendingCount || 0), 0)}</p>
                <p className="text-xs text-amber-500 mt-0.5">Submissions</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg. Score</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {assignments.length > 0 
                    ? Math.round(assignments.reduce((sum, a) => sum + (a.avgScore || 0), 0) / assignments.filter(a => a.avgScore).length) || 0
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">All assignments</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: "all", label: "All", count: assignments.length, dotColor: null },
              { id: "active", label: "Active", count: assignments.filter(a => a.status === 'active').length, dotColor: "bg-green-500" },
              { id: "draft", label: "Draft", count: assignments.filter(a => a.status === 'draft').length, dotColor: "bg-amber-500" },
              { id: "closed", label: "Closed", count: assignments.filter(a => a.status === 'closed').length, dotColor: "bg-muted-foreground" },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setFilterStatus(status.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {status.dotColor && <span className={`w-2 h-2 rounded-full ${status.dotColor}`}></span>}
                {status.label}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  filterStatus === status.id ? "bg-primary/20" : "bg-muted"
                }`}>
                  {status.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-card rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Assignment</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Course</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Due Date</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Submissions</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Status</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-5" /></td>
                      </tr>
                    ))}
                  </>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-muted-foreground mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-foreground font-medium">No assignments found</p>
                      <p className="text-muted-foreground text-sm mb-4">Try adjusting your search or filters</p>
                      <Link href="/instructor/assignments/new">
                        <Button variant="outline" size="sm">Create Assignment</Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getAssignmentIcon(assignment.icon)}
                            <div>
                              <Link
                                href={`/instructor/assignments/${assignment.id}`}
                                className="text-sm font-medium text-foreground hover:text-primary block"
                              >
                                {assignment.title}
                              </Link>
                              <span className="text-xs text-muted-foreground">{assignment.subtitle}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{assignment.course}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-sm text-foreground block">{assignment.dueDate}</span>
                            {assignment.dueSoon && (
                              <span className="text-xs text-amber-500">{assignment.dueSoon}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-[120px]">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground" title={`${assignment.submissions} submitted out of ${assignment.totalStudents} enrolled students`}>
                                {assignment.submissions} of {assignment.totalStudents}
                              </span>
                              <span className="text-muted-foreground">{assignment.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  assignment.percentage === 100 ? 'bg-green-500' : 
                                  assignment.percentage >= 70 ? 'bg-blue-500' : 
                                  assignment.percentage >= 30 ? 'bg-amber-500' : 'bg-muted-foreground'
                                }`}
                                style={{ width: `${assignment.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">students submitted</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(assignment.status)}
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/instructor/assignments/${assignment.id}`}>
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/instructor/assignments/${assignment.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/instructor/assignments/${assignment.id}/submissions`}>
                                  View Submissions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredAssignments.length}</span> of <span className="font-medium text-foreground">{assignments.length}</span> assignments
            </p>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50" disabled>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted text-sm font-medium">
                2
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted text-sm font-medium">
                3
              </button>
              <span className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted text-sm font-medium">
                5
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">© 2026 AutoGradeX. All rights reserved.</p>
        </div>

      {/* New Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Assignment</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new assignment for your students.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Assignment Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={newAssignment.title}
                onChange={(e) => handleNewAssignmentChange("title", e.target.value)}
                placeholder="e.g., Introduction to Machine Learning"
                className="h-10"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={newAssignment.description}
                onChange={(e) => handleNewAssignmentChange("description", e.target.value)}
                placeholder="Provide a brief description of the assignment..."
                rows={3}
              />
            </div>

            {/* Course and Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="course" className="text-sm font-medium">
                  Course <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newAssignment.course}
                  onValueChange={(value) => handleNewAssignmentChange("course", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS-101">CS-101 - Intro to CS</SelectItem>
                    <SelectItem value="CS-102">CS-102 - Data Structures</SelectItem>
                    <SelectItem value="MAT-202">MAT-202 - Linear Algebra</SelectItem>
                    <SelectItem value="ETH-300">ETH-300 - AI Ethics</SelectItem>
                    <SelectItem value="CS-201">CS-201 - Algorithms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  Assignment Type
                </Label>
                <Select
                  value={newAssignment.type}
                  onValueChange={(value) => handleNewAssignmentChange("type", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="coding">Coding Assignment</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="lab">Lab Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date and Points Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate" className="text-sm font-medium">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => handleNewAssignmentChange("dueDate", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalPoints" className="text-sm font-medium">
                  Total Points
                </Label>
                <Input
                  id="totalPoints"
                  type="number"
                  value={newAssignment.totalPoints}
                  onChange={(e) => handleNewAssignmentChange("totalPoints", e.target.value)}
                  placeholder="100"
                  className="h-10"
                />
              </div>
            </div>

            {/* PDF Upload */}
            <div className="grid gap-2">
              <Label htmlFor="pdfUpload" className="text-sm font-medium">
                Assignment PDF
              </Label>
              <div className="relative">
                {!pdfFile ? (
                  <label
                    htmlFor="pdfUpload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF files only (max 10MB)</p>
                    </div>
                    <input
                      id="pdfUpload"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== "application/pdf") {
                            toast({
                              title: 'Error',
                              description: 'Please upload a PDF file',
                              variant: 'destructive',
                            });
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: 'Error',
                              description: 'File size must be less than 10MB',
                              variant: 'destructive',
                            });
                            return;
                          }
                          setPdfFile(file);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9v6H8v-6h2zm4 0v6h-2v-6h2zm-6 0v6H6v-6h2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {pdfFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Delete Assignment</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to delete this assignment? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
