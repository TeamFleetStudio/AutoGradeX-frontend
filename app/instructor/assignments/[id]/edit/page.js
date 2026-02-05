"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAssignment, updateAssignment } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function EditAssignmentPage({ params }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_code: "",
    due_date: "",
    total_points: 100,
    max_resubmissions: 2,
    status: "draft",
    reference_answer: ""
  });

  useEffect(() => {
    loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const result = await getAssignment(assignmentId);
      if (result.success && result.data) {
        const a = result.data;
        setFormData({
          title: a.title || "",
          description: a.description || "",
          course_code: a.course_code || "",
          due_date: a.due_date ? a.due_date.slice(0, 16) : "",
          total_points: a.total_points || 100,
          max_resubmissions: a.max_resubmissions || 2,
          status: a.status || "draft",
          reference_answer: a.reference_answer || ""
        });
      } else {
        setError("Assignment not found");
      }
    } catch (error) {
      logger.error("Failed to load assignment", error);
      setError("Failed to load assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await updateAssignment(assignmentId, {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
      });
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/instructor/assignments/${assignmentId}`);
        }, 1500);
      } else {
        setError(result.error || "Failed to update assignment");
      }
    } catch (error) {
      setError("Failed to update assignment");
    } finally {
      setIsSaving(false);
    }
  };

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

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error && !formData.title ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Assignment Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/instructor/assignments">
              <Button>Back to Assignments</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">Edit Assignment</h1>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-6">
                Assignment updated successfully! Redirecting...
              </div>
            )}

            {error && formData.title && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter assignment title"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter assignment description"
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="course_code">Course Code</Label>
                  <Input
                    id="course_code"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    placeholder="e.g., CS101"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="total_points">Total Points</Label>
                  <Input
                    id="total_points"
                    type="number"
                    min="1"
                    value={formData.total_points}
                    onChange={(e) => setFormData({ ...formData, total_points: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="max_resubmissions">Max Resubmissions</Label>
                  <Input
                    id="max_resubmissions"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.max_resubmissions}
                    onChange={(e) => setFormData({ ...formData, max_resubmissions: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="reference_answer">Reference Answer (for AI grading)</Label>
                  <Textarea
                    id="reference_answer"
                    value={formData.reference_answer}
                    onChange={(e) => setFormData({ ...formData, reference_answer: e.target.value })}
                    placeholder="Enter reference answer for AI grading..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                <Link href={`/instructor/assignments/${assignmentId}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </>
        )}
    </div>
  );
}
