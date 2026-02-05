"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getAssignment, getQuizQuestions, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import logger from "@/lib/logger";

export default function QuizBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const assignmentId = params.id;

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Question dialog state
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_type: 'multiple_choice',
    question_text: '',
    options: [
      { id: 'a', text: '', is_correct: false },
      { id: 'b', text: '', is_correct: false },
    ],
    correct_answers: [],
    reference_answer: '',
    points: 10,
    explanation: '',
    allow_partial_credit: true,
  });

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [assignmentResult, questionsResult] = await Promise.all([
        getAssignment(assignmentId),
        getQuizQuestions(assignmentId)
      ]);

      logger.debug('Instructor quiz loadData - questionsResult:', questionsResult);

      if (assignmentResult.success) {
        setAssignment(assignmentResult.data);
      }

      if (questionsResult.success) {
        logger.debug('Instructor - Setting questions:', questionsResult.data);
        setQuestions(questionsResult.data || []);
      } else {
        logger.error('Failed to load questions', { error: questionsResult.error });
      }
    } catch (error) {
      logger.error('Failed to load data', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetQuestionForm() {
    setQuestionForm({
      question_type: 'multiple_choice',
      question_text: '',
      options: [
        { id: 'a', text: '', is_correct: false },
        { id: 'b', text: '', is_correct: false },
      ],
      correct_answers: [],
      reference_answer: '',
      points: 10,
      explanation: '',
      allow_partial_credit: true,
    });
    setEditingQuestion(null);
  }

  function openAddQuestion() {
    resetQuestionForm();
    setShowQuestionDialog(true);
  }

  function openEditQuestion(question) {
    setEditingQuestion(question);
    setQuestionForm({
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.options || [
        { id: 'a', text: '', is_correct: false },
        { id: 'b', text: '', is_correct: false },
      ],
      correct_answers: question.correct_answers || [],
      reference_answer: question.reference_answer || '',
      points: question.points || 10,
      explanation: question.explanation || '',
      allow_partial_credit: question.allow_partial_credit !== false,
    });
    setShowQuestionDialog(true);
  }

  async function handleSaveQuestion() {
    if (!questionForm.question_text.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Question text is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate based on type
    if (questionForm.question_type === 'multiple_choice') {
      const validOptions = questionForm.options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        toast({
          title: 'Validation Error',
          description: 'At least 2 options are required',
          variant: 'destructive',
        });
        return;
      }
      if (!questionForm.options.some(o => o.is_correct)) {
        toast({
          title: 'Validation Error',
          description: 'Please mark at least one correct answer',
          variant: 'destructive',
        });
        return;
      }
    }

    if (questionForm.question_type === 'true_false') {
      if (!questionForm.options.some(o => o.is_correct)) {
        toast({
          title: 'Validation Error',
          description: 'Please select the correct answer (True or False)',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        question_type: questionForm.question_type,
        question_text: questionForm.question_text,
        points: questionForm.points,
        allow_partial_credit: questionForm.allow_partial_credit,
      };

      // Only add explanation if it has a value (don't send null)
      if (questionForm.explanation && questionForm.explanation.trim()) {
        payload.explanation = questionForm.explanation;
      }

      if (questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') {
        payload.options = questionForm.options.filter(o => o.text.trim());
      }

      if (questionForm.question_type === 'short_answer') {
        const filteredAnswers = questionForm.correct_answers.filter(a => a.trim());
        if (filteredAnswers.length > 0) {
          payload.correct_answers = filteredAnswers;
        }
        if (questionForm.reference_answer && questionForm.reference_answer.trim()) {
          payload.reference_answer = questionForm.reference_answer;
        }
      }

      if (questionForm.question_type === 'essay') {
        if (questionForm.reference_answer && questionForm.reference_answer.trim()) {
          payload.reference_answer = questionForm.reference_answer;
        }
      }

      logger.debug('Sending question payload:', payload);

      let result;
      if (editingQuestion) {
        result = await updateQuizQuestion(assignmentId, editingQuestion.id, payload);
      } else {
        result = await addQuizQuestion(assignmentId, payload);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: editingQuestion ? 'Question updated' : 'Question added',
        });
        setShowQuestionDialog(false);
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save question',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to save question', error);
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuestion() {
    if (!questionToDelete) return;

    try {
      const result = await deleteQuizQuestion(assignmentId, questionToDelete.id);
      if (result.success || result.code === undefined) {
        toast({
          title: 'Success',
          description: 'Question deleted',
        });
        loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete question',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to delete question', error);
    } finally {
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  }

  function addOption() {
    const nextId = String.fromCharCode(97 + questionForm.options.length); // a, b, c, d...
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { id: nextId, text: '', is_correct: false }]
    });
  }

  function removeOption(index) {
    if (questionForm.options.length <= 2) return;
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, options: newOptions });
  }

  function updateOption(index, field, value) {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  }

  function setCorrectOption(index) {
    const newOptions = questionForm.options.map((opt, i) => ({
      ...opt,
      is_correct: i === index
    }));
    setQuestionForm({ ...questionForm, options: newOptions });
  }

  function getQuestionTypeLabel(type) {
    const labels = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      essay: 'Essay',
    };
    return labels[type] || type;
  }

  function getQuestionTypeColor(type) {
    const colors = {
      multiple_choice: 'bg-blue-100 text-blue-700',
      true_false: 'bg-green-100 text-green-700',
      short_answer: 'bg-purple-100 text-purple-700',
      essay: 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assignment
          </button>
          <h1 className="text-2xl font-bold text-foreground">Quiz Builder</h1>
          <p className="text-muted-foreground">{assignment?.title || 'Loading...'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{questions.length}</div>
          <div className="text-sm text-muted-foreground">Questions • {totalPoints} points</div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4 mb-6">
        {questions.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-6">Add questions to create your quiz</p>
            <Button onClick={openAddQuestion}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Question
            </Button>
          </div>
        ) : (
          questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getQuestionTypeColor(question.question_type)}>
                        {getQuestionTypeLabel(question.question_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{question.points} pts</span>
                    </div>
                    <p className="text-foreground mb-3">{question.question_text}</p>
                    
                    {/* Show options for MC/TF */}
                    {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && question.options && (
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((opt) => (
                          <span
                            key={opt.id}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                              opt.is_correct
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-500'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <span className="font-medium mr-1">{opt.id.toUpperCase()}.</span>
                            {opt.text}
                            {opt.is_correct && (
                              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditQuestion(question)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setQuestionToDelete(question);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Question Button */}
      {questions.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={openAddQuestion} variant="outline" className="gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </Button>
        </div>
      )}

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>
              Configure the question details and correct answer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Question Type */}
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value) => {
                  const newForm = { ...questionForm, question_type: value };
                  if (value === 'true_false') {
                    newForm.options = [
                      { id: 'true', text: 'True', is_correct: false },
                      { id: 'false', text: 'False', is_correct: false },
                    ];
                  } else if (value === 'multiple_choice' && questionForm.question_type === 'true_false') {
                    newForm.options = [
                      { id: 'a', text: '', is_correct: false },
                      { id: 'b', text: '', is_correct: false },
                    ];
                  }
                  setQuestionForm(newForm);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                placeholder="Enter your question..."
                className="min-h-[100px]"
              />
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
            </div>

            {/* Multiple Choice Options */}
            {questionForm.question_type === 'multiple_choice' && (
              <div className="space-y-3">
                <Label>Answer Options</Label>
                {questionForm.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(index)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        option.is_correct
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-border hover:border-green-400'
                      }`}
                    >
                      {option.is_correct && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-medium text-muted-foreground w-6">{option.id.toUpperCase()}.</span>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`Option ${option.id.toUpperCase()}`}
                      className="flex-1"
                    />
                    {questionForm.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
                {questionForm.options.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    Add Option
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">Click the circle to mark the correct answer</p>
              </div>
            )}

            {/* True/False Options */}
            {questionForm.question_type === 'true_false' && (
              <div className="space-y-3">
                <Label>Correct Answer</Label>
                <div className="flex gap-4">
                  {questionForm.options.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCorrectOption(index)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        option.is_correct
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Short Answer Correct Answers */}
            {questionForm.question_type === 'short_answer' && (
              <div className="space-y-3">
                <Label>Acceptable Answers</Label>
                <Textarea
                  value={questionForm.correct_answers.join('\n')}
                  onChange={(e) => setQuestionForm({ 
                    ...questionForm, 
                    correct_answers: e.target.value.split('\n').filter(a => a.trim()) 
                  })}
                  placeholder="Enter each acceptable answer on a new line"
                  className="min-h-[80px]"
                />
                <p className="text-sm text-muted-foreground">Enter each acceptable answer on a separate line. AI will also evaluate similar answers.</p>
              </div>
            )}

            {/* Essay/Short Answer Reference */}
            {(questionForm.question_type === 'essay' || questionForm.question_type === 'short_answer') && (
              <div className="space-y-2">
                <Label>Reference Answer (for AI grading)</Label>
                <Textarea
                  value={questionForm.reference_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, reference_answer: e.target.value })}
                  placeholder="Enter the ideal answer for AI to compare against..."
                  className="min-h-[120px]"
                />
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-2">
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Optional explanation to show after the student answers..."
                className="min-h-[80px]"
              />
            </div>

            {/* Partial Credit */}
            {(questionForm.question_type === 'short_answer' || questionForm.question_type === 'essay') && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Partial Credit</Label>
                  <p className="text-sm text-muted-foreground">AI can award partial points for partially correct answers</p>
                </div>
                <Switch
                  checked={questionForm.allow_partial_credit}
                  onCheckedChange={(checked) => setQuestionForm({ ...questionForm, allow_partial_credit: checked })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
