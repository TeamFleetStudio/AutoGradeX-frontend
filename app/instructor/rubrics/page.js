"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getRubrics, deleteRubric } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import logger from "@/lib/logger";

export default function InstructorRubricsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [rubrics, setRubrics] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    loadRubricsData();
  }, []);

  // Transform API rubric data to match UI expectations
  const transformRubric = (rubric) => {
    // criteria can be an object or array - count the keys/items
    const criteriaCount = rubric.criteria 
      ? (typeof rubric.criteria === 'object' 
          ? Object.keys(rubric.criteria).length 
          : Array.isArray(rubric.criteria) 
            ? rubric.criteria.length 
            : 0)
      : 0;
    
    return {
      id: rubric.id,
      title: rubric.name || rubric.title || 'Untitled Rubric',
      description: rubric.description || '',
      criteria: criteriaCount,
      points: rubric.total_points || 0,
      usedIn: rubric.used_in_count || 0,
      editedAt: rubric.updated_at 
        ? new Date(rubric.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never',
      isTemplate: rubric.is_template || false,
    };
  };

  const loadRubricsData = async () => {
    setIsLoading(true);
    try {
      const rubricsResult = await getRubrics();
      
      if (rubricsResult.success) {
        // Filter out templates - only show user-created rubrics
        const userRubrics = (rubricsResult.data || []).filter(r => !r.is_template);
        const transformedRubrics = userRubrics.map(transformRubric);
        setRubrics(transformedRubrics);
      }
    } catch (error) {
      logger.error("Failed to load rubrics data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRubric = async (rubricId) => {
    setDeleteConfirmId(rubricId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      const result = await deleteRubric(deleteConfirmId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Rubric deleted successfully',
        });
        setRubrics(prev => prev.filter(r => r.id !== deleteConfirmId));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete rubric',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error("Failed to delete rubric", error);
      toast({
        title: 'Error',
        description: 'Failed to delete rubric',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmId(null);
  };

  // Just show user's rubrics directly
  const filteredRubrics = rubrics;

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case "ESSAY":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "CODING":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "LABS":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
      case "QUIZZES":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Rubrics</h1>
            <p className="text-muted-foreground">Browse and create grading rubrics for your assignments</p>
          </div>
          <Link href="/instructor/rubrics/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Rubric
            </Button>
          </Link>
        </div>

        {/* Rubrics Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filteredRubrics.map((rubric) => (
              <div
                key={rubric.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{rubric.title}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{rubric.description || 'No description'}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>{rubric.criteria} Criteria</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{rubric.points} Points</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">Created {rubric.editedAt}</span>
                  <div className="flex items-center gap-2">
                    {/* Edit Button */}
                    <Link
                      href={`/instructor/rubrics/${rubric.id}`}
                      className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    {/* Delete Button */}
                    <button 
                      onClick={() => handleDeleteRubric(rubric.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRubrics.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No rubrics created yet</h3>
            <p className="text-muted-foreground mb-4">Create your first rubric to get started with grading.</p>
            <Link href="/instructor/rubrics/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Rubric
              </Button>
            </Link>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Delete Rubric</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground py-4">
              Are you sure you want to delete this rubric? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete Rubric
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
