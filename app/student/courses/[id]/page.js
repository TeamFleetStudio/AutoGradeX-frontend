'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { 
  BookOpen, ArrowLeft, FileText, Calendar, Clock, 
  CheckCircle2, AlertCircle, User, GraduationCap 
} from 'lucide-react';

export default function StudentCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCourseData();
    }
  }, [params.id]);

  async function fetchCourseData() {
    try {
      setLoading(true);
      const [courseRes, assignmentsRes] = await Promise.all([
        apiClient.get(`/courses/${params.id}`),
        apiClient.get(`/courses/${params.id}/assignments`),
      ]);

      if (courseRes.success) {
        setCourse(courseRes.data);
      }
      if (assignmentsRes.success) {
        setAssignments(assignmentsRes.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function getAssignmentStatus(assignment) {
    if (assignment.my_submissions > 0) {
      return { label: 'Submitted', variant: 'default', icon: CheckCircle2 };
    }
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return { label: 'Overdue', variant: 'destructive', icon: AlertCircle };
    }
    return { label: 'Pending', variant: 'secondary', icon: Clock };
  }

  function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push('/student/courses')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submittedCount = assignments.filter(a => a.my_submissions > 0).length;
  const progressPercent = assignments.length > 0 ? (submittedCount / assignments.length) * 100 : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => router.push('/student/courses')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>

      {/* Course Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <Badge variant="outline">{course.code}</Badge>
                {course.term && course.year && (
                  <Badge variant="secondary">{course.term} {course.year}</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{course.name}</CardTitle>
              {course.description && (
                <CardDescription className="mt-2">
                  {course.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instructor</p>
                <p className="font-medium">{course.instructor_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="font-medium">{course.assignment_count || 0} total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="font-medium">{submittedCount}/{assignments.length} submitted</p>
              </div>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Assignment Completion</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Assignments ({assignments.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({assignments.filter(a => !a.my_submissions).length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({submittedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderAssignmentsList(assignments)}
        </TabsContent>
        <TabsContent value="pending" className="space-y-4">
          {renderAssignmentsList(assignments.filter(a => !a.my_submissions))}
        </TabsContent>
        <TabsContent value="submitted" className="space-y-4">
          {renderAssignmentsList(assignments.filter(a => a.my_submissions > 0))}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderAssignmentsList(list) {
    if (list.length === 0) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No assignments found</p>
          </CardContent>
        </Card>
      );
    }

    return list.map((assignment) => {
      const status = getAssignmentStatus(assignment);
      const StatusIcon = status.icon;
      const daysUntilDue = getDaysUntilDue(assignment.due_date);

      return (
        <Card key={assignment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{assignment.title}</h3>
                  <Badge variant={status.variant}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                
                {assignment.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {assignment.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {assignment.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      {daysUntilDue !== null && daysUntilDue > 0 && (
                        <span className="text-primary">({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left)</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{assignment.total_points} points</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {assignment.my_submissions > 0 ? (
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                  >
                    View Submission
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push(`/student/submit/${assignment.id}`)}
                  >
                    Submit Assignment
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }
}
