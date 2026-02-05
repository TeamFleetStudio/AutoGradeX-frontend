"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAssignmentSchema } from "@/lib/validation";
import { createAssignment, getCourses, getRubrics, uploadQuestionPdf, uploadReferencePdf, createRubric } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import logger from "@/lib/logger";

export default function CreateAssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [rubricTemplates, setRubricTemplates] = useState([]);
  const [rubricTab, setRubricTab] = useState("template");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Question PDF file upload
  const questionFileInputRef = useRef(null);
  const [questionFile, setQuestionFile] = useState(null);
  
  // Reference file upload
  const fileInputRef = useRef(null);
  const [referenceFile, setReferenceFile] = useState(null);

  // Settings toggles
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [aiGrading, setAiGrading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);
  const [requireReview, setRequireReview] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState("draft");
  const [assignmentType, setAssignmentType] = useState("standard");
  
  // Custom rubric criteria
  const [customCriteria, setCustomCriteria] = useState([
    { id: 1, name: '', description: '', points: 25 }
  ]);
  const [customRubricName, setCustomRubricName] = useState('');

  // Fetch courses and user's rubrics on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [coursesResult, rubricsResult] = await Promise.all([
          getCourses(),
          getRubrics({ is_template: false }) // Only get user-created rubrics, not seeded templates
        ]);
        
        if (coursesResult.success && coursesResult.data) {
          setCourses(coursesResult.data);
        }
        
        if (rubricsResult.success && rubricsResult.data) {
          // Filter out templates and transform to UI format
          const userRubrics = rubricsResult.data
            .filter(r => !r.is_template)
            .map(r => ({
              id: r.id,
              name: r.name,
              description: r.description || '',
              icon: 'essay',
              iconBg: 'bg-blue-100',
              iconColor: 'text-blue-600',
              criteria: r.criteria ? Object.keys(r.criteria).length : 0,
              points: r.total_points || 100,
            }));
          setRubricTemplates(userRubrics);
          if (userRubrics.length > 0) {
            setSelectedTemplate(userRubrics[0].id);
          }
        }
      } catch (error) {
        logger.error("Failed to load data", { error: error.message });
      }
    }
    loadData();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      referenceAnswer: "",
      course: "",
      dueDate: "",
      maxScore: 100,
      rubricId: "",
    },
  });

  // Auto-update maxScore when a rubric template is selected
  useEffect(() => {
    if (rubricTab === 'template' && selectedTemplate && rubricTemplates.length > 0) {
      const selectedRubric = rubricTemplates.find(r => r.id === selectedTemplate);
      if (selectedRubric && selectedRubric.points) {
        logger.debug('Updating maxScore from rubric template', { 
          rubricId: selectedTemplate, 
          rubricName: selectedRubric.name,
          points: selectedRubric.points 
        });
        setValue('maxScore', selectedRubric.points, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [selectedTemplate, rubricTemplates, setValue, rubricTab]);

  // Auto-update maxScore when custom rubric criteria change
  useEffect(() => {
    if (rubricTab === 'custom' && customCriteria.length > 0) {
      const totalPoints = customCriteria.reduce((sum, criterion) => sum + (criterion.points || 0), 0);
      if (totalPoints > 0) {
        logger.debug('Updating maxScore from custom rubric criteria', { 
          criteriaCount: customCriteria.length,
          totalPoints 
        });
        setValue('maxScore', totalPoints, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [customCriteria, setValue, rubricTab]);

  // Log errors for debugging (development only)
  if (Object.keys(errors).length > 0) {
    logger.debug("Form validation errors", { errors });
  }

  const steps = [
    { id: 1, name: "Details", status: currentStep > 1 ? "complete" : currentStep === 1 ? "current" : "upcoming" },
    { id: 2, name: "Reference", status: currentStep > 2 ? "complete" : currentStep === 2 ? "current" : "upcoming" },
    { id: 3, name: "Rubric", status: currentStep > 3 ? "complete" : currentStep === 3 ? "current" : "upcoming" },
    { id: 4, name: "Settings", status: currentStep === 4 ? "current" : "upcoming" },
  ];

  const renderRubricIcon = (icon) => {
    switch (icon) {
      case "essay":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h10" />
          </svg>
        );
      case "code":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case "lab":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case "short":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Custom rubric criteria management
  const addCriterion = () => {
    setCustomCriteria([
      ...customCriteria,
      { id: Date.now(), name: '', description: '', points: 25 }
    ]);
  };

  const removeCriterion = (id) => {
    if (customCriteria.length > 1) {
      setCustomCriteria(customCriteria.filter(c => c.id !== id));
    }
  };

  const updateCriterion = (id, field, value) => {
    setCustomCriteria(customCriteria.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleCreateAssignment = async () => {
    const data = getValues();
    
    // Basic validation
    if (!data.title || data.title.trim().length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Title is required and must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Find the course_id from the selected course code
      const selectedCourse = courses.find(c => c.code === data.course);
      
      // Determine rubric ID - create custom rubric if needed
      let rubricIdToUse = selectedTemplate || null;
      
      // If using custom rubric, create it first
      if (rubricTab === 'custom' && customCriteria.length > 0) {
        const totalPoints = customCriteria.reduce((sum, c) => sum + (c.points || 0), 0);
        
        // Convert array format to object format for backend
        // Frontend: [{ name: "Content", points: 30, description: "..." }]
        // Backend expects: { "content": { max_points: 30, description: "..." } }
        const criteriaObject = {};
        customCriteria.forEach((criterion) => {
          const key = criterion.name.toLowerCase().replace(/\s+/g, '_') || `criterion_${criterion.id}`;
          criteriaObject[key] = {
            max_points: criterion.points || 0,
            description: criterion.description || ''
          };
        });
        
        const rubricData = {
          name: customRubricName || `Custom Rubric - ${data.title}`,
          description: `Custom rubric for ${data.title}`,
          type: assignmentType === 'quiz' ? 'quiz' : 'essay',
          criteria: criteriaObject,
          total_points: totalPoints,
          is_template: false
        };
        
        logger.debug('Creating custom rubric', { name: rubricData.name, totalPoints });
        const rubricResult = await createRubric(rubricData);
        
        if (rubricResult.success && rubricResult.data?.id) {
          rubricIdToUse = rubricResult.data.id;
          logger.debug('Custom rubric created', { id: rubricIdToUse });
        } else {
          logger.warn('Failed to create custom rubric', { error: rubricResult.error });
          toast({
            title: 'Warning',
            description: 'Failed to create custom rubric. Assignment will be created without rubric.',
            variant: 'destructive',
          });
        }
      }
      
      // Store reference answer separately - don't include in description
      const assignmentData = {
        title: data.title,
        description: data.description || '',
        reference_answer: data.referenceAnswer || '',
        course_code: data.course || '',
        course_id: selectedCourse?.id || null,
        due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        total_points: data.maxScore || 100,
        status: assignmentStatus,
        assignment_type: assignmentType,
        // Assignment settings toggles
        allow_late_submissions: allowLateSubmissions,
        ai_grading_enabled: aiGrading,
        show_feedback_to_students: showFeedback,
        require_review_before_publish: requireReview,
        // Add rubric if selected (either template or newly created custom rubric)
        rubric_id: rubricIdToUse,
      };
      
      logger.debug('Creating assignment', { title: assignmentData.title });
      const result = await createAssignment(assignmentData);
      logger.apiResult('/api/v1/assignments', result);
      
      if (result.success) {
        const assignmentId = result.data?.id;
        
        // Upload question PDF if provided
        if (questionFile && assignmentId) {
          toast({
            title: 'Uploading',
            description: 'Uploading question PDF...',
          });
          const questionUploadResult = await uploadQuestionPdf(assignmentId, questionFile);
          if (!questionUploadResult.success) {
            logger.warn('Question PDF upload failed', { error: questionUploadResult.error });
            toast({
              title: 'Warning',
              description: 'Assignment created but question PDF upload failed: ' + questionUploadResult.error,
              variant: 'destructive',
            });
          } else if (questionUploadResult.data?.textExtracted) {
            toast({
              title: 'PDF Processed',
              description: `Question PDF uploaded and ${questionUploadResult.data.textLength} characters extracted`,
            });
          }
        }
        
        // Upload reference PDF if provided
        if (referenceFile && assignmentId) {
          toast({
            title: 'Uploading',
            description: 'Uploading reference PDF...',
          });
          const refUploadResult = await uploadReferencePdf(assignmentId, referenceFile);
          if (!refUploadResult.success) {
            logger.warn('Reference PDF upload failed', { error: refUploadResult.error });
            toast({
              title: 'Warning',
              description: 'Assignment created but reference PDF upload failed: ' + refUploadResult.error,
              variant: 'destructive',
            });
          } else if (refUploadResult.data?.textExtracted) {
            toast({
              title: 'PDF Processed',
              description: `Reference PDF uploaded and ${refUploadResult.data.textLength} characters extracted for AI grading`,
            });
          }
        }
        
        toast({
          title: 'Success',
          description: 'Assignment created successfully',
        });
        
        // If quiz type, redirect to quiz builder to add questions
        if (assignmentType === 'quiz' && assignmentId) {
          router.push(`/instructor/assignments/${assignmentId}/quiz`);
        } else {
          router.push("/instructor/assignments");
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create assignment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error("Failed to create assignment", { error: error.message });
      toast({
        title: 'Error',
        description: 'Failed to create assignment. Please try again.',
        variant: 'destructive',
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
        <h1 className="text-2xl font-bold text-foreground mb-1">Create New Assignment</h1>
        <p className="text-muted-foreground">Set up grading criteria for your students</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-8 mb-10">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.status === "complete"
                      ? "bg-green-500 text-white"
                      : step.status === "current"
                      ? "bg-blue-600 text-white"
                      : "bg-card border-2 border-border text-muted-foreground"
                  }`}
                >
                  {step.status === "complete" ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    step.status === "current" ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-20 h-0.5 bg-border mx-4 mt-[-20px]" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-xl border border-border p-8 max-w-4xl mx-auto">
          {/* Step 1: Details */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Assignment Details</h2>
              <p className="text-muted-foreground mb-6">Enter the basic information for your assignment</p>

              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Introduction to Python: Loop Basics"
                    {...register("title")}
                    className={`h-11 ${errors.title ? "border-red-500" : ""}`}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the assignment objectives and requirements..."
                    {...register("description")}
                    className={`min-h-[120px] ${errors.description ? "border-red-500" : ""}`}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      {...register("dueDate")}
                      className={`h-11 ${errors.dueDate ? "border-red-500" : ""}`}
                    />
                    {errors.dueDate && (
                      <p className="text-sm text-red-500">{errors.dueDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Select onValueChange={(value) => setValue("course", value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={courses.length === 0 ? "No courses available" : "Select a course"} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.code}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Question PDF Upload */}
                <div className="space-y-2">
                  <Label>Assignment Question (PDF)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a PDF containing the assignment question. The text will be extracted automatically.
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      ref={questionFileInputRef}
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Please select a PDF file under 10MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!file.name.toLowerCase().endsWith('.pdf')) {
                            toast({
                              title: "Invalid file type",
                              description: "Only PDF files are allowed",
                              variant: "destructive",
                            });
                            return;
                          }
                          setQuestionFile(file);
                          toast({
                            title: "PDF selected",
                            description: `${file.name} ready to upload`,
                          });
                        }
                      }}
                    />
                    {questionFile ? (
                      <>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-3 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-foreground font-medium mb-1">{questionFile.name}</p>
                        <p className="text-sm text-muted-foreground mb-3">{(questionFile.size / 1024).toFixed(1)} KB</p>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            type="button"
                            size="sm"
                            onClick={() => questionFileInputRef.current?.click()}
                          >
                            Change File
                          </Button>
                          <Button 
                            variant="ghost" 
                            type="button"
                            size="sm"
                            onClick={() => setQuestionFile(null)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg mx-auto mb-3 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground mb-1">Upload question PDF (optional)</p>
                        <p className="text-sm text-muted-foreground mb-3">PDF files up to 10MB</p>
                        <Button 
                          variant="outline" 
                          type="button"
                          size="sm"
                          onClick={() => questionFileInputRef.current?.click()}
                        >
                          Browse Files
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Step 2: Reference */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Reference Answer</h2>
              <p className="text-muted-foreground mb-6">Provide a model answer or key points for AI grading reference</p>

              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="referenceAnswer">Model Answer / Key Points (Text)</Label>
                  <Textarea
                    id="referenceAnswer"
                    placeholder="Enter the ideal answer or key concepts students should include..."
                    className="min-h-[200px]"
                    {...register("referenceAnswer")}
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be used by the AI to evaluate student submissions against expected content.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-sm text-muted-foreground">Or upload a PDF</span>
                  </div>
                </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: "File too large",
                            description: "Please select a PDF under 10MB",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (!file.name.toLowerCase().endsWith('.pdf')) {
                          toast({
                            title: "Invalid file type",
                            description: "Only PDF files are allowed for AI text extraction",
                            variant: "destructive",
                          });
                          return;
                        }
                        setReferenceFile(file);
                        toast({
                          title: "PDF selected",
                          description: `${file.name} ready to upload - text will be extracted for AI grading`,
                        });
                      }
                    }}
                  />
                  {referenceFile ? (
                    <>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-foreground font-medium mb-1">{referenceFile.name}</p>
                      <p className="text-sm text-muted-foreground mb-4">{(referenceFile.size / 1024).toFixed(1)} KB</p>
                      <div className="flex gap-2 justify-center">
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
                          onClick={() => setReferenceFile(null)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground mb-2">Upload reference answer PDF (optional)</p>
                      <p className="text-sm text-muted-foreground mb-4">PDF file up to 10MB - text will be extracted for AI grading</p>
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
              </form>
            </div>
          )}

          {/* Step 3: Rubric */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Choose a Grading Rubric</h2>
              <p className="text-muted-foreground mb-6">Select an existing rubric or create custom criteria for this assignment.</p>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setRubricTab("template")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rubricTab === "template"
                      ? "bg-card border border-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  My Rubrics
                </button>
                <button
                  onClick={() => setRubricTab("custom")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rubricTab === "custom"
                      ? "bg-card border border-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Custom
                </button>
              </div>

              {rubricTab === "template" ? (
                <>
                  {/* Rubric Grid */}
                  {rubricTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {rubricTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`text-left p-5 rounded-xl border-2 transition-all ${
                            selectedTemplate === template.id
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg ${template.iconBg} flex items-center justify-center ${template.iconColor}`}>
                              {renderRubricIcon(template.icon)}
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedTemplate === template.id
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {selectedTemplate === template.id && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              {template.criteria} Criteria
                            </Badge>
                            <Badge variant="outline" className="text-xs font-normal">
                              {template.points} Pts
                            </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-8 mb-6 border border-dashed border-border rounded-lg">
                      <p className="text-muted-foreground mb-2">No rubrics found</p>
                      <Link href="/instructor/rubrics/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                        Create your first rubric
                      </Link>
                    </div>
                  )}

                  <Link
                    href="/instructor/rubrics"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1"
                  >
                    View all templates
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Rubric Name</Label>
                    <Input 
                      placeholder="e.g., Custom Essay Rubric" 
                      className="h-11"
                      value={customRubricName}
                      onChange={(e) => setCustomRubricName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Criteria</Label>
                      <Button variant="outline" size="sm" onClick={addCriterion} type="button">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Criterion
                      </Button>
                    </div>

                    {customCriteria.map((criterion, index) => (
                    <div key={criterion.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <Input 
                            placeholder="Criterion name (e.g., Thesis Statement)" 
                            className="h-10"
                            value={criterion.name}
                            onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                          />
                          <Textarea 
                            placeholder="Description of what constitutes excellent, good, fair, poor work..." 
                            className="min-h-[80px]"
                            value={criterion.description}
                            onChange={(e) => updateCriterion(criterion.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label className="text-xs">Points</Label>
                          <Input 
                            type="number" 
                            placeholder="25" 
                            className="h-10"
                            value={criterion.points}
                            onChange={(e) => updateCriterion(criterion.id, 'points', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeCriterion(criterion.id)}
                          className="text-muted-foreground hover:text-red-500 mt-2"
                          disabled={customCriteria.length <= 1}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Settings */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Assignment Settings</h2>
              <p className="text-muted-foreground mb-6">Configure additional options for this assignment</p>

              <form className="space-y-6">
                {/* Status Selector */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="font-medium text-foreground mb-2 block">Assignment Status</Label>
                  <p className="text-sm text-muted-foreground mb-3">Control when students can see this assignment</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAssignmentStatus("draft")}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        assignmentStatus === "draft"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">Draft</div>
                      <div className="text-xs mt-1">Not visible to students</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentStatus("active")}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        assignmentStatus === "active"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">Active</div>
                      <div className="text-xs mt-1">Visible and accepting submissions</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentStatus("closed")}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        assignmentStatus === "closed"
                          ? "border-muted-foreground bg-muted text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">Closed</div>
                      <div className="text-xs mt-1">No longer accepting submissions</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Allow Late Submissions</p>
                      <p className="text-sm text-muted-foreground">Students can submit after the due date</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowLateSubmissions(!allowLateSubmissions)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${allowLateSubmissions ? 'bg-blue-600' : 'bg-muted'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${allowLateSubmissions ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">AI Grading</p>
                      <p className="text-sm text-muted-foreground">Automatically grade submissions using AI</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiGrading(!aiGrading)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${aiGrading ? 'bg-blue-600' : 'bg-muted'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${aiGrading ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Show Feedback to Students</p>
                      <p className="text-sm text-muted-foreground">Students can see AI-generated feedback</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFeedback(!showFeedback)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${showFeedback ? 'bg-blue-600' : 'bg-muted'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${showFeedback ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Require Review Before Publishing</p>
                      <p className="text-sm text-muted-foreground">Review AI grades before releasing to students</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireReview(!requireReview)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${requireReview ? 'bg-blue-600' : 'bg-muted'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${requireReview ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Maximum Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      {...register("maxScore", { valueAsNumber: true })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                    <Input
                      id="latePenalty"
                      type="number"
                      placeholder="10"
                      className="h-11"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between max-w-4xl mx-auto mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 gap-2">
              Next: {steps[currentStep]?.name}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
          ) : (
            <Button
              onClick={handleCreateAssignment}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isLoading ? "Creating..." : "Create Assignment"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </Button>
          )}
        </div>
      </>
  );
}
