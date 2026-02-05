"use client";

/**
 * SubmissionVersionTimeline Component
 * Displays a visual timeline of all submission versions with scores and status
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Format date to relative or absolute format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Get status badge variant and text
 * @param {string} status - Submission status
 * @returns {{variant: string, text: string, className: string}}
 */
function getStatusInfo(status) {
  switch (status) {
    case 'graded':
      return { 
        variant: 'default', 
        text: 'Graded',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      };
    case 'submitted':
    case 'pending':
      return { 
        variant: 'secondary', 
        text: 'Submitted',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      };
    case 'draft':
      return { 
        variant: 'outline', 
        text: 'Draft',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      };
    default:
      return { 
        variant: 'outline', 
        text: status || 'Unknown',
        className: ''
      };
  }
}

/**
 * Version timeline item component
 */
function VersionItem({ version, isLatest, isLast }) {
  const statusInfo = getStatusInfo(version.status);
  const hasScore = version.score !== null && version.score !== undefined;
  
  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
      )}
      
      {/* Timeline dot */}
      <div className={cn(
        "relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0",
        isLatest 
          ? "border-primary bg-primary text-primary-foreground" 
          : version.status === 'graded'
            ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "border-border bg-muted text-muted-foreground"
      )}>
        {version.version}
      </div>
      
      {/* Version content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            Version {version.version}
          </span>
          {isLatest && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Latest
            </Badge>
          )}
          <Badge className={cn("text-xs", statusInfo.className)}>
            {statusInfo.text}
          </Badge>
          {version.isLate && (
            <Badge variant="destructive" className="text-xs">
              Late
            </Badge>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          {formatDate(version.submittedAt)}
          {version.gradedAt && ` • Graded ${formatDate(version.gradedAt)}`}
        </div>
        
        {hasScore && (
          <div className="mt-2 inline-flex items-baseline gap-1 px-2 py-1 bg-muted rounded">
            <span className={cn(
              "text-lg font-bold",
              version.score >= 80 ? "text-green-600 dark:text-green-400" :
              version.score >= 60 ? "text-yellow-600 dark:text-yellow-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {version.score}
            </span>
            <span className="text-sm text-muted-foreground">pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main SubmissionVersionTimeline component
 * @param {Object} props
 * @param {Array} props.versions - Array of version objects
 * @param {Object} props.summary - Summary object with attempt counts
 * @param {string} [props.className] - Additional CSS classes
 */
export default function SubmissionVersionTimeline({ versions = [], summary = {}, className }) {
  const {
    maxAttempts = 3,
    usedAttempts = 0,
    remainingAttempts = 0,
    isGraded = false,
    canResubmit = false
  } = summary;

  // If no versions, show empty state
  if (versions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No submissions yet</p>
            <p className="text-xs mt-1">Submit your work to see history</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Submission History
          </CardTitle>
          
          {/* Remaining attempts counter */}
          <div className="flex items-center gap-2">
            {isGraded ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Graded
              </Badge>
            ) : canResubmit ? (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {remainingAttempts} of {maxAttempts} attempts left
              </div>
            ) : (
              <Badge variant="secondary" className="text-xs">
                No resubmissions
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Attempt progress bar */}
        <div className="mb-4">
          <div className="flex gap-1 mb-1">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i < usedAttempts
                    ? versions[i]?.status === 'graded'
                      ? "bg-green-500"
                      : "bg-blue-500"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {usedAttempts} of {maxAttempts} submissions used
          </div>
        </div>
        
        {/* Version timeline */}
        <div className="space-y-0">
          {versions.map((version, index) => (
            <VersionItem
              key={version.id}
              version={version}
              isLatest={version.isLatest}
              isLast={index === versions.length - 1}
            />
          ))}
        </div>
        
        {/* Resubmission blocked message */}
        {isGraded && !canResubmit && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Resubmission Closed
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  This assignment has been graded. No further submissions are allowed.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
