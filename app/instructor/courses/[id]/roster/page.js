'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { 
  ArrowLeft, Users, Search, UserPlus, UserMinus, 
  Mail, GraduationCap, TrendingUp, AlertCircle 
} from 'lucide-react';

export default function CourseRosterPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeConfirmData, setRemoveConfirmData] = useState({ studentId: null, studentName: '' });

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const [courseRes, rosterRes] = await Promise.all([
        apiClient.get(`/courses/${params.id}`),
        apiClient.get(`/courses/${params.id}/roster`),
      ]);

      if (courseRes.success) {
        setCourse(courseRes.data);
      }
      if (rosterRes.success) {
        setRoster(rosterRes.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load roster',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveStudent(studentId, studentName) {
    setRemoveConfirmData({ studentId, studentName });
    setRemoveConfirmOpen(true);
  }

  async function confirmRemoveStudent() {
    if (!removeConfirmData.studentId) return;

    try {
      await apiClient.delete(`/courses/${params.id}/students/${removeConfirmData.studentId}`);
      toast({
        title: 'Success',
        description: `${removeConfirmData.studentName} removed from course`,
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    } finally {
      setRemoveConfirmOpen(false);
      setRemoveConfirmData({ studentId: null, studentName: '' });
    }
  }

  function cancelRemoveStudent() {
    setRemoveConfirmOpen(false);
    setRemoveConfirmData({ studentId: null, studentName: '' });
  }

  function getScoreStatus(score) {
    if (score === null || score === undefined) return null;
    if (score >= 90) return { variant: 'default', label: 'Excellent' };
    if (score >= 70) return { variant: 'secondary', label: 'Good' };
    if (score >= 60) return { variant: 'outline', label: 'Fair' };
    return { variant: 'destructive', label: 'At Risk' };
  }

  const filteredRoster = roster.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.student_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.student_number?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
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
            <Button onClick={() => router.push('/instructor/courses')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => router.push('/instructor/courses')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Course Roster</h1>
          </div>
          <p className="text-muted-foreground">
            {course.code} - {course.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {roster.length} student{roster.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Enrolled</p>
                <p className="text-2xl font-bold">{roster.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold">
                  {roster.length > 0 
                    ? Math.round(roster.reduce((sum, s) => sum + (parseFloat(s.avg_score) || 0), 0) / roster.filter(s => s.avg_score).length || 0)
                    : '-'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">
                  {roster.reduce((sum, s) => sum + (parseInt(s.submissions_count) || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold">
                  {roster.filter(s => s.avg_score && parseFloat(s.avg_score) < 60).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roster Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Enrolled Students</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoster.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No students match your search' : 'No students enrolled yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Share the enrollment code <strong>{course.enrollment_code}</strong> with your students
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoster.map((student) => {
                  const status = getScoreStatus(student.avg_score ? parseFloat(student.avg_score) : null);
                  return (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.student_name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{student.student_number || '-'}</TableCell>
                      <TableCell>{student.submissions_count || 0}</TableCell>
                      <TableCell>
                        {student.avg_score ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{Math.round(parseFloat(student.avg_score))}%</span>
                            {status && <Badge variant={status.variant}>{status.label}</Badge>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(student.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/instructor/students/${student.user_id}`)}
                            title="View student"
                          >
                            <GraduationCap className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`mailto:${student.email}`)}
                            title="Email student"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStudent(student.student_id, student.student_name)}
                            title="Remove from course"
                            className="text-destructive hover:text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Remove Student Confirmation Dialog */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Remove Student</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to remove "{removeConfirmData.studentName}" from this course?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRemoveStudent}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveStudent}>
              Remove Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
