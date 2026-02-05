"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getGrades, getAssignments } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function StudentGradesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("Fall 2025");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({
    overallAverage: 0,
    gpa: 0,
    trend: 0,
    assignmentsGraded: 0,
    totalSubmitted: 0,
    bestPerformance: { course: 'N/A', score: 0 },
  });
  const [courses, setCourses] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);

  useEffect(() => {
    loadGrades();
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const loadGrades = async () => {
    setIsLoading(true);
    try {
      const [gradesResult, assignmentsResult] = await Promise.all([
        getGrades(),
        getAssignments()
      ]);
      
      if (gradesResult.success) {
        const gradesData = gradesResult.data || [];
        const assignmentsData = assignmentsResult.success ? (assignmentsResult.data || []) : [];
        setGrades(gradesData);
        
        // Calculate stats - convert scores to percentages first
        const gradedAssignments = gradesData.filter(g => g.score !== null);
        // Calculate percentage for each grade: (score / total_points) * 100
        const totalPercentage = gradedAssignments.reduce((sum, g) => {
          const maxPoints = g.total_points || 100;
          const percentage = maxPoints > 0 ? (g.score / maxPoints) * 100 : 0;
          return sum + percentage;
        }, 0);
        const avgScore = gradedAssignments.length > 0 ? Math.round(totalPercentage / gradedAssignments.length) : 0;
        
        // Calculate GPA (simple conversion)
        const gpa = avgScore >= 90 ? 4.0 : avgScore >= 80 ? 3.0 : avgScore >= 70 ? 2.0 : avgScore >= 60 ? 1.0 : 0;
        
        // Find best performance (by percentage)
        const bestGrade = gradedAssignments.reduce((best, g) => {
          const gPercentage = g.total_points > 0 ? (g.score / g.total_points) * 100 : 0;
          const bestPercentage = best && best.total_points > 0 ? (best.score / best.total_points) * 100 : 0;
          return (!best || gPercentage > bestPercentage) ? g : best;
        }, null);
        
        const bestPercentage = bestGrade && bestGrade.total_points > 0 
          ? Math.round((bestGrade.score / bestGrade.total_points) * 100) 
          : 0;
        
        setStats({
          overallAverage: avgScore,
          gpa: gpa.toFixed(1),
          trend: 2.4, // Would need historical data to calculate
          assignmentsGraded: gradedAssignments.length,
          totalSubmitted: gradesData.length,
          bestPerformance: {
            course: bestGrade?.assignment_title || 'N/A',
            score: bestPercentage,
          },
        });
        
        // Calculate grade distribution based on percentages
        const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        gradedAssignments.forEach(g => {
          const maxPoints = g.total_points || 100;
          const percentage = maxPoints > 0 ? (g.score / maxPoints) * 100 : 0;
          if (percentage >= 90) distribution.A++;
          else if (percentage >= 80) distribution.B++;
          else if (percentage >= 70) distribution.C++;
          else if (percentage >= 60) distribution.D++;
          else distribution.F++;
        });
        
        setGradeDistribution([
          { grade: "A", count: distribution.A, color: "#14B8A6" },
          { grade: "B", count: distribution.B, color: "#22C55E" },
          { grade: "C", count: distribution.C, color: "#EAB308" },
          { grade: "D", count: distribution.D, color: "#F97316" },
        ]);
        
        // Group by course
        const courseMap = {};
        gradesData.forEach(grade => {
          const courseCode = grade.course_code || grade.assignment_course_code || 'MISC';
          if (!courseMap[courseCode]) {
            courseMap[courseCode] = {
              id: courseCode,
              code: courseCode,
              name: grade.course_name || grade.assignment_title || courseCode,
              instructor: grade.instructor_name || 'Instructor',
              assignments: [],
              totalPercentage: 0,
              count: 0,
            };
          }
          
          if (grade.score !== null) {
            // Calculate percentage for this grade
            const maxPoints = grade.total_points || 100;
            const percentage = maxPoints > 0 ? (grade.score / maxPoints) * 100 : 0;
            courseMap[courseCode].totalPercentage += percentage;
            courseMap[courseCode].count++;
          }
          
          // Calculate percentage for display
          const maxPoints = grade.total_points || 100;
          const percentage = maxPoints > 0 ? Math.round((grade.score / maxPoints) * 100) : 0;
          
          courseMap[courseCode].assignments.push({
            name: grade.assignment_title || 'Assignment',
            dueDate: grade.assignment_due_date || grade.due_date 
              ? new Date(grade.assignment_due_date || grade.due_date).toLocaleDateString() 
              : 'N/A',
            submitted: grade.is_late ? 'Late' : 'On Time',
            isLate: grade.is_late || false,
            score: grade.score || 0,
            maxScore: grade.total_points || 100,
            percentage: percentage,
            letterGrade: getLetterGrade(percentage),
            submissionId: grade.submission_id,
          });
        });
        
        // Calculate averages and letter grades (using percentage average)
        const coursesList = Object.values(courseMap).map(course => ({
          ...course,
          average: course.count > 0 ? Math.round(course.totalPercentage / course.count) : 0,
          letterGrade: getLetterGrade(course.count > 0 ? course.totalPercentage / course.count : 0),
          icon: 'code',
        }));
        
        setCourses(coursesList);
        if (coursesList.length > 0) {
          setExpandedCourse(coursesList[0].id);
        }
      }
    } catch (error) {
      logger.error("Failed to load grades", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLetterGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Score progression for chart (would need historical data)
  const scoreProgression = [
    { date: "Sep 1", score: 72, average: 70 },
    { date: "Sep 15", score: 78, average: 72 },
    { date: "Oct 1", score: 85, average: 75 },
    { date: "Oct 15", score: 82, average: 77 },
    { date: "Nov 1", score: 88, average: 78 },
    { date: "Nov 15", score: 90, average: 80 },
  ];

  const renderCourseIcon = (icon) => {
    switch (icon) {
      case "code":
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        );
      case "math":
        return (
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "physics":
        return (
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        );
    }
  };

  // Calculate donut chart path
  const totalGrades = gradeDistribution.reduce((sum, g) => sum + g.count, 0);
  let cumulativePercentage = 0;

  const getScoreBarColor = (score) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-green-400";
    if (score >= 70) return "bg-amber-400";
    return "bg-red-400";
  };

  const handleExport = () => {
    if (grades.length === 0) return;
    
    // Create CSV content
    const headers = ["Assignment", "Course", "Score", "Letter Grade", "Submitted Date", "Feedback"];
    const rows = grades.map(grade => [
      grade.assignment_title || "Assignment",
      grade.course_code || grade.assignment_course_code || "N/A",
      grade.score !== null ? `${grade.score}%` : "Not Graded",
      grade.score !== null ? getLetterGrade(grade.score) : "N/A",
      grade.submitted_at ? new Date(grade.submitted_at).toLocaleDateString() : "N/A",
      (grade.feedback || "").replace(/"/g, '""') // Escape quotes for CSV
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `my-grades-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">My Grades</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your academic progress and analytics.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Semester Select */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-card border border-border rounded-lg">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-sm font-medium text-foreground bg-transparent border-0 focus:ring-0 cursor-pointer pr-6"
            >
              <option value="Fall 2025">Fall 2025</option>
              <option value="Spring 2025">Spring 2025</option>
              <option value="Fall 2024">Fall 2024</option>
            </select>
          </div>
          {/* Export Button */}
          <Button 
            onClick={handleExport}
            disabled={grades.length === 0}
            className="bg-teal-500 hover:bg-teal-600 gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Overall Average */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Average</span>
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {stats.trend}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">{stats.overallAverage}%</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">GPA {stats.gpa}</span>
                </div>
              </div>

              {/* Assignments Graded */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Assignments Graded</span>
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">{stats.assignmentsGraded}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/ {stats.totalSubmitted} Submitted</span>
                </div>
              </div>

              {/* Best Performance */}
              <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Best Performance</span>
                  <span className="text-xl">🌳</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-foreground mb-2 truncate">{stats.bestPerformance.course}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${stats.bestPerformance.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-green-600">{stats.bestPerformance.score}%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Score Progression Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Score Progression</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground">Average</span>
                </div>
              </div>
            </div>
            {/* Chart Area */}
            <div className="h-48 relative">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
              </div>
              {/* Chart SVG */}
              <svg className="w-full h-full pl-10" viewBox="0 0 500 180" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="0" x2="500" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="45" x2="500" y2="45" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="135" x2="500" y2="135" stroke="#f1f5f9" strokeWidth="1" />
                
                {/* Average line (gray) */}
                <path
                  d="M 0 108 L 83 99 L 167 90 L 250 83 L 333 79 L 417 72 L 500 72"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                
                {/* Score line (blue) with area */}
                <path
                  d="M 0 99 L 83 79 L 167 54 L 250 65 L 333 43 L 417 36 L 500 36"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <path
                  d="M 0 99 L 83 79 L 167 54 L 250 65 L 333 43 L 417 36 L 500 36 L 500 180 L 0 180 Z"
                  fill="url(#blueGradient)"
                  opacity="0.1"
                />
                
                {/* Data points */}
                <circle cx="0" cy="99" r="4" fill="#3b82f6" />
                <circle cx="83" cy="79" r="4" fill="#3b82f6" />
                <circle cx="167" cy="54" r="4" fill="#3b82f6" />
                <circle cx="250" cy="65" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="333" cy="43" r="4" fill="#3b82f6" />
                <circle cx="417" cy="36" r="4" fill="#3b82f6" />
                <circle cx="500" cy="36" r="4" fill="#3b82f6" />
                
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2 pl-10">
                {scoreProgression.map((point, index) => (
                  <span key={index}>{point.date}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
            <h3 className="font-semibold text-foreground mb-4">Grade Distribution</h3>
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Donut Chart */}
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {gradeDistribution.map((item, index) => {
                    const percentage = (item.count / totalGrades) * 100;
                    const dashArray = `${percentage} ${100 - percentage}`;
                    const dashOffset = -cumulativePercentage;
                    cumulativePercentage += percentage;
                    
                    return (
                      <circle
                        key={item.grade}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{totalGrades}</span>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {gradeDistribution.map((item) => (
                  <div key={item.grade} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.grade} <span className="text-muted-foreground/60">({item.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grades by Course */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Grades by Course</h3>
          </div>
          
          <div className="divide-y divide-border/50">
            {courses.map((course) => (
              <div key={course.id}>
                {/* Course Header Row */}
                <button
                  onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {renderCourseIcon(course.icon)}
                    <div className="text-left">
                      <p className="font-medium text-foreground">
                        {course.code} - {course.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{course.instructor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{course.average}%</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        course.letterGrade === "A" ? "bg-teal-100 text-teal-700" :
                        course.letterGrade === "B" ? "bg-green-100 text-green-700" :
                        course.letterGrade === "C" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {course.letterGrade}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedCourse === course.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Assignments Table */}
                {expandedCourse === course.id && (
                  <div className="px-6 pb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="text-left py-3 font-medium">Assignment</th>
                          <th className="text-left py-3 font-medium">Submitted</th>
                          <th className="text-left py-3 font-medium">Score</th>
                          <th className="text-left py-3 font-medium">Grade</th>
                          <th className="text-right py-3 font-medium">Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {course.assignments.map((assignment, index) => (
                          <tr key={index} className="text-sm">
                            <td className="py-3 text-foreground">{assignment.name}</td>
                            <td className="py-3">
                              <span className={`flex items-center gap-1 ${
                                assignment.isLate ? "text-amber-600" : "text-green-600"
                              }`}>
                                {assignment.isLate ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {assignment.submitted}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getScoreBarColor(assignment.percentage)}`}
                                    style={{ width: `${assignment.percentage}%` }}
                                  />
                                </div>
                                <span className="text-foreground font-medium">{assignment.score}/{assignment.maxScore}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                assignment.letterGrade === "A" ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" :
                                assignment.letterGrade === "B" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                assignment.letterGrade === "C" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}>
                                {assignment.letterGrade}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                href={`/student/results/${assignment.submissionId}`}
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </>
  );
}
