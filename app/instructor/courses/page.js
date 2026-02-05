'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient, archiveCourse, unarchiveCourse } from '@/lib/api-client';
import { 
  BookOpen, Plus, Users, FileText, Copy, RefreshCw, 
  Settings, Trash2, MoreVertical, GraduationCap, Archive, ArchiveRestore 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const currentYear = new Date().getFullYear();
const terms = ['Spring', 'Summer', 'Fall', 'Winter'];
const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

export default function InstructorCoursesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState({ courseId: null, courseName: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    term: '',
    year: currentYear,
    max_students: 100,
  });

  // Filter courses based on archive status
  const activeCourses = courses.filter(c => c.status !== 'archived');
  const archivedCourses = courses.filter(c => c.status === 'archived');
  const displayedCourses = showArchived ? archivedCourses : activeCourses;

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      const response = await apiClient.get('/courses');
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

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Course code and name are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await apiClient.post('/courses', formData);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Course "${response.data.name}" created successfully`,
        });
        setCreateDialogOpen(false);
        setFormData({
          code: '',
          name: '',
          description: '',
          term: '',
          year: currentYear,
          max_students: 100,
        });
        fetchCourses();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create course',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCourse(courseId, courseName) {
    setDeleteConfirmData({ courseId, courseName });
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteCourse() {
    if (!deleteConfirmData.courseId) return;

    try {
      await apiClient.delete(`/courses/${deleteConfirmData.courseId}`);
      toast({
        title: 'Success',
        description: `Course "${deleteConfirmData.courseName}" deleted`,
      });
      fetchCourses();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteConfirmData({ courseId: null, courseName: '' });
    }
  }

  function cancelDeleteCourse() {
    setDeleteConfirmOpen(false);
    setDeleteConfirmData({ courseId: null, courseName: '' });
  }

  async function handleRegenerateCode(courseId) {
    try {
      const response = await apiClient.post(`/courses/${courseId}/regenerate-code`);
      if (response.success) {
        toast({
          title: 'Success',
          description: `New enrollment code: ${response.data.enrollment_code}`,
        });
        fetchCourses();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate code',
        variant: 'destructive',
      });
    }
  }

  function copyEnrollmentCode(code) {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: `Enrollment code "${code}" copied to clipboard`,
    });
  }

  async function handleArchiveCourse(courseId, courseName) {
    try {
      const response = await archiveCourse(courseId);
      if (response.success) {
        toast({
          title: 'Archived',
          description: `Course "${courseName}" has been archived`,
        });
        fetchCourses();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to archive course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive course',
        variant: 'destructive',
      });
    }
  }

  async function handleUnarchiveCourse(courseId, courseName) {
    try {
      const response = await unarchiveCourse(courseId);
      if (response.success) {
        toast({
          title: 'Restored',
          description: `Course "${courseName}" has been restored`,
        });
        fetchCourses();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to restore course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore course',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <Skeleton className="h-6 w-24 mb-3" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
            {showArchived ? 'Archived Courses' : 'Courses'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {showArchived 
              ? `${archivedCourses.length} archived course${archivedCourses.length !== 1 ? 's' : ''}`
              : 'Manage your courses and student enrollments'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            {showArchived ? (
              <>
                <BookOpen className="h-4 w-4" />
                Active Courses
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archived ({archivedCourses.length})
              </>
            )}
          </Button>

          {!showArchived && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Create a new course and share the enrollment code with students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code *</Label>
                    <Input
                      id="code"
                      placeholder="CS101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_students">Max Students</Label>
                    <Input
                      id="max_students"
                      type="number"
                      min={1}
                      value={formData.max_students}
                      onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Course Name *</Label>
                  <Input
                    id="name"
                    placeholder="Introduction to Computer Science"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief course description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="term">Term</Label>
                    <Select
                      value={formData.term}
                      onValueChange={(value) => setFormData({ ...formData, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((term) => (
                          <SelectItem key={term} value={term}>{term}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={formData.year.toString()}
                      onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>


              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      {displayedCourses.length === 0 ? (
        <div className="bg-card rounded-xl border border-border text-center py-12 px-4">
          {showArchived ? (
            <>
              <Archive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Archived Courses</h2>
              <p className="text-muted-foreground mb-6">
                You haven't archived any courses yet.
              </p>
              <Button onClick={() => setShowArchived(false)} variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                View Active Courses
              </Button>
            </>
          ) : (
            <>
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Courses Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first course to start organizing assignments and students.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Course
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayedCourses.map((course) => (
            <div key={course.id} className="bg-card rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        course.status === 'archived' 
                          ? 'bg-muted' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {course.status === 'archived' ? (
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{course.code}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {course.name}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/instructor/courses/${course.id}/edit`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      {course.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => handleRegenerateCode(course.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          New Enrollment Code
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {course.status === 'archived' ? (
                        <DropdownMenuItem onClick={() => handleUnarchiveCourse(course.id, course.name)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore Course
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleArchiveCourse(course.id, course.name)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Course
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {course.term && course.year && (
                  <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0 mb-4">
                    {course.term} {course.year}
                  </Badge>
                )}
                {/* Enrollment Code */}
                <div className="bg-muted/50 p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Enrollment Code</p>
                      <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                        {course.enrollment_code}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyEnrollmentCode(course.enrollment_code)}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{course.enrolled_count || 0} students</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{course.assignment_count || 0} assignments</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => router.push(`/instructor/courses/${course.id}`)}
                    >
                      Manage
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/instructor/courses/${course.id}/roster`)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Course Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Delete Course</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to delete "{deleteConfirmData.courseName}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteCourse}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCourse}>
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
