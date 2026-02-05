"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createRubric } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function CreateRubricPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState([
    { name: "", description: "", max_points: 25 }
  ]);

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

    setIsLoading(true);
    try {
      // Convert criteria array to object format expected by API
      const criteriaObj = {};
      criteria.forEach((c, index) => {
        const key = c.name.toLowerCase().replace(/\s+/g, '_');
        criteriaObj[key] = {
          max_points: parseInt(c.max_points) || 0,
          description: c.description || c.name,
        };
      });

      const result = await createRubric({
        name: name.trim(),
        description: description.trim(),
        criteria: criteriaObj,
        total_points: totalPoints,
        is_template: false,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Rubric created successfully",
        });
        router.push("/instructor/rubrics");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create rubric",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("Failed to create rubric", error);
      toast({
        title: "Error",
        description: "Failed to create rubric",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Create New Rubric</h1>
        <p className="text-muted-foreground">Define grading criteria for your assignments</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rubric Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Essay Grading Rubric"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rubric evaluates..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Grading Criteria</h2>
              <p className="text-sm text-muted-foreground">Define the criteria students will be graded on</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Total Points:</span>
              <span className="ml-2 text-lg font-semibold text-foreground">{totalPoints}</span>
            </div>
          </div>

          <div className="space-y-4">
            {criteria.map((criterion, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Criterion Name *</Label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, "name", e.target.value)}
                        placeholder="e.g., Thesis Statement"
                        className="h-10 mt-1"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Points</Label>
                      <Input
                        type="number"
                        value={criterion.max_points}
                        onChange={(e) => updateCriterion(index, "max_points", e.target.value)}
                        min="1"
                        className="h-10 mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, "description", e.target.value)}
                      placeholder="Describe what excellent, good, fair, and poor performance looks like..."
                      className="min-h-[60px] mt-1"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="text-muted-foreground hover:text-red-500 mt-6"
                  disabled={criteria.length === 1}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/instructor/rubrics")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              "Create Rubric"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
