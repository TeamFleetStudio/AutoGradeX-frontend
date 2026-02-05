"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getAssignments, getSubmissions } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function StudentCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch assignments and submissions
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, submissionsRes] = await Promise.all([
        getAssignments(),
        getSubmissions()
      ]);
      
      if (assignmentsRes.success && assignmentsRes.data) {
        setAssignments(assignmentsRes.data);
      }
      if (submissionsRes.success && submissionsRes.data) {
        setSubmissions(submissionsRes.data);
      }
    } catch (error) {
      logger.error("Failed to load calendar data", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Build calendar data from real assignments
  const buildCalendarData = () => {
    const data = {};
    const colors = ["blue", "amber", "violet", "red", "green"];
    
    assignments.forEach((assignment, index) => {
      if (assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        const dateKey = formatDateKey(dueDate);
        
        if (!data[dateKey]) {
          data[dateKey] = [];
        }
        
        const color = colors[index % colors.length];
        data[dateKey].push({
          id: assignment.id,
          title: assignment.title.length > 10 ? assignment.title.slice(0, 10) + "..." : assignment.title,
          fullTitle: assignment.title,
          color
        });
      }
    });
    
    // Add "+X more" indicator if more than 3 assignments
    Object.keys(data).forEach(key => {
      if (data[key].length > 3) {
        const extra = data[key].length - 2;
        data[key] = [...data[key].slice(0, 2), { title: `+${extra} more`, color: "gray" }];
      }
    });
    
    return data;
  };

  // Get assignments for selected date
  const getSelectedDayAssignments = () => {
    const dateKey = formatDateKey(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return assignments
      .filter(assignment => {
        if (!assignment.due_date) return false;
        const dueDate = new Date(assignment.due_date);
        return formatDateKey(dueDate) === dateKey;
      })
      .map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const hasSubmission = submissions.some(s => s.assignment_id === assignment.id);
        const isOverdue = dueDate < today && !hasSubmission;
        const isDueSoon = !isOverdue && dueDate <= new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        let status = "upcoming";
        let submissionStatus = "Not submitted";
        
        if (hasSubmission) {
          status = "submitted";
          submissionStatus = "Turned in";
        } else if (isOverdue) {
          status = "overdue";
          submissionStatus = "Missing";
        } else if (isDueSoon) {
          status = "due-soon";
        }
        
        return {
          id: assignment.id,
          title: assignment.title,
          course: assignment.course_code || "General",
          instructor: assignment.instructor_name || "Instructor",
          status,
          time: dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          submissionStatus
        };
      });
  };

  // Get upcoming assignments for next 7 days
  const getUpcomingAssignments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const icons = ["physics", "history", "design"];
    
    return assignments
      .filter(assignment => {
        if (!assignment.due_date) return false;
        const dueDate = new Date(assignment.due_date);
        return dueDate >= today && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 3)
      .map((assignment, index) => {
        const dueDate = new Date(assignment.due_date);
        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        
        let dateStr, timeLeft;
        const urgent = diffDays <= 1;
        
        if (diffDays === 0) {
          dateStr = `Today, ${dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
          timeLeft = `${diffHours}h remaining`;
        } else if (diffDays === 1) {
          dateStr = `Tomorrow, ${dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
          timeLeft = `${diffHours}h remaining`;
        } else {
          dateStr = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + 
            `, ${dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
          timeLeft = `${diffDays} days left`;
        }
        
        return {
          id: assignment.id,
          title: assignment.title,
          date: dateStr,
          timeLeft,
          icon: icons[index % icons.length],
          urgent
        };
      });
  };

  const assignmentsData = buildCalendarData();
  const selectedDayAssignments = getSelectedDayAssignments();
  const upcomingAssignments = getUpcomingAssignments();

  const renderUpcomingIcon = (icon) => {
    switch (icon) {
      case "physics":
        return (
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        );
      case "history":
        return (
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        );
      case "design":
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    
    return days;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const days = getDaysInMonth(currentDate);

  const getAssignmentDotColor = (color) => {
    switch (color) {
      case "blue": return "bg-blue-500";
      case "red": return "bg-red-500";
      case "amber": return "bg-amber-500";
      case "violet": return "bg-violet-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <button onClick={goToPrevMonth} className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={goToNextMonth} className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Today
            </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Calendar Grid */}
          <div className="flex-1 bg-card rounded-xl border border-border overflow-x-auto">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((day) => (
                <div key={day} className="py-3 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((dayInfo, index) => {
                const dateKey = formatDateKey(dayInfo.date);
                const dayAssignments = assignmentsData[dateKey] || [];
                const isSelectedDay = isSelected(dayInfo.date);
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dayInfo.date)}
                    className={`min-h-[80px] p-2 border-b border-r border-border text-left transition-colors hover:bg-muted/50 ${
                      !dayInfo.isCurrentMonth ? "bg-muted/30" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                        isSelectedDay
                          ? "bg-blue-600 text-white"
                          : isToday(dayInfo.date)
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : dayInfo.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dayInfo.day}
                    </span>
                    {dayAssignments.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayAssignments.slice(0, 3).map((assignment, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1 text-xs truncate ${
                              assignment.color === "gray" ? "text-muted-foreground" : ""
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getAssignmentDotColor(assignment.color)}`} />
                            <span className="truncate">{assignment.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Selected Day Details */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Selected Day Header */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDayAssignments.length === 0 
                      ? "No assignments due" 
                      : `${selectedDayAssignments.length} assignment${selectedDayAssignments.length !== 1 ? 's' : ''} due`}
                  </p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Assignment Cards */}
              <div className="space-y-3">
                {selectedDayAssignments.length === 0 ? (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm text-muted-foreground">No assignments due on this day</p>
                  </div>
                ) : selectedDayAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      assignment.status === "due-soon"
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500"
                        : assignment.status === "overdue"
                        ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`text-xs font-medium ${
                          assignment.status === "due-soon"
                            ? "text-amber-600 dark:text-amber-400"
                            : assignment.status === "overdue"
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {assignment.status === "due-soon"
                          ? "Due Soon"
                          : assignment.status === "overdue"
                          ? "Overdue"
                          : "Submitted"}
                      </span>
                      <span className="text-xs text-muted-foreground">{assignment.time}</span>
                    </div>
                    <h4 className="font-medium text-foreground mb-1">{assignment.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {assignment.course} • {assignment.instructor}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${
                          assignment.status === "overdue" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                        }`}
                      >
                        {assignment.submissionStatus}
                      </span>
                      <Link
                        href={`/student/submit/${assignment.id}`}
                        className={`text-xs font-medium ${
                          assignment.status === "overdue"
                            ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            : assignment.status === "submitted"
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        }`}
                      >
                        {assignment.status === "overdue"
                          ? "Submit Late →"
                          : assignment.status === "submitted"
                          ? "Review"
                          : "View →"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Next 7 Days Section */}
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-4">Next 7 Days</h3>
          {upcomingAssignments.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-muted-foreground">No upcoming assignments in the next 7 days</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-4"
                >
                  {renderUpcomingIcon(assignment.icon)}
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{assignment.title}</h4>
                    <p className="text-xs text-muted-foreground">{assignment.date}</p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      assignment.urgent ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    {assignment.timeLeft}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
  );
}
