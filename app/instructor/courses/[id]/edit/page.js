'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const currentYear = new Date().getFullYear();
const terms = ['Spring', 'Summer', 'Fall', 'Winter'];
const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    term: '',
    year: currentYear,
    max_students: 100,
    status: 'active',
  });

  useEffect(() => {
    if (params.id) {
      fetchCourse();
    }
  }, [params.id]);

  async function fetchCourse() {
    try {
      setLoading(true);
      const response = await apiClient.get(`/courses/${params.id}`);
      if (response.success) {
        setFormData({
          code: response.data.code || '',
          name: response.data.name || '',
          description: response.data.description || '',
          term: response.data.term || '',
          year: response.data.year || currentYear,
          max_students: response.data.max_students || 100,
          status: response.data.status || 'active',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Course not found',
          variant: 'destructive',
        });
        router.push('/instructor/courses');
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

  async function handleSubmit(e) {
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
      setSaving(true);
      const response = await apiClient.put(`/courses/${params.id}`, formData);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Course updated successfully',
        });
        router.push(`/instructor/courses/${params.id}`);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update course',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateCode() {
    setRegenerateConfirmOpen(true);
  }

  async function confirmRegenerateCode() {
    try {
      setRegeneratingCode(true);
      const response = await apiClient.post(`/courses/${params.id}/regenerate-code`);

      if (response.success) {
        toast({
          title: 'Success',
          description: `New enrollment code: ${response.data.enrollment_code}`,
        });
        setFormData(prev => ({...prev, enrollment_code: response.data.enrollment_code}));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to regenerate code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate code',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingCode(false);
      setRegenerateConfirmOpen(false);
    }
  }

  function cancelRegenerateCode() {
    setRegenerateConfirmOpen(false);
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-1/4 mb-6" />
        <Skeleton className="h-96 w-full" />
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/instructor/courses/${params.id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Course</h1>
          <p className="text-muted-foreground mt-1">Update course settings and details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>Basic course details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code *</Label>
                    <Input
                      id="code"
                      placeholder="e.g., CS101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Course Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Introduction to Computer Science"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter course description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
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
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
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
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max_students">Max Students</Label>
                  <Input
                    id="max_students"
                    type="number"
                    min={1}
                    max={1000}
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingCode ? 'animate-spin' : ''}`} />
                  Regenerate Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/instructor/courses/${params.id}`)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Regenerate Code Confirmation Dialog */}
      <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Regenerate Enrollment Code</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to regenerate the enrollment code? The old code will no longer work.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRegenerateCode}>
              Cancel
            </Button>
            <Button onClick={confirmRegenerateCode} disabled={regeneratingCode}>
              {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
