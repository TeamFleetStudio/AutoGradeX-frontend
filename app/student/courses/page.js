'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

export default function StudentCoursesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [dropConfirmData, setDropConfirmData] = useState({ courseId: null, courseName: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      const response = await apiClient.get('/courses/my-courses');
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!enrollmentCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an enrollment code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setEnrolling(true);
      const response = await apiClient.post('/courses/enroll', {
        enrollment_code: enrollmentCode.trim().toUpperCase(),
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully enrolled in ${response.data.course.name}`,
        });
        setEnrollDialogOpen(false);
        setEnrollmentCode('');
        fetchCourses();
      } else {
        toast({
          title: 'Enrollment Failed',
          description: response.error || 'Failed to enroll. Please check the code and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Enrollment Failed',
        description: 'Failed to enroll. Please check the code and try again.',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenroll(courseId, courseName) {
    setDropConfirmData({ courseId, courseName });
    setDropConfirmOpen(true);
  }

  async function confirmDrop() {
    if (!dropConfirmData.courseId) return;

    try {
      await apiClient.delete(`/courses/${dropConfirmData.courseId}/unenroll`);
      toast({
        title: 'Success',
        description: `Dropped from ${dropConfirmData.courseName}`,
      });
      fetchCourses();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to drop course',
        variant: 'destructive',
      });
    } finally {
      setDropConfirmOpen(false);
      setDropConfirmData({ courseId: null, courseName: '' });
    }
  }

  function cancelDrop() {
    setDropConfirmOpen(false);
    setDropConfirmData({ courseId: null, courseName: '' });
  }

  if (loading) {
    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card rounded-xl border border-border p-5">
              <Skeleton className="h-5 w-24 mb-3" />
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground mt-1">
            View your enrolled courses and join new ones
          </p>
        </div>

        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Join Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Course</DialogTitle>
              <DialogDescription>
                Enter the enrollment code provided by your instructor to join a course.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEnroll}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="enrollment_code">Enrollment Code</Label>
                  <Input
                    id="enrollment_code"
                    placeholder="e.g., ABC123"
                    value={enrollmentCode}
                    onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    autoComplete="off"
                  />
                  <p className="text-sm text-muted-foreground">
                    The code is 6 characters and is not case-sensitive.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={enrolling}>
                  {enrolling ? 'Joining...' : 'Join Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card rounded-xl border border-border text-center py-12">
          <svg className="h-16 w-16 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Courses Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven&apos;t enrolled in any courses. Get started by joining a course with an enrollment code from your instructor.
          </p>
          <Button onClick={() => setEnrollDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Join Your First Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-lg font-semibold text-foreground">{course.code}</span>
                  </div>
                  <p className="text-muted-foreground font-medium">{course.name}</p>
                </div>
                {course.term && course.year && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    {course.term} {course.year}
                  </span>
                )}
              </div>

              {/* Description */}
              {course.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}

              {/* Stats */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Instructor: {course.instructor_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{course.active_assignments} active assignment{course.active_assignments !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Enrolled {new Date(course.enrolled_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push(`/student/courses/${course.id}`)}
                >
                  View Course
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnenroll(course.id, course.name)}
                  title="Drop Course"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Course Confirmation Dialog */}
      <Dialog open={dropConfirmOpen} onOpenChange={setDropConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Drop Course</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to drop "{dropConfirmData.courseName}"? You can re-enroll later with the enrollment code.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDrop}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDrop}>
              Drop Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
