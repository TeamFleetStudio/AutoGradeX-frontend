"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import RubricCriteriaDisplay from "@/components/ui/rubric-criteria-display";
import { getSubmission, updateGrade, gradeSubmission, getAIGradePreview, getRubric } from "@/lib/api-client";
import logger from "@/lib/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function GradeSubmissionPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [aiPreviewGenerated, setAiPreviewGenerated] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [rubric, setRubric] = useState(null);
  const [criteriaScores, setCriteriaScores] = useState({});

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  // Fetch PDF with auth header when viewer is opened
  useEffect(() => {
    if (showFileViewer && submission?.file_url && !pdfBlobUrl) {
      fetchPdfWithAuth();
    }
    // Cleanup blob URL when component unmounts or viewer closes
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [showFileViewer, submission?.file_url]);

  const fetchPdfWithAuth = async () => {
    if (!submission?.file_url) return;
    
    setIsLoadingPdf(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}${submission.file_url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      logger.error('Failed to fetch PDF', err);
      setError('Failed to load file preview');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const loadSubmission = async () => {
    setIsLoading(true);
    try {
      const result = await getSubmission(submissionId);
      if (result.success && result.data) {
        setSubmission(result.data);
        if (result.data.score !== null && result.data.score !== undefined) {
          setScore(result.data.score.toString());
        }
        if (result.data.feedback) {
          setFeedback(result.data.feedback);
        }
        
        // Load rubric if available
        if (result.data.rubricId) {
          try {
            const rubricResult = await getRubric(result.data.rubricId);
            if (rubricResult.success && rubricResult.data) {
              const rubricData = rubricResult.data;
              
              // Convert criteria from object format to array format if needed
              // Backend stores: { "content": { max_points: 30, description: "..." }, ... }
              // Frontend expects: [{ name: "content", points: 30, description: "..." }, ...]
              let criteriaArray = [];
              if (rubricData.criteria) {
                if (Array.isArray(rubricData.criteria)) {
                  criteriaArray = rubricData.criteria;
                } else if (typeof rubricData.criteria === 'object') {
                  criteriaArray = Object.entries(rubricData.criteria).map(([key, value]) => ({
                    id: key,
                    name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    points: value.max_points || value.points || 0,
                    weight: value.max_points || value.points || 0,
                    description: value.description || ''
                  }));
                }
              }
              
              setRubric({
                ...rubricData,
                criteria: criteriaArray
              });
              
              // Initialize criteria scores from rubric
              const initialScores = {};
              criteriaArray.forEach((criterion) => {
                const criterionId = criterion.id || criterion.name;
                initialScores[criterionId] = null; // Start with null to show empty
              });
              setCriteriaScores(initialScores);
            }
          } catch (rubricError) {
            logger.error("Failed to load rubric", rubricError);
          }
        }
      } else {
        setError("Submission not found");
      }
    } catch (error) {
      logger.error("Failed to load submission", error);
      setError("Failed to load submission");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!score || isNaN(parseInt(score))) {
      setError("Please enter a valid score");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await gradeSubmission(submissionId, {
        score: parseInt(score),
        feedback: feedback
      });
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save grade");
      }
    } catch (error) {
      setError("Failed to save grade");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGrade = async () => {
    setIsGeneratingAI(true);
    setError(null);
    
    try {
      // Use preview endpoint - does NOT save the grade
      const result = await getAIGradePreview(submissionId);
      
      if (result.success && result.data) {
        setScore(result.data.score?.toString() || "");
        setFeedback(result.data.feedback || "");
        setAiPreviewGenerated(true);
        // Don't show success message - user still needs to click Save
      } else {
        setError(result.error || "Failed to generate AI grade");
      }
    } catch (error) {
      setError("Failed to generate AI grade");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Handle criteria score changes and update total
  const handleCriteriaScoresChange = (newScores) => {
    setCriteriaScores(newScores);
    
    // Calculate total from criteria scores
    const total = Object.values(newScores).reduce((sum, s) => {
      return sum + (s || 0);
    }, 0);
    
    setScore(total.toString());
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
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error && !submission ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">Submission Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/instructor/submissions">
              <Button>Back to Submissions</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Submission Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {submission?.assignment_title || "Assignment"}
                  </h2>
                  <Badge className={submission?.status === "graded" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}>
                    {submission?.status === "graded" ? "Graded" : "Awaiting Grade"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span>Student: <strong className="text-foreground">{submission?.student_name || "Unknown"}</strong></span>
                  <span>•</span>
                  <span>Submitted: {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "N/A"}</span>
                </div>

                <div className="border border-border rounded-lg p-4 bg-muted/50">
                  <h3 className="text-sm font-medium text-foreground mb-2">Submission Content</h3>
                  {/* Check if this is a file submission (PDF, DOC, etc.) */}
                  {submission?.file_name && (submission?.file_name.toLowerCase().endsWith('.pdf') || 
                    submission?.file_name.toLowerCase().endsWith('.doc') || 
                    submission?.file_name.toLowerCase().endsWith('.docx')) ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="font-medium text-foreground mb-1">{submission.file_name}</p>
                      <p className="text-sm text-muted-foreground mb-4">File submission</p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline"
                          onClick={() => setShowFileViewer(true)}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View File
                        </Button>
                      </div>
                      {/* Show extracted text content if available */}
                      {submission?.content && !submission.content.startsWith('[') && (
                        <div className="mt-4 text-left">
                          <p className="text-xs text-muted-foreground mb-2">Extracted content:</p>
                          <pre className="whitespace-pre-wrap text-muted-foreground font-sans text-sm bg-card p-3 rounded border border-border max-h-64 overflow-y-auto">
                            {submission.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-muted-foreground font-sans">
                        {submission?.content || "No content available"}
                      </pre>
                    </div>
                  )}
                </div>

                {submission?.file_url && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm text-blue-700 dark:text-blue-400">Attached File: {submission.file_name || 'Download'}</span>
                    </div>
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      Download →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Grading Panel */}
            <div className="space-y-6">
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                  Grade saved successfully!
                </div>
              )}
              
              {error && submission && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Grade Submission</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Score (out of {rubric?.total_points || submission?.total_points || 100})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={rubric?.total_points || submission?.total_points || 100}
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="Enter score"
                    />
                    {rubric && submission?.total_points !== rubric.total_points && (
                      <p className="text-xs text-amber-600 mt-1">
                        Note: Rubric has {rubric.total_points} points, but assignment is set to {submission?.total_points} points
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Feedback
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback for the student..."
                      rows={6}
                    />
                  </div>

                  {/* Rubric Criteria Breakdown */}
                  {rubric && rubric.criteria && rubric.criteria.length > 0 && (
                    <RubricCriteriaDisplay
                      criteria={rubric.criteria}
                      criteriaScores={criteriaScores}
                      onCriteriaScoresChange={handleCriteriaScoresChange}
                      aiFeedback={feedback}
                      totalScore={parseInt(score) || 0}
                      maxTotalScore={rubric?.total_points || submission?.total_points || 100}
                      disabled={isSaving}
                    />
                  )}

                  <div className="flex gap-3">
                    <Button onClick={handleSaveGrade} disabled={isSaving || isGeneratingAI} className="flex-1">
                      {isSaving ? "Saving..." : "Save Grade"}
                    </Button>
                  </div>

                  {aiPreviewGenerated && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
                      <strong>AI grade generated.</strong> Review and click "Save Grade" to save.
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={handleAutoGrade} 
                      disabled={isSaving || isGeneratingAI}
                      className="w-full gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {isGeneratingAI ? "Generating..." : "Generate AI Grade"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Generates a grade suggestion - you must save to confirm
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* File Viewer Modal */}
      {showFileViewer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{submission?.file_name || 'File Preview'}</h3>
                  <p className="text-sm text-muted-foreground">Submitted by {submission?.student_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFileViewer(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4" style={{ height: '70vh' }}>
              {submission?.file_name?.toLowerCase().endsWith('.pdf') ? (
                isLoadingPdf ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-muted-foreground">Loading PDF...</p>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe 
                    src={pdfBlobUrl} 
                    className="w-full h-full border-0 rounded"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-lg mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground mb-2">PDF file preview not available</p>
                    <p className="text-sm text-muted-foreground mb-4">The file was submitted but hasn't been uploaded to storage yet.</p>
                    {submission?.content && (
                      <div className="w-full text-left">
                        <p className="text-sm font-medium text-foreground mb-2">Extracted content:</p>
                        <pre className="whitespace-pre-wrap text-muted-foreground font-sans text-sm bg-muted/50 p-4 rounded border border-border max-h-64 overflow-y-auto">
                          {submission.content}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              ) : submission?.file_name?.toLowerCase().endsWith('.txt') ? (
                <div className="bg-muted/50 rounded-lg p-4 h-full overflow-auto">
                  <pre className="whitespace-pre-wrap text-foreground font-mono text-sm">
                    {submission?.content || 'No content available'}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
                  <p className="text-sm text-muted-foreground mb-4">DOC/DOCX files cannot be previewed in the browser.</p>
                  {submission?.content && (
                    <div className="w-full text-left">
                      <p className="text-sm font-medium text-foreground mb-2">Content from submission:</p>
                      <pre className="whitespace-pre-wrap text-muted-foreground font-sans text-sm bg-muted/50 p-4 rounded border border-border max-h-64 overflow-y-auto">
                        {submission.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              {submission?.file_url && (
                <a 
                  href={`${API_BASE_URL}${submission.file_url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              )}
              <Button onClick={() => setShowFileViewer(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
