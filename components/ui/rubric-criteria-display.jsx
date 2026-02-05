"use client";

/**
 * RubricCriteriaDisplay Component
 * Displays rubric criteria with per-criterion scoring for instructors
 * Allows override of AI-generated scores by individual criterion
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Get color class based on score percentage
 * @param {number} score - Current score
 * @param {number} maxScore - Maximum possible score
 * @returns {string} - Tailwind color classes
 */
function getScoreColorClass(score, maxScore) {
  if (score === null || score === undefined || maxScore === 0) return "text-muted-foreground";
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return "text-green-600 dark:text-green-400";
  if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Parse AI feedback to extract criterion-specific feedback
 * Looks for patterns like "Content (8/10):" or "**Organization**: Good..."
 * @param {string} feedback - AI-generated feedback text
 * @param {Array} criteria - Array of rubric criteria
 * @returns {Object} - Map of criterion name to extracted feedback
 */
function parseAIFeedbackByCriteria(feedback, criteria) {
  if (!feedback || !criteria) return {};
  
  const feedbackMap = {};
  const lines = feedback.split('\n');
  
  criteria.forEach(criterion => {
    const name = criterion.name || criterion.criterion_name || '';
    if (!name) return;
    
    // Look for patterns: "CriterionName (score/max):" or "**CriterionName**:" or "CriterionName:"
    const patterns = [
      new RegExp(`\\*\\*${name}\\*\\*[:\\s]*(.+?)(?=\\*\\*|$)`, 'is'),
      new RegExp(`${name}\\s*\\([^)]+\\)[:\\s]*(.+?)(?=\\n\\n|$)`, 'is'),
      new RegExp(`${name}[:\\s]+(.+?)(?=\\n[A-Z]|\\n\\n|$)`, 'is'),
    ];
    
    for (const pattern of patterns) {
      const match = feedback.match(pattern);
      if (match && match[1]) {
        feedbackMap[name] = match[1].trim().replace(/^\*+|\*+$/g, '');
        break;
      }
    }
  });
  
  return feedbackMap;
}

/**
 * Single criterion row component
 */
function CriterionRow({ 
  criterion, 
  score, 
  maxScore, 
  onScoreChange, 
  extractedFeedback,
  isHighlighted,
  disabled 
}) {
  const name = criterion.name || criterion.criterion_name || 'Unnamed Criterion';
  const description = criterion.description || '';
  const weight = criterion.weight || criterion.points || maxScore;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isHighlighted 
        ? "border-primary bg-primary/5" 
        : "border-border bg-card/50"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">{name}</span>
            {weight > 0 && (
              <Badge variant="outline" className="text-xs">
                {weight} pts
              </Badge>
            )}
            {isHighlighted && (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                AI Matched
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          )}
          {extractedFeedback && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-400">
              <span className="font-medium">AI Feedback:</span> {extractedFeedback}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            min="0"
            max={maxScore}
            value={score ?? ""}
            onChange={(e) => onScoreChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className={cn(
              "w-16 h-8 text-center text-sm font-medium",
              getScoreColorClass(score, maxScore)
            )}
          />
          <span className="text-sm text-muted-foreground">/ {maxScore}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main RubricCriteriaDisplay component
 * @param {Object} props
 * @param {Array} props.criteria - Array of rubric criteria objects
 * @param {Object} props.criteriaScores - Map of criterion id/name to score
 * @param {Function} props.onCriteriaScoresChange - Callback when scores change
 * @param {string} props.aiFeedback - AI-generated feedback text
 * @param {number} props.totalScore - Total calculated score
 * @param {number} props.maxTotalScore - Maximum possible total score
 * @param {boolean} props.disabled - Whether inputs are disabled
 * @param {string} props.className - Additional CSS classes
 */
export default function RubricCriteriaDisplay({
  criteria = [],
  criteriaScores = {},
  onCriteriaScoresChange,
  aiFeedback = "",
  totalScore,
  maxTotalScore = 100,
  disabled = false,
  className
}) {
  const [localScores, setLocalScores] = useState(criteriaScores);
  const [feedbackMap, setFeedbackMap] = useState({});
  
  // Parse AI feedback when it changes
  useEffect(() => {
    if (aiFeedback && criteria.length > 0) {
      const parsed = parseAIFeedbackByCriteria(aiFeedback, criteria);
      setFeedbackMap(parsed);
    }
  }, [aiFeedback, criteria]);
  
  // Sync local scores with props
  useEffect(() => {
    setLocalScores(criteriaScores);
  }, [criteriaScores]);
  
  // Handle score change for a criterion
  const handleScoreChange = (criterionId, score) => {
    const newScores = {
      ...localScores,
      [criterionId]: score
    };
    setLocalScores(newScores);
    
    if (onCriteriaScoresChange) {
      onCriteriaScoresChange(newScores);
    }
  };
  
  // Calculate total from criteria scores
  const calculatedTotal = Object.values(localScores).reduce((sum, score) => {
    return sum + (score || 0);
  }, 0);
  
  // Get max score per criterion (distribute evenly if not specified)
  const getMaxScoreForCriterion = (criterion) => {
    return criterion.weight || criterion.points || Math.floor(maxTotalScore / criteria.length);
  };
  
  // If no criteria, show empty state
  if (criteria.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Rubric Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No rubric assigned</p>
            <p className="text-xs mt-1">Add a rubric to enable per-criterion grading</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Rubric Criteria
          </CardTitle>
          
          {/* Total Score Display */}
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-lg font-bold",
              getScoreColorClass(calculatedTotal, maxTotalScore)
            )}>
              {calculatedTotal}
            </span>
            <span className="text-sm text-muted-foreground">/ {maxTotalScore}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Criteria List */}
        <div className="space-y-2 mb-4">
          {criteria.map((criterion, index) => {
            const criterionId = criterion.id || criterion.name || `criterion-${index}`;
            const name = criterion.name || criterion.criterion_name || 'Unnamed';
            const maxScore = getMaxScoreForCriterion(criterion);
            const hasFeedback = feedbackMap[name];
            
            return (
              <CriterionRow
                key={criterionId}
                criterion={criterion}
                score={localScores[criterionId]}
                maxScore={maxScore}
                onScoreChange={(score) => handleScoreChange(criterionId, score)}
                extractedFeedback={feedbackMap[name]}
                isHighlighted={!!hasFeedback}
                disabled={disabled}
              />
            );
          })}
        </div>
        
        {/* Score Summary Bar */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Score Breakdown</span>
            <span className="text-xs text-muted-foreground">
              {Math.round((calculatedTotal / maxTotalScore) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                calculatedTotal / maxTotalScore >= 0.8 ? "bg-green-500" :
                calculatedTotal / maxTotalScore >= 0.6 ? "bg-yellow-500" :
                "bg-red-500"
              )}
              style={{ width: `${Math.min(100, (calculatedTotal / maxTotalScore) * 100)}%` }}
            />
          </div>
          
          {/* Criteria Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {criteria.map((criterion, index) => {
              const criterionId = criterion.id || criterion.name || `criterion-${index}`;
              const name = criterion.name || criterion.criterion_name || 'Unnamed';
              const maxScore = getMaxScoreForCriterion(criterion);
              const score = localScores[criterionId] || 0;
              
              return (
                <div key={criterionId} className="flex items-center gap-1 text-xs">
                  <span className={cn(
                    "font-medium",
                    getScoreColorClass(score, maxScore)
                  )}>
                    {name}: {score}/{maxScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* AI Feedback Note */}
        {Object.keys(feedbackMap).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  AI Feedback Matched
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                  {Object.keys(feedbackMap).length} of {criteria.length} criteria have AI-generated feedback.
                  Review and adjust scores as needed.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
