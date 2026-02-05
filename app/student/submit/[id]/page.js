"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssignment, createSubmission, getSubmissions, uploadFile } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function SubmitAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [activeTab, setActiveTab] = useState("type");
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQuestionPdf, setShowQuestionPdf] = useState(false);
  const [questionPdfBlobUrl, setQuestionPdfBlobUrl] = useState(null);
  const [isLoadingQuestionPdf, setIsLoadingQuestionPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Function to fetch question PDF with authentication
  const fetchQuestionPdf = async (assignmentId) => {
    setIsLoadingQuestionPdf(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        logger.error('No authentication token found');
        setIsLoadingQuestionPdf(false);
        return;
      }

      const url = `${API_BASE_URL}/api/v1/files/public/assignment/${assignmentId}/question`;
      logger.debug('Fetching question PDF', { url, assignmentId });
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setQuestionPdfBlobUrl(blobUrl);
        logger.debug('Question PDF loaded successfully');
      } else {
        const errorText = await response.text();
        logger.error('Failed to fetch question PDF', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
      }
    } catch (err) {
      logger.error('Error fetching question PDF', { 
        message: err.message, 
        stack: err.stack 
      });
    } finally {
      setIsLoadingQuestionPdf(false);
    }
  };

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (questionPdfBlobUrl) {
        URL.revokeObjectURL(questionPdfBlobUrl);
      }
    };
  }, [questionPdfBlobUrl]);

  // Function to extract text from PDF using pdf.js (dynamically imported)
  const extractTextFromPDF = async (file) => {
    try {
      // Dynamic import of pdf.js to ensure it loads properly in Next.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use local worker file from public folder
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (err) {
      logger.error('PDF extraction error', err);
      throw new Error('Failed to extract text from PDF');
    }
  };

  useEffect(() => {
    loadAssignment();
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [params.id]);

  const loadAssignment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assignmentResult, submissionsResult] = await Promise.all([
        getAssignment(params.id),
        getSubmissions({ assignment_id: params.id })
      ]);
      
      if (assignmentResult.success && assignmentResult.data) {
        const data = assignmentResult.data;
        const submissions = submissionsResult.success ? (submissionsResult.data || []) : [];
        
        // Find draft submission (if any)
        const draftSubmission = submissions.find(s => s.status === 'draft');
        // Find latest graded submission
        const gradedSubmission = submissions.find(s => s.status === 'graded');
        // Count only non-draft submissions for attempts
        const submittedCount = submissions.filter(s => s.status !== 'draft').length;
        
        // If already graded, redirect to results page
        if (gradedSubmission) {
          router.push(`/student/results/${gradedSubmission.id}`);
          return;
        }
        
        // Load draft content if exists
        if (draftSubmission && draftSubmission.content) {
          setAnswer(draftSubmission.content);
          setLastSaved(new Date(draftSubmission.submitted_at));
        }
        
        setAssignment({
          id: data.id,
          title: data.title,
          course: data.course_code || 'N/A',
          instructor: data.instructor_name || 'Instructor',
          deadline: data.due_date ? new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline',
          dueIn: getDueInText(data.due_date),
          attempts: { used: submittedCount, total: data.max_resubmissions || 2 },
          wordLimit: { min: data.min_word_count || 0, max: data.max_word_count || 1000 },
          format: ["PDF", "DOCX", "TXT"],
          instructions: data.description || 'No instructions provided.',
          questionPdfUrl: data.question_pdf_url || null,
          previousSubmission: gradedSubmission ? {
            id: gradedSubmission.id,
            score: gradedSubmission.score || 0,
            maxScore: data.total_points || 100,
          } : null,
        });
      } else {
        setError('Failed to load assignment');
      }
    } catch (err) {
      logger.error('Failed to load assignment', err);
      setError('Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const getDueInText = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const charCount = answer.length;

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await createSubmission({
        assignment_id: params.id,
        content: answer,
        status: 'draft'
      });
      if (result.success) {
        setLastSaved(new Date());
      }
    } catch (error) {
      logger.error('Failed to save draft', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (file) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please select a file under 10MB.');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(ext => fileName.endsWith(ext));
    
    if (!isValidType) {
      setError('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
      return;
    }
    
    setError(null);
    setUploadedFile(file);
    
    // Read file content for TXT files
    if (fileName.endsWith('.txt')) {
      try {
        const text = await file.text();
        setAnswer(text);
      } catch (err) {
        logger.error('Failed to read file', err);
        setError('Failed to read file content');
      }
    } else if (fileName.endsWith('.pdf')) {
      // Extract text from PDF using pdf.js
      setIsExtractingText(true);
      try {
        const extractedText = await extractTextFromPDF(file);
        if (extractedText && extractedText.length > 0) {
          setAnswer(extractedText);
        } else {
          setAnswer(`[PDF File: ${file.name}]\n\nNote: Could not extract text from this PDF. It may be an image-based PDF.`);
          setError('Could not extract text from PDF. The file may be image-based or protected.');
        }
      } catch (err) {
        logger.error('Failed to extract PDF text', err);
        setAnswer(`[PDF File: ${file.name}]\n\nNote: Failed to extract text from PDF.`);
        setError('Failed to extract text from PDF. Please try a different file or type your answer manually.');
      } finally {
        setIsExtractingText(false);
      }
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      // For DOC/DOCX files, we can't extract on client-side easily
      setAnswer(`[Document: ${file.name}]\n\nNote: DOC/DOCX text extraction is not supported in browser. Please copy and paste your content or use PDF/TXT format.`);
      setError('DOC/DOCX files cannot be read in browser. Please use PDF or TXT format, or type your answer.');
    }
  };

  const handleSubmit = async () => {
    // Validate submission
    const hasContent = answer.trim().length > 0 || uploadedFile;
    if (!hasContent) {
      setError('Please type an answer or upload a file before submitting.');
      return;
    }
    
    // Validate word count for typed answers (not file uploads)
    const minWords = assignment?.wordLimit?.min || 0;
    if (activeTab === 'type' && wordCount < minWords) {
      setError(`Please write at least ${minWords} words before submitting.`);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let submissionData = {
        assignment_id: params.id,
        status: 'submitted'
      };
      
      // For text submissions
      submissionData.content = answer;
      
      // If there's an uploaded file, upload it to the server first
      if (uploadedFile) {
        setError(null);
        const uploadResult = await uploadFile(uploadedFile);
        
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload file');
          setIsSubmitting(false);
          return;
        }
        
        submissionData.pdf_url = uploadResult.data.url;
        submissionData.file_name = uploadedFile.name;
      }
      
      // Create the submission
      const result = await createSubmission(submissionData);
      
      if (result.success) {
        router.push("/student/assignments");
      } else {
        setError(result.error || 'Failed to submit assignment');
        setIsSubmitting(false);
      }
    } catch (error) {
      logger.error('Failed to submit', error);
      setError('Failed to submit assignment');
      setIsSubmitting(false);
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

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* Previous Submission Alert */}
            {assignment?.previousSubmission && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Previous Submission Graded</p>
                    <p className="text-sm text-muted-foreground">
                      You scored {assignment.previousSubmission.score}/{assignment.previousSubmission.maxScore} on your last attempt.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/student/results/${assignment.previousSubmission.id}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1"
                >
                  View Feedback
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Assignment Details Card */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">{assignment?.title}</h1>
              <p className="text-muted-foreground mb-6">{assignment?.course} • {assignment?.instructor}</p>

              {/* Assignment Meta */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Deadline</p>
                  <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Due in</span> {assignment?.dueIn}
                  </p>
                  <p className="text-xs text-muted-foreground">{assignment?.deadline}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Attempts</p>
                  <p className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {assignment?.attempts.used} of {assignment?.attempts.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Word Limit</p>
                  <p className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    {assignment?.wordLimit.min} - {assignment?.wordLimit.max} words
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Format</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {assignment?.format.join(", ")}
                  </p>
                </div>
              </div>

              {/* Show Instructions */}
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Show Instructions
              </button>

              {showInstructions && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-foreground">{assignment?.instructions}</p>
                </div>
              )}

              {/* Question PDF Section */}
              {assignment?.questionPdfUrl && (
                <div className="mt-6 border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Question Document</p>
                        <p className="text-xs text-muted-foreground">PDF with assignment details</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoadingQuestionPdf}
                        onClick={() => {
                          if (!showQuestionPdf && !questionPdfBlobUrl) {
                            fetchQuestionPdf(assignment.id);
                          }
                          setShowQuestionPdf(!showQuestionPdf);
                        }}
                      >
                        {isLoadingQuestionPdf ? (
                          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                        {isLoadingQuestionPdf ? 'Loading...' : (showQuestionPdf ? 'Hide' : 'View')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('authToken');
                            if (!token) {
                              logger.error('No authentication token found for download');
                              setError('Authentication token missing');
                              return;
                            }

                            const url = `${API_BASE_URL}/api/v1/files/public/assignment/${assignment.id}/question`;
                            logger.debug('Downloading question PDF', { url, assignmentId: assignment.id });

                            const response = await fetch(url, {
                              headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (response.ok) {
                              const blob = await response.blob();
                              const downloadUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = downloadUrl;
                              a.download = `${assignment.title || 'question'}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(downloadUrl);
                              logger.debug('Question PDF downloaded successfully');
                            } else {
                              const errorText = await response.text();
                              logger.error('Failed to download question PDF', {
                                status: response.status,
                                statusText: response.statusText,
                                error: errorText
                              });
                              setError(`Download failed: ${response.status} ${response.statusText}`);
                            }
                          } catch (err) {
                            logger.error('Error downloading PDF', { 
                              message: err.message,
                              stack: err.stack
                            });
                            setError('Failed to download PDF');
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  {showQuestionPdf && questionPdfBlobUrl && (
                    <div className="mt-4 border border-border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                      <iframe
                        src={questionPdfBlobUrl}
                        className="w-full h-full border-0"
                        title="Question Document"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Answer Section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Your Answer</h2>
                <Badge variant="outline" className="text-xs">
                  ATTEMPT {assignment?.attempts.used + 1}
                </Badge>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-4 mb-4 border-b border-border">
                <button
                  onClick={() => setActiveTab("type")}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "type"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Type Answer
                </button>
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "upload"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Upload File
                </button>
              </div>

              {activeTab === "type" ? (
                <>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Start typing your answer here..."
                    className="min-h-[300px] resize-y"
                  />

                  {/* Word Count */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm flex items-center gap-1 ${
                          wordCount >= (assignment?.wordLimit.min || 0) &&
                          wordCount <= (assignment?.wordLimit.max || 1000)
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {wordCount >= (assignment?.wordLimit.min || 0) && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {wordCount} words
                      </span>
                      <span className="text-sm text-muted-foreground">{charCount.toLocaleString()} characters</span>
                    </div>
                    {lastSaved && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Draft saved
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileSelect(file);
                      }
                    }}
                  />
                  {uploadedFile ? (
                    <>
                      <div className={`w-12 h-12 ${isExtractingText ? 'bg-blue-100' : 'bg-green-100'} rounded-lg mx-auto mb-4 flex items-center justify-center`}>
                        {isExtractingText ? (
                          <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-foreground font-medium mb-1">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground mb-1">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      {isExtractingText && (
                        <p className="text-sm text-blue-600 mb-4">Extracting text from PDF...</p>
                      )}
                      {!isExtractingText && answer && !answer.startsWith('[') && (
                        <p className="text-sm text-green-600 mb-4">✓ Text extracted ({answer.split(/\s+/).length} words)</p>
                      )}
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => {
                            // Create object URL for preview
                            const url = URL.createObjectURL(uploadedFile);
                            setFilePreviewUrl(url);
                            setShowFilePreview(true);
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change File
                        </Button>
                        <Button 
                          variant="ghost" 
                          type="button"
                          onClick={() => {
                            setUploadedFile(null);
                            setAnswer('');
                            if (filePreviewUrl) {
                              URL.revokeObjectURL(filePreviewUrl);
                              setFilePreviewUrl(null);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-muted rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground mb-2">Drag and drop your file here, or click to browse</p>
                      <p className="text-sm text-muted-foreground mb-4">Supported formats: {assignment?.format.join(", ")} (Max 10MB)</p>
                      <Button 
                        variant="outline"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse Files
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {isSaving ? "Saving..." : "Save Draft"}
              </button>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowPreview(true)}>Preview</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!uploadedFile && wordCount < (assignment?.wordLimit.min || 0))}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? "Submitting..." : "Submit Assignment"}
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              </div>
            </div>
          </>
        )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Preview Your Submission</h3>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Assignment</p>
                <p className="font-medium text-foreground">{assignment?.title}</p>
              </div>
              {uploadedFile && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Uploaded File</p>
                  <p className="font-medium text-foreground">{uploadedFile.name}</p>
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Word Count</p>
                <p className="font-medium text-foreground">{wordCount} words</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Answer</p>
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-foreground">
                  {answer || <span className="text-muted-foreground italic">No content yet</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Continue Editing
              </Button>
              <Button 
                onClick={() => { setShowPreview(false); handleSubmit(); }}
                disabled={isSubmitting || (!uploadedFile && wordCount < (assignment?.wordLimit.min || 0))}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showFilePreview && filePreviewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                File Preview: {uploadedFile?.name}
              </h3>
              <button 
                onClick={() => {
                  setShowFilePreview(false);
                  if (filePreviewUrl) {
                    URL.revokeObjectURL(filePreviewUrl);
                    setFilePreviewUrl(null);
                  }
                }}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto" style={{ height: '70vh' }}>
              {uploadedFile?.name.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={filePreviewUrl} 
                  className="w-full h-full border-0 rounded"
                  title="PDF Preview"
                />
              ) : uploadedFile?.name.toLowerCase().endsWith('.txt') ? (
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-muted-foreground font-mono text-sm h-full overflow-auto">
                  {answer}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
                  <p className="text-sm text-muted-foreground">DOC/DOCX files cannot be previewed in the browser.</p>
                  <p className="text-sm text-muted-foreground mt-1">The file will be processed when you submit.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFilePreview(false);
                  if (filePreviewUrl) {
                    URL.revokeObjectURL(filePreviewUrl);
                    setFilePreviewUrl(null);
                  }
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
  );
}
