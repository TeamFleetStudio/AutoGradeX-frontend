"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
import { getStudents, getCourses } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function InstructorStudentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load both students and courses in parallel
      const [studentsResult, coursesResult] = await Promise.all([
        getStudents(),
        getCourses()
      ]);

      // Process courses
      if (coursesResult.success && coursesResult.data) {
        setCourses(coursesResult.data);
      }

      const result = studentsResult;
      
      if (result.success) {
        const studentsData = (result.data || []).map((student, index) => {
          const name = student.student_name || 'Unknown Student';
          const nameParts = name.split(' ');
          const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
          const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-purple-500'];
          // Use a hash of the student ID for consistent color
          const colorIndex = student.student_id 
            ? student.student_id.charCodeAt(0) % colors.length 
            : index % colors.length;
          
          return {
            id: student.student_id,
            name,
            initials,
            avatarColor: colors[colorIndex],
            email: student.email || `student@university.edu`,
            courses: student.courses || [],
            submissions: student.total_submissions || 0,
            assignmentsSubmitted: student.assignments_submitted || 0,
            avgScore: student.avg_score || 0,
            lastActive: formatLastActive(student.last_active),
            status: student.status || 'active',
            studentNumber: student.student_number,
            section: student.section,
          };
        });
        
        setStudents(studentsData);
      }
    } catch (error) {
      logger.error("Failed to load students data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastActive = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "all" || (student.courses && student.courses.includes(courseFilter));
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "score":
        return (b.avgScore || 0) - (a.avgScore || 0);
      case "recent":
      default:
        // Parse "X mins/hours/days ago" for sorting
        return 0; // Keep original order which is by last active from backend
    }
  });

  // Export students to CSV
  const handleExportStudents = () => {
    const headers = ['Name', 'Email', 'Student Number', 'Section', 'Courses', 'Submissions', 'Avg Score', 'Status', 'Last Active'];
    const csvData = filteredStudents.map(student => [
      student.name,
      student.email,
      student.studentNumber || '',
      student.section || '',
      (student.courses || []).join('; '),
      student.submissions,
      student.avgScore ? `${student.avgScore}%` : 'N/A',
      student.status,
      student.lastActive
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "name": return "Name";
      case "score": return "Avg Score";
      case "recent":
      default: return "Recent Activity";
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-500";
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return "bg-blue-500";
    if (percentage >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Students</h1>
            <p className="text-sm sm:text-base text-muted-foreground">View and manage your students across all courses</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-full sm:w-64 bg-background"
              />
            </div>
            <Button variant="outline" className="h-10 gap-2" onClick={handleExportStudents}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export List
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Students</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{students.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active This Week</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{students.filter(s => s.submissions > 0).length}</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="hidden sm:inline">Active</span>
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Average Score</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {students.length > 0 
                    ? Math.round(students.reduce((sum, s) => sum + (s.avgScore || 0), 0) / students.filter(s => s.avgScore > 0).length) || 0
                    : 0}%
                </p>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.avgScore || 0), 0) / students.filter(s => s.avgScore > 0).length) || 0 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">At Risk</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{students.filter(s => s.status === 'at-risk').length}</p>
                {students.filter(s => s.status === 'at-risk').length > 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Action needed
                  </p>
                )}
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-foreground">
                  {courseFilter === "all" 
                    ? "All Courses" 
                    : courses.find(c => c.code === courseFilter)?.code || courseFilter}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setCourseFilter("all")}>All Courses</DropdownMenuItem>
                {courses.map((course) => (
                  <DropdownMenuItem 
                    key={course.id} 
                    onClick={() => setCourseFilter(course.code)}
                  >
                    {course.code} - {course.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-foreground">
                  Status: {statusFilter === "all" ? "All" : statusFilter === "active" ? "Active" : "At Risk"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("at-risk")}>At Risk</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-1 px-2 text-foreground font-medium">
                  {getSortLabel()}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("recent")}>Recent Activity</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>Name</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("score")}>Avg Score</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-card rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Student</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Courses</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Submissions</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Avg Score</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Last Active</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-6 py-4"><Skeleton className="h-10 w-40" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-12" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-10" /></td>
                      </tr>
                    ))}
                  </>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-muted-foreground mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-foreground font-medium">No students found</p>
                      <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${student.avatarColor} flex items-center justify-center relative`}>
                              <span className="text-white text-sm font-medium">{student.initials}</span>
                              {student.status === "at-risk" && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{student.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-0 font-normal">
                              {student.courses[0]}
                            </Badge>
                            {student.extraCourses && (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-0 font-normal">
                                +{student.extraCourses}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-foreground">
                              <span className="text-primary font-medium">{student.submissions}</span>
                              <span className="text-muted-foreground"> / {student.totalSubmissions}</span>
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${getProgressColor((student.submissions / student.totalSubmissions) * 100)}`}
                                style={{ width: `${(student.submissions / student.totalSubmissions) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${getScoreColor(student.avgScore)}`}>
                            {student.avgScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{student.lastActive}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/instructor/students/${student.id}`}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
                          >
                            View
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
    </>
  );
}
