"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getRubric, updateRubric } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function EditRubricPage({ params }) {
  const resolvedParams = use(params);
  const rubricId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState([
    { name: "", description: "", max_points: 25 }
  ]);

  useEffect(() => {
    loadRubric();
  }, [rubricId]);

  const loadRubric = async () => {
    setIsLoading(true);
    try {
      const result = await getRubric(rubricId);
      if (result.success && result.data) {
        const rubric = result.data;
        setName(rubric.name || "");
        setDescription(rubric.description || "");
        
        // Convert criteria object to array format
        if (rubric.criteria) {
          const criteriaArray = Object.entries(rubric.criteria).map(([key, value]) => ({
            name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: value.description || "",
            max_points: value.max_points || 25,
          }));
          setCriteria(criteriaArray.length > 0 ? criteriaArray : [{ name: "", description: "", max_points: 25 }]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load rubric",
          variant: "destructive",
        });
        router.push("/instructor/rubrics");
      }
    } catch (error) {
      logger.error("Failed to load rubric", error);
      toast({
        title: "Error",
        description: "Failed to load rubric",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total points from criteria
  const totalPoints = criteria.reduce((sum, c) => sum + (parseInt(c.max_points) || 0), 0);

  const addCriterion = () => {
    setCriteria([...criteria, { name: "", description: "", max_points: 25 }]);
  };

  const removeCriterion = (index) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const updateCriterion = (index, field, value) => {
    const updated = [...criteria];
    updated[index][field] = value;
    setCriteria(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rubric name is required",
        variant: "destructive",
      });
      return;
    }

    if (criteria.some(c => !c.name.trim())) {
      toast({
        title: "Validation Error",
        description: "All criteria must have a name",
        variant: "destructive",
      });
      return;
    }

    if (totalPoints === 0) {
      toast({
        title: "Validation Error",
        description: "Total points must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert criteria array to object format expected by API
      const criteriaObj = {};
      criteria.forEach((c) => {
        const key = c.name.toLowerCase().replace(/\s+/g, '_');
        criteriaObj[key] = {
          max_points: parseInt(c.max_points) || 0,
          description: c.description || c.name,
        };
      });

      const result = await updateRubric(rubricId, {
        name: name.trim(),
        description: description.trim(),
        type,
        criteria: criteriaObj,
        total_points: totalPoints,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Rubric updated successfully",
        });
        router.push("/instructor/rubrics");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update rubric",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("Failed to update rubric", error);
      toast({
        title: "Error",
        description: "Failed to update rubric",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Edit Rubric</h1>
        <p className="text-muted-foreground">Modify the grading criteria for this rubric</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          {/* Basic Info */}
          <div className="space-y-6 mb-8">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Rubric Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Essay Grading Rubric"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rubric is for..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </div>

          {/* Criteria Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Grading Criteria</h3>
                <p className="text-sm text-muted-foreground">Define the criteria students will be graded on</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalPoints} points</span>
              </div>
            </div>

            <div className="space-y-4">
              {criteria.map((criterion, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Criterion Name *</Label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                        placeholder="e.g., Thesis Statement"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                        placeholder="What to look for..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max Points</Label>
                      <Input
                        type="number"
                        min="0"
                        value={criterion.max_points}
                        onChange={(e) => updateCriterion(index, 'max_points', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="mt-6 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addCriterion}
              className="mt-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Criterion
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/instructor/rubrics">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}
