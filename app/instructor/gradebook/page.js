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
import { getGrades, getAssignments, getSubmissions, getStudents, getCourses } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function InstructorGradebookPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [courses, setCourses] = useState([]);
  const [studentFilter, setStudentFilter] = useState("all");
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    loadGradebookData();
  }, []);

  const loadGradebookData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsRes, gradesRes, submissionsRes, studentsRes, coursesRes] = await Promise.all([
        getAssignments(),
        getGrades(),
        getSubmissions(),
        getStudents(),
        getCourses()
      ]);
      
      // Process courses
      if (coursesRes.success) {
        setCourses(coursesRes.data || []);
      }
      
      // Process assignments
      if (assignmentsRes.success) {
        const assignmentsData = assignmentsRes.data || [];
        setAssignments(assignmentsData.map(a => ({
          id: a.id,
          name: a.title,
          dueDate: a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : 'No due date',
          maxPoints: a.total_points || 100,
          courseCode: a.course_code
        })));
      }
      
      const gradesData = gradesRes.success ? (gradesRes.data || []) : [];
      const submissionsData = submissionsRes.success ? (submissionsRes.data || []) : [];
      const studentsData = studentsRes.success ? (studentsRes.data || []) : [];
      
      setGrades(gradesData);
      
      // Build student list with grades per assignment
      const processedStudents = studentsData.map(student => {
        const studentSubmissions = submissionsData.filter(s => s.student_id === student.student_id);
        
        // Build grades array for this student
        const studentGrades = (assignmentsRes.data || []).map(assignment => {
          const submission = studentSubmissions.find(s => s.assignment_id === assignment.id);
          const grade = submission ? gradesData.find(g => g.submission_id === submission.id) : null;
          
          return {
            assignmentId: assignment.id,
            score: grade?.score ?? null,
            maxScore: assignment.total_points || 100,
            status: !submission ? 'missing' : (grade ? 'graded' : 'awaiting'),
          };
        });
        
        return {
          id: student.student_id,
          name: student.student_name || 'Unknown Student',
          email: student.email,
          avatar: null,
          grades: studentGrades,
        };
      });
      
      setStudents(processedStudents);
    } catch (error) {
      logger.error("Failed to load gradebook data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter assignments by selected course
  const filteredAssignments = assignments.filter((a) => {
    if (selectedCourse !== "All Courses") {
      const selectedCode = selectedCourse.split(':')[0].trim();
      if (a.courseCode !== selectedCode) return false;
    }
    return true;
  });

  // Helper function to calculate student's average score
  const getStudentAverage = (student) => {
    const gradedGrades = student.grades.filter(g => g.score !== null);
    if (gradedGrades.length === 0) return 0;
    const totalScore = gradedGrades.reduce((sum, g) => sum + g.score, 0);
    const totalMax = gradedGrades.reduce((sum, g) => sum + g.maxScore, 0);
    return totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  };

  const filteredStudents = students.filter((student) => {
    // Filter by search query
    if (!student.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Filter by student status
    if (studentFilter !== "all") {
      const avg = getStudentAverage(student);
      if (studentFilter === "at-risk" && avg >= 70) return false;
      if (studentFilter === "passing" && avg < 70) return false;
    }
    return true;
  });

  // Calculate class averages (use filteredAssignments)
  const classAverages = filteredAssignments.map((assignment) => {
    const studentGrades = students
      .map((s) => s.grades.find((g) => g.assignmentId === assignment.id))
      .filter((g) => g && g.score !== null);
    if (studentGrades.length === 0) return null;
    const avg = studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length;
    return { assignmentId: assignment.id, average: avg.toFixed(1), maxScore: assignment.maxPoints };
  });

  // Calculate submission rates (use filteredAssignments)
  const submissionRates = filteredAssignments.map((assignment) => {
    const total = students.length || 1;
    const submitted = students.filter((s) => {
      const grade = s.grades.find((g) => g.assignmentId === assignment.id);
      return grade && grade.score !== null;
    }).length;
    return { assignmentId: assignment.id, rate: Math.round((submitted / total) * 100) };
  });

  // Export gradebook to CSV
  const handleExportCSV = () => {
    const headers = ['Student Name', 'Email', ...filteredAssignments.map(a => a.name)];
    const csvData = filteredStudents.map(student => [
      student.name,
      student.email || '',
      ...filteredAssignments.map(assignment => {
        const grade = student.grades.find(g => g.assignmentId === assignment.id);
        if (!grade || grade.score === null) return '';
        return `${grade.score}/${assignment.maxPoints}`;
      })
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gradebook-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getGradeColor = (score, maxScore) => {
    if (score === null) return "";
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return "bg-green-100 text-green-700";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-700";
    if (percentage >= 50) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-600";
  };

  const renderGradeCell = (grade, assignment) => {
    if (!grade) return <span className="text-muted-foreground">—</span>;
    
    if (grade.status === "awaiting" || grade.status === "pending" || grade.status === "submitted") {
      return (
        <div className="bg-amber-50 px-3 py-1.5 rounded text-center">
          <span className="text-amber-600 text-sm flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="10" />
            </svg>
            Awaiting
          </span>
        </div>
      );
    }
    
    if (grade.status === "missing") {
      return <span className="text-muted-foreground">—</span>;
    }
    
    if (grade.score !== null) {
      return (
        <div className={`px-3 py-1.5 rounded text-center ${getGradeColor(grade.score, grade.maxScore)}`}>
          <span className="font-medium">{grade.score}</span>
        </div>
      );
    }
    
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gradebook</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2">
                  {selectedCourse}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSelectedCourse("All Courses")}>
                  All Courses
                </DropdownMenuItem>
                {courses.map((course) => (
                  <DropdownMenuItem 
                    key={course.id} 
                    onClick={() => setSelectedCourse(`${course.code}: ${course.name}`)}
                  >
                    {course.code}: {course.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 gap-2" onClick={handleExportCSV}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-card border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Cards
              </button>
            </div>

            {/* Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {studentFilter === "all" ? "All Students" : studentFilter === "at-risk" ? "At Risk" : "Passing"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStudentFilter("all")}>All Students</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudentFilter("at-risk")}>At Risk</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudentFilter("passing")}>Passing</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
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
                placeholder="Search stude..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-36"
              />
            </div>
          </div>
        </div>

        {/* Gradebook Content */}
        {isLoading ? (
          <div className="bg-card rounded-xl border border-border p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : students.length === 0 || filteredAssignments.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="text-muted-foreground mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-foreground font-medium">No gradebook data available</p>
            <p className="text-muted-foreground text-sm mb-4">
              {students.length === 0 ? "No students found. " : ""}
              {filteredAssignments.length === 0 ? (selectedCourse === "All Courses" ? "No assignments created yet." : "No assignments for this course.") : ""}
            </p>
            <Link href="/instructor/assignments/new">
              <Button variant="outline" size="sm">Create Assignment</Button>
            </Link>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const totalScore = student.grades.reduce((sum, g) => sum + (g.score || 0), 0);
              const totalMaxScore = student.grades.reduce((sum, g) => sum + g.maxScore, 0);
              const avgPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
              const gradedCount = student.grades.filter(g => g.score !== null).length;
              const awaitingCount = student.grades.filter(g => g.status === 'awaiting' || g.status === 'pending' || g.status === 'submitted').length;
              
              return (
                <div key={student.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {student.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <Link
                        href={`/instructor/students/${student.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {student.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{student.email || 'No email'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold text-foreground">{avgPercentage}%</p>
                      <p className="text-xs text-muted-foreground">Average</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{gradedCount}</p>
                      <p className="text-xs text-muted-foreground">Graded</p>
                    </div>
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{awaitingCount}</p>
                      <p className="text-xs text-muted-foreground">Awaiting</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {filteredAssignments.slice(0, 3).map((assignment) => {
                      const grade = student.grades.find(g => g.assignmentId === assignment.id);
                      return (
                        <div key={assignment.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1">{assignment.name}</span>
                          <span className={`font-medium ml-2 ${grade?.score !== null ? getGradeColor(grade.score, grade.maxScore).replace('bg-', 'text-').split(' ')[0] : 'text-muted-foreground'}`}>
                            {grade?.score !== null ? `${grade.score}/${assignment.maxPoints}` : '—'}
                          </span>
                        </div>
                      );
                    })}
                    {filteredAssignments.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">+{filteredAssignments.length - 3} more assignments</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 sticky left-0 bg-muted/50 min-w-[200px]">
                    Student Name
                  </th>
                  {filteredAssignments.map((assignment) => (
                    <th key={assignment.id} className="text-left text-xs font-medium text-muted-foreground px-4 py-4 min-w-[140px]">
                      <div className="font-semibold text-foreground/80 normal-case tracking-normal text-sm">
                        {assignment.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-normal mt-0.5">
                        {assignment.dueDate} · {assignment.maxPoints} pts
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-6 py-4 sticky left-0 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                          {student.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <Link
                          href={`/instructor/students/${student.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {student.name}
                        </Link>
                      </div>
                    </td>
                    {filteredAssignments.map((assignment) => {
                      const grade = student.grades.find((g) => g.assignmentId === assignment.id);
                      return (
                        <td key={assignment.id} className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {renderGradeCell(grade, assignment)}
                            {grade && grade.score !== null && (
                              <span className="text-xs text-muted-foreground">/{assignment.maxPoints}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={filteredAssignments.length + 1} className="px-6 py-8 text-center text-muted-foreground">
                      No students match your search
                    </td>
                  </tr>
                )}

                {/* Class Average Row */}
                {filteredStudents.length > 0 && (
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td className="px-6 py-4 sticky left-0 bg-muted/50">
                      <span className="text-sm font-medium text-foreground">Class Average</span>
                    </td>
                    {classAverages.map((avg, index) => (
                      <td key={index} className="px-4 py-4">
                        <span className="text-sm font-medium text-foreground">
                          {avg ? `${avg.average}/${avg.maxScore}` : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Submission Rate Row */}
                {filteredStudents.length > 0 && (
                  <tr className="bg-muted/50">
                    <td className="px-6 py-4 sticky left-0 bg-muted/50">
                      <span className="text-sm font-medium text-foreground">Submission Rate</span>
                    </td>
                    {submissionRates.map((rate, index) => (
                      <td key={index} className="px-4 py-4">
                        <span className="text-sm font-medium text-foreground">{rate.rate}%</span>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
    </>
  );
}
