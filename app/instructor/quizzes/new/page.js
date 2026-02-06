"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createAssignment, addQuizQuestion, getCourses } from "@/lib/api-client";
import logger from "@/lib/logger";

export default function CreateQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Quiz settings state
  const [quizSettings, setQuizSettings] = useState({
    title: "",
    description: "",
    course_code: "",
    due_date: "",
    time_limit_minutes: "",
    shuffle_questions: false,
    show_correct_answers: true,
  });
  
  // Questions state
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // UI state
  const [step, setStep] = useState(1); // 1: Settings, 2: Questions
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState(null);
  
  // Current question being edited
  const [currentQuestion, setCurrentQuestion] = useState({
    question_type: "multiple_choice",
    question_text: "",
    options: ["", "", "", ""],
    correct_answers: [],
    reference_answer: "",
    points: 10,
    explanation: "",
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const result = await getCourses();
      if (result.success) {
        setCourses(result.data || []);
      }
    } catch (error) {
      logger.error("Failed to load courses", { error: error.message });
    }
  };

  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  };

  const openAddQuestion = () => {
    setCurrentQuestion({
      question_type: "multiple_choice",
      question_text: "",
      options: ["", "", "", ""],
      correct_answers: [],
      reference_answer: "",
      points: 10,
      explanation: "",
    });
    setEditingQuestionIndex(null);
    setIsQuestionDialogOpen(true);
  };

  const openEditQuestion = (index) => {
    const q = questions[index];
    setCurrentQuestion({
      ...q,
      options: q.options || ["", "", "", ""],
    });
    setEditingQuestionIndex(index);
    setIsQuestionDialogOpen(true);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, ""],
    });
  };

  const removeOption = (index) => {
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    const newCorrect = currentQuestion.correct_answers
      .filter(i => i !== index)
      .map(i => (i > index ? i - 1 : i));
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions,
      correct_answers: newCorrect,
    });
  };

  const toggleCorrectAnswer = (index) => {
    const isCorrect = currentQuestion.correct_answers.includes(index);
    let newCorrect;
    if (isCorrect) {
      newCorrect = currentQuestion.correct_answers.filter(i => i !== index);
    } else {
      newCorrect = [...currentQuestion.correct_answers, index];
    }
    setCurrentQuestion({ ...currentQuestion, correct_answers: newCorrect });
  };

  const setTrueFalseAnswer = (value) => {
    setCurrentQuestion({
      ...currentQuestion,
      options: ["True", "False"],
      correct_answers: [value ? 0 : 1],
    });
  };

  const saveQuestion = () => {
    // Validation
    if (!currentQuestion.question_text.trim()) {
      toast({ title: "Error", description: "Question text is required", variant: "destructive" });
      return;
    }

    if (currentQuestion.question_type === "multiple_choice") {
      const validOptions = currentQuestion.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast({ title: "Error", description: "At least 2 options are required", variant: "destructive" });
        return;
      }
      if (currentQuestion.correct_answers.length === 0) {
        toast({ title: "Error", description: "Please mark at least one correct answer", variant: "destructive" });
        return;
      }
    }

    if (currentQuestion.question_type === "true_false" && currentQuestion.correct_answers.length === 0) {
      toast({ title: "Error", description: "Please select the correct answer", variant: "destructive" });
      return;
    }

    const questionToSave = {
      ...currentQuestion,
      options: currentQuestion.question_type === "multiple_choice" 
        ? currentQuestion.options.filter(o => o.trim())
        : currentQuestion.question_type === "true_false"
        ? ["True", "False"]
        : null,
    };

    if (editingQuestionIndex !== null) {
      const updated = [...questions];
      updated[editingQuestionIndex] = questionToSave;
      setQuestions(updated);
    } else {
      setQuestions([...questions, questionToSave]);
    }

    setIsQuestionDialogOpen(false);
    toast({ title: "Success", description: editingQuestionIndex !== null ? "Question updated" : "Question added" });
  };

  const confirmDeleteQuestion = (index) => {
    setDeleteQuestionIndex(index);
    setDeleteConfirmOpen(true);
  };

  const deleteQuestion = () => {
    if (deleteQuestionIndex !== null) {
      setQuestions(questions.filter((_, i) => i !== deleteQuestionIndex));
      setDeleteConfirmOpen(false);
      setDeleteQuestionIndex(null);
      toast({ title: "Question deleted" });
    }
  };

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated);
  };

  const handleSaveQuiz = async (publish = false) => {
    // Validation
    if (!quizSettings.title.trim()) {
      toast({ title: "Error", description: "Quiz title is required", variant: "destructive" });
      setStep(1);
      return;
    }

    if (questions.length === 0) {
      toast({ title: "Error", description: "Add at least one question", variant: "destructive" });
      return;
    }

    const totalPts = getTotalPoints();
    if (totalPts === 0) {
      toast({ title: "Error", description: "Total points must be greater than 0. Ensure all questions have points assigned.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Create the quiz assignment first - only include fields that have values
      const assignmentData = {
        title: quizSettings.title,
        status: publish ? "active" : "draft",
        assignment_type: "quiz",
        total_points: totalPts,
        shuffle_questions: quizSettings.shuffle_questions,
        show_correct_answers: quizSettings.show_correct_answers,
      };

      // Add optional fields only if they have values
      if (quizSettings.description) assignmentData.description = quizSettings.description;
      if (quizSettings.course_code) assignmentData.course_code = quizSettings.course_code;
      if (quizSettings.due_date) {
        // Convert datetime-local format to ISO 8601
        assignmentData.due_date = new Date(quizSettings.due_date).toISOString();
      }
      if (quizSettings.time_limit_minutes) assignmentData.time_limit_minutes = parseInt(quizSettings.time_limit_minutes);

      logger.debug("Creating quiz", { title: assignmentData.title });
      const assignmentResult = await createAssignment(assignmentData);
      logger.apiResult('/api/v1/assignments', assignmentResult);
      
      if (!assignmentResult.success) {
        throw new Error(assignmentResult.error || assignmentResult.message || "Failed to create quiz");
      }

      const quizId = assignmentResult.data.id;

      // Add all questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // Transform options to the format expected by backend
        let formattedOptions = null;
        if (q.question_type === 'multiple_choice' && q.options) {
          formattedOptions = q.options.map((optText, idx) => ({
            id: `opt_${idx}`,
            text: optText,
            is_correct: q.correct_answers?.includes(idx) || false
          }));
        } else if (q.question_type === 'true_false') {
          formattedOptions = [
            { id: 'true', text: 'True', is_correct: q.correct_answers?.includes(0) || false },
            { id: 'false', text: 'False', is_correct: q.correct_answers?.includes(1) || false }
          ];
        }

        const questionData = {
          question_order: i + 1,
          question_type: q.question_type,
          question_text: q.question_text,
          options: formattedOptions,
          reference_answer: q.reference_answer || null,
          points: q.points,
          explanation: q.explanation || null,
        };

        logger.debug(`Adding question ${i + 1}`);
        const qResult = await addQuizQuestion(quizId, questionData);
        if (!qResult.success) {
          logger.error("Failed to add question", { error: qResult.error });
        } else {
          logger.debug("Question added successfully", { questionId: qResult.data?.id });
        }
      }

      toast({
        title: "Quiz Created!",
        description: `"${quizSettings.title}" has been created with ${questions.length} questions.`,
      });

      router.push(`/instructor/assignments/${quizId}`);
    } catch (error) {
      logger.error("Failed to save quiz", { error: error.message });
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "multiple_choice": return "Multiple Choice";
      case "true_false": return "True/False";
      case "short_answer": return "Short Answer";
      case "essay": return "Essay";
      default: return type;
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case "multiple_choice":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "true_false":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "short_answer":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "essay":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Assignments
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Quiz</h1>
            <p className="text-muted-foreground">Build an auto-graded quiz with multiple question types</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            step === 1 ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 1 ? "bg-purple-600 text-white" : "bg-muted"
          }`}>1</span>
          Quiz Settings
        </button>
        <div className="w-8 h-px bg-border" />
        <button
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            step === 2 ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 2 ? "bg-purple-600 text-white" : "bg-muted"
          }`}>2</span>
          Questions ({questions.length})
        </button>
      </div>

      {/* Step 1: Quiz Settings */}
      {step === 1 && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={quizSettings.title}
                onChange={(e) => setQuizSettings({ ...quizSettings, title: e.target.value })}
                placeholder="e.g., Chapter 5 Quiz"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Instructions (Optional)</Label>
              <Textarea
                id="description"
                value={quizSettings.description}
                onChange={(e) => setQuizSettings({ ...quizSettings, description: e.target.value })}
                placeholder="Enter any instructions for students..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select
                  value={quizSettings.course_code}
                  onValueChange={(value) => setQuizSettings({ ...quizSettings, course_code: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select course" />
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

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={quizSettings.due_date}
                  onChange={(e) => setQuizSettings({ ...quizSettings, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  value={quizSettings.time_limit_minutes}
                  onChange={(e) => setQuizSettings({ ...quizSettings, time_limit_minutes: e.target.value })}
                  placeholder="No limit"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="shuffle"
                  checked={quizSettings.shuffle_questions}
                  onCheckedChange={(checked) => setQuizSettings({ ...quizSettings, shuffle_questions: checked })}
                />
                <Label htmlFor="shuffle" className="font-normal cursor-pointer">
                  Shuffle questions for each student
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="show_answers"
                  checked={quizSettings.show_correct_answers}
                  onCheckedChange={(checked) => setQuizSettings({ ...quizSettings, show_correct_answers: checked })}
                />
                <Label htmlFor="show_answers" className="font-normal cursor-pointer">
                  Show correct answers after submission
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setStep(2)} className="bg-purple-600 hover:bg-purple-700">
              Continue to Questions
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Questions Summary */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-lg font-semibold text-foreground">{questions.length}</span>
                <span className="text-muted-foreground ml-1">Questions</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <span className="text-lg font-semibold text-foreground">{getTotalPoints()}</span>
                <span className="text-muted-foreground ml-1">Total Points</span>
              </div>
            </div>
            <Button onClick={openAddQuestion} className="bg-purple-600 hover:bg-purple-700">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </Button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">Start building your quiz by adding questions</p>
              <Button onClick={openAddQuestion} className="bg-purple-600 hover:bg-purple-700">
                Add Your First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Reorder controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveQuestion(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-muted-foreground text-center">{index + 1}</span>
                      <button
                        onClick={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Question content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {getQuestionTypeIcon(q.question_type)}
                          {getQuestionTypeLabel(q.question_type)}
                        </Badge>
                        <Badge variant="outline">{q.points} pts</Badge>
                      </div>
                      <p className="text-foreground font-medium mb-2">{q.question_text}</p>
                      
                      {/* Show options for MCQ/TF */}
                      {(q.question_type === "multiple_choice" || q.question_type === "true_false") && q.options && (
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt, optIndex) => (
                            <span
                              key={optIndex}
                              className={`text-sm px-2 py-1 rounded ${
                                q.correct_answers?.includes(optIndex)
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {q.correct_answers?.includes(optIndex) && "✓ "}
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditQuestion(index)}
                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmDeleteQuestion(index)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg"
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

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button variant="outline" onClick={() => setStep(1)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/instructor/assignments")}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSaveQuiz(false)}
                disabled={isSaving || questions.length === 0}
              >
                {isSaving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                onClick={() => handleSaveQuiz(true)}
                disabled={isSaving || questions.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionIndex !== null ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Question Type */}
            <div>
              <Label>Question Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {["multiple_choice", "true_false", "short_answer", "essay"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentQuestion({ 
                      ...currentQuestion, 
                      question_type: type,
                      options: type === "true_false" ? ["True", "False"] : type === "multiple_choice" ? ["", "", "", ""] : [],
                      correct_answers: type === "true_false" ? [] : currentQuestion.correct_answers,
                    })}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      currentQuestion.question_type === type
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex justify-center mb-1">{getQuestionTypeIcon(type)}</div>
                    <span className="text-xs font-medium">{getQuestionTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div>
              <Label htmlFor="question_text">Question *</Label>
              <Textarea
                id="question_text"
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                placeholder="Enter your question..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Options for Multiple Choice */}
            {currentQuestion.question_type === "multiple_choice" && (
              <div>
                <Label>Answer Options</Label>
                <p className="text-xs text-muted-foreground mb-2">Check the box next to the correct answer(s)</p>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Checkbox
                        checked={currentQuestion.correct_answers.includes(index)}
                        onCheckedChange={() => toggleCorrectAnswer(index)}
                      />
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      {currentQuestion.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-muted-foreground hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="mt-2"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* True/False */}
            {currentQuestion.question_type === "true_false" && (
              <div>
                <Label>Correct Answer</Label>
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={() => setTrueFalseAnswer(true)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-colors ${
                      currentQuestion.correct_answers.includes(0)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    True
                  </button>
                  <button
                    onClick={() => setTrueFalseAnswer(false)}
                    className={`flex-1 p-4 rounded-lg border text-center transition-colors ${
                      currentQuestion.correct_answers.includes(1)
                        ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    False
                  </button>
                </div>
              </div>
            )}

            {/* Reference Answer for Short Answer/Essay */}
            {(currentQuestion.question_type === "short_answer" || currentQuestion.question_type === "essay") && (
              <div>
                <Label htmlFor="reference_answer">Reference Answer (for AI grading)</Label>
                <Textarea
                  id="reference_answer"
                  value={currentQuestion.reference_answer}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, reference_answer: e.target.value })}
                  placeholder="Enter the ideal/expected answer for AI grading..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This answer will be used by AI to grade student responses.
                </p>
              </div>
            )}

            {/* Points */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <Label htmlFor="explanation">Explanation (shown after quiz)</Label>
              <Textarea
                id="explanation"
                value={currentQuestion.explanation}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                placeholder="Explain the correct answer (optional)..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} className="bg-purple-600 hover:bg-purple-700">
              {editingQuestionIndex !== null ? "Update Question" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">This action cannot be undone. This will permanently delete the question.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={deleteQuestion} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
