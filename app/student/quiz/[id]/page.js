"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAssignment, getQuizQuestions, submitQuiz, getQuizResults } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import logger from "@/lib/logger";

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} - Shuffled array (new array, not mutated)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format time as mm:ss
 * @param {number} seconds - Seconds to format
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const assignmentId = params.id;

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [existingResults, setExistingResults] = useState(null);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const timerRef = useRef(null);
  const hasAutoSubmittedRef = useRef(false);

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

      logger.debug('Quiz loadData - assignmentResult:', assignmentResult);
      logger.debug('Quiz loadData - questionsResult:', questionsResult);

      if (assignmentResult.success) {
        setAssignment(assignmentResult.data);
      } else {
        logger.error('Failed to load assignment', { error: assignmentResult.error });
      }

      if (questionsResult.success) {
        logger.debug('Setting questions:', questionsResult.data);
        setQuestions(questionsResult.data || []);
      } else {
        logger.error('Failed to load questions', { error: questionsResult.error });
      }

      // Check if student already has results (404 is expected if not taken yet)
      try {
        const resultsResult = await getQuizResults(assignmentId);
        if (resultsResult.success && resultsResult.data) {
          setExistingResults(resultsResult.data);
        }
      } catch (e) {
        // No previous results - this is fine for a new quiz attempt
      }
    } catch (error) {
      logger.error('Failed to load quiz', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function startQuiz() {
    // Shuffle questions if enabled
    let quizQuestions = questions;
    if (assignment?.shuffle_questions) {
      quizQuestions = shuffleArray(questions);
      setQuestions(quizQuestions);
    }
    
    // Start timer if time limit is set
    if (assignment?.time_limit_minutes) {
      const totalSeconds = assignment.time_limit_minutes * 60;
      setTimeRemaining(totalSeconds);
    }
    
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
  }

  // Timer effect
  useEffect(() => {
    if (quizStarted && timeRemaining !== null && !quizSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Auto-submit when time runs out
            if (!hasAutoSubmittedRef.current) {
              hasAutoSubmittedRef.current = true;
              handleAutoSubmit();
            }
            return 0;
          }
          // Show warning at 5 minutes
          if (prev === 300) {
            setShowTimeWarning(true);
            setTimeout(() => setShowTimeWarning(false), 5000);
          }
          // Show warning at 1 minute
          if (prev === 60) {
            setShowTimeWarning(true);
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [quizStarted, timeRemaining !== null, quizSubmitted]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  async function handleAutoSubmit() {
    toast({
      title: 'Time\'s Up!',
      description: 'Your quiz is being submitted automatically.',
      variant: 'destructive',
    });
    await handleSubmit();
  }

  function setAnswer(questionId, answer) {
    setAnswers({ ...answers, [questionId]: answer });
  }

  function goToQuestion(index) {
    setCurrentQuestion(index);
  }

  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function prevQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const answersList = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer_text: typeof answer === 'string' ? answer : answer?.id,
        selected_options: Array.isArray(answer) ? answer : undefined,
      }));

      const result = await submitQuiz(assignmentId, answersList);

      if (result.success) {
        setQuizSubmitted(true);
        setResults(result.data);
        setShowSubmitDialog(false);
        toast({
          title: 'Quiz Submitted!',
          description: `Your score: ${result.data.score}%`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit quiz',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to submit quiz', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quiz',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  
  // Calculate question type breakdown for preview
  const questionTypeCounts = questions.reduce((acc, q) => {
    const type = q.question_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  // Helper to get question type display info
  function getQuestionTypeInfo(type) {
    const typeMap = {
      multiple_choice: { label: 'Multiple Choice', icon: '◉', color: 'blue' },
      true_false: { label: 'True / False', icon: '✓✗', color: 'green' },
      short_answer: { label: 'Short Answer', icon: '✎', color: 'amber' },
      essay: { label: 'Essay', icon: '📝', color: 'purple' }
    };
    return typeMap[type] || { label: type, icon: '?', color: 'gray' };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show existing results if quiz was already taken
  if (existingResults && !quizStarted) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-card rounded-xl border border-border p-8 text-center mb-6">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            existingResults.submission.score >= 70 ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            <span className={`text-3xl font-bold ${
              existingResults.submission.score >= 70 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {existingResults.submission.score}%
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Quiz Completed</h2>
          <p className="text-muted-foreground mb-4">{assignment?.title}</p>
          <p className="text-sm text-muted-foreground">
            Submitted on {new Date(existingResults.submission.submitted_at).toLocaleDateString()}
          </p>
        </div>

        {/* Show answers with feedback */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Your Answers</h3>
        <div className="space-y-4">
          {existingResults.answers.map((answer, index) => (
            <div
              key={answer.question_id}
              className={`bg-card rounded-xl border p-6 ${
                answer.is_correct ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  answer.is_correct ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {answer.is_correct ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-medium mb-2">Q{index + 1}: {answer.question_text}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Your answer:</span> {answer.your_answer || 'No answer'}
                  </p>
                  {!answer.is_correct && answer.correct_answer && (
                    <p className="text-sm text-green-600 mb-2">
                      <span className="font-medium">Correct answer:</span>{' '}
                      {Array.isArray(answer.correct_answer) ? answer.correct_answer.join(', ') : answer.correct_answer}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {answer.points_earned} / {answer.points_possible} points
                  </p>
                  {answer.feedback && (
                    <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-lg">{answer.feedback}</p>
                  )}
                  {answer.explanation && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <span className="font-medium">Explanation:</span> {answer.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show results after submission
  if (quizSubmitted && results) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-8 text-center mb-6">
          <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
            results.score >= 70 ? 'bg-green-100 dark:bg-green-900/30' : results.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <span className={`text-4xl font-bold ${
              results.score >= 70 ? 'text-green-600' : results.score >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {results.score}%
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {results.score >= 70 ? 'Great job!' : results.score >= 50 ? 'Good effort!' : 'Keep practicing!'}
          </h2>
          <p className="text-muted-foreground mb-4">
            You earned {results.points_earned} out of {results.total_points} points
          </p>
          <Button onClick={() => router.push('/student/assignments')}>
            Back to Assignments
          </Button>
        </div>

        {/* Show answers with explanations if available */}
        {results.answers && results.answers.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Review Your Answers</h3>
            <div className="space-y-4">
              {results.answers.map((answer, index) => (
                <div 
                  key={answer.question_id} 
                  className={`p-4 rounded-lg border ${
                    answer.is_correct 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
                    <span className={`text-sm font-medium ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      {answer.is_correct ? '✓ Correct' : '✗ Incorrect'} ({answer.points_earned} pts)
                    </span>
                  </div>
                  <p className="text-foreground font-medium mb-2">{answer.question_text}</p>
                  
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Your answer:</span> {answer.student_answer || 'No answer'}
                    </p>
                    {!answer.is_correct && answer.correct_answer && (
                      <p className="text-green-700">
                        <span className="font-medium">Correct answer:</span> {answer.correct_answer}
                      </p>
                    )}
                  </div>

                  {/* Show explanation if available */}
                  {answer.explanation && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-blue-600">💡 Explanation:</span> {answer.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz intro screen
  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{assignment?.title}</h1>
          <p className="text-muted-foreground mb-6">{assignment?.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-4 max-w-sm mx-auto">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
          </div>

          {/* Question Types Breakdown */}
          {Object.keys(questionTypeCounts).length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4 mb-4 max-w-md mx-auto">
              <h3 className="text-sm font-medium text-foreground mb-3">Quiz Contains</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(questionTypeCounts).map(([type, count]) => {
                  const info = getQuestionTypeInfo(type);
                  return (
                    <div 
                      key={type}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                        ${info.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''}
                        ${info.color === 'green' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : ''}
                        ${info.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : ''}
                        ${info.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : ''}
                        ${info.color === 'gray' ? 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400' : ''}
                      `}
                    >
                      <span>{info.icon}</span>
                      <span>{count} {info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quiz Settings Info */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {assignment?.time_limit_minutes && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {assignment.time_limit_minutes} min time limit
              </div>
            )}
            {assignment?.shuffle_questions && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Shuffled questions
              </div>
            )}
          </div>

          <Button onClick={startQuiz} size="lg" className="gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Quiz in progress
  const currentQ = questions[currentQuestion];

  // Safety check - if no current question, show loading
  if (!currentQ) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Time Warning Toast */}
      {showTimeWarning && timeRemaining !== null && timeRemaining <= 300 && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">
              {timeRemaining <= 60 ? 'Less than 1 minute remaining!' : '5 minutes remaining!'}
            </span>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">{assignment?.title}</h2>
          <div className="flex items-center gap-3">
            {/* Timer Display */}
            {timeRemaining !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-medium ${
                timeRemaining <= 60 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse' 
                  : timeRemaining <= 300 
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeRemaining)}
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {answeredCount} of {totalQuestions} answered
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => goToQuestion(index)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                index === currentQuestion
                  ? 'bg-blue-500'
                  : answers[q.id]
                  ? 'bg-green-400'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-card rounded-xl border border-border p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            Question {currentQuestion + 1} of {totalQuestions}
          </Badge>
          <span className="text-sm text-muted-foreground">{currentQ.points} points</span>
        </div>

        <p className="text-lg text-foreground mb-6">{currentQ.question_text}</p>

        {/* Multiple Choice */}
        {currentQ.question_type === 'multiple_choice' && (
          <div className="space-y-3">
            {currentQ.options?.map((option) => (
              <button
                key={option.id}
                onClick={() => setAnswer(currentQ.id, option.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  answers[currentQ.id] === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <span className="font-medium mr-3">{option.id.toUpperCase()}.</span>
                {option.text}
              </button>
            ))}
          </div>
        )}

        {/* True/False */}
        {currentQ.question_type === 'true_false' && (
          <div className="flex gap-4">
            {currentQ.options?.map((option) => (
              <button
                key={option.id}
                onClick={() => setAnswer(currentQ.id, option.id)}
                className={`flex-1 py-4 px-6 rounded-lg border-2 font-medium transition-colors ${
                  answers[currentQ.id] === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {/* Short Answer */}
        {currentQ.question_type === 'short_answer' && (
          <div>
            <Label>Your Answer</Label>
            <Textarea
              value={answers[currentQ.id] || ''}
              onChange={(e) => setAnswer(currentQ.id, e.target.value)}
              placeholder="Type your answer..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        )}

        {/* Essay */}
        {currentQ.question_type === 'essay' && (
          <div>
            <Label>Your Answer</Label>
            <Textarea
              value={answers[currentQ.id] || ''}
              onChange={(e) => setAnswer(currentQ.id, e.target.value)}
              placeholder="Write your essay response..."
              className="mt-2 min-h-[200px]"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestion === questions.length - 1 ? (
            <Button onClick={() => setShowSubmitDialog(true)}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={nextQuestion}>
              Next
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz</DialogTitle>
            <DialogDescription>
              {answeredCount < totalQuestions ? (
                <>
                  You have answered {answeredCount} of {totalQuestions} questions.
                  <br />
                  <span className="text-orange-600 font-medium">
                    {totalQuestions - answeredCount} question(s) are unanswered.
                  </span>
                </>
              ) : (
                'Are you sure you want to submit your quiz? You cannot change your answers after submission.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Review Answers
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
