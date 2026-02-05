'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { 
  ArrowLeft, Users, FileText, Settings, 
  Copy, Calendar, BookOpen, GraduationCap,
  TrendingUp, Clock
} from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const [courseRes, statsRes] = await Promise.all([
        apiClient.get(`/courses/${params.id}`),
        apiClient.get(`/courses/${params.id}/stats`).catch(() => ({ success: false })),
      ]);

      if (courseRes.success) {
        setCourse(courseRes.data);
      } else {
        toast({
          title: 'Error',
          description: 'Course not found',
          variant: 'destructive',
        });
        router.push('/instructor/courses');
        return;
      }
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load course',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function copyEnrollmentCode() {
    if (course?.enrollment_code) {
      navigator.clipboard.writeText(course.enrollment_code);
      toast({
        title: 'Copied!',
        description: 'Enrollment code copied to clipboard',
      });
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 mt-6" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/instructor/courses')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/instructor/courses')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
              <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                {course.status || 'active'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {course.code} • {course.term} {course.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/instructor/courses/${params.id}/roster`)}
          >
            <Users className="h-4 w-4 mr-2" />
            View Roster
          </Button>
          <Button onClick={() => router.push(`/instructor/courses/${params.id}/edit`)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Course
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.totalStudents ?? course.enrolled_count ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Students Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.totalAssignments ?? course.assignment_count ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.averageScore ? `${stats.averageScore}%` : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.pendingSubmissions ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Pending Grading</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {course.description || 'No description provided for this course.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your course content and students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/instructor/courses/${params.id}/roster`)}
                >
                  <Users className="h-6 w-6" />
                  <span>Manage Roster</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/instructor/assignments?course_code=${course.code}`)}
                >
                  <FileText className="h-6 w-6" />
                  <span>View Assignments</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/instructor/gradebook?course=${course.code}`)}
                >
                  <GraduationCap className="h-6 w-6" />
                  <span>Gradebook</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/instructor/assignments/new?course=${course.id}`)}
                >
                  <BookOpen className="h-6 w-6" />
                  <span>Create Assignment</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Code</CardTitle>
              <CardDescription>Share this code with students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-4 py-2 rounded-lg font-mono text-lg text-center">
                  {course.enrollment_code || 'N/A'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyEnrollmentCode}
                  disabled={!course.enrollment_code}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Share this code with students to enroll
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Course Code</p>
                <p className="font-medium">{course.code}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Term</p>
                <p className="font-medium">{course.term} {course.year}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Max Students</p>
                <p className="font-medium">{course.max_students || 'Unlimited'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {course.created_at 
                    ? new Date(course.created_at).toLocaleDateString() 
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
