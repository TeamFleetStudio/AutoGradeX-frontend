/**
 * API Client for communicating with the Fastify backend
 * @module lib/api-client
 */

import logger from './logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Makes an HTTP request to the backend API
 * @param {string} endpoint - The API endpoint (e.g., '/api/v1/submissions')
 * @param {Object} options - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.headers] - Additional headers
 * @returns {Promise<{success: boolean, data?: any, error?: string, code?: string}>}
 */
async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;

  const config = {
    method,
    headers: {
      ...headers,
    },
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Only set content-type and body if there's actually a body to send
  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 204 No Content responses (e.g., DELETE requests)
    if (response.status === 204) {
      return { success: true };
    }
    
    const data = await response.json();

    if (!response.ok) {
      // Auto-logout on 401 (token expired or invalid)
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/signin';
        return {
          success: false,
          error: 'Session expired. Please sign in again.',
          code: 'SESSION_EXPIRED',
        };
      }
      return {
        success: false,
        error: data.error || 'An error occurred',
        code: data.code || 'UNKNOWN_ERROR',
      };
    }

    return data;
  } catch (error) {
    logger.error('API request failed', { endpoint, error: error.message });
    return {
      success: false,
      error: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Upload a file to the backend
 * @param {File} file - The file to upload
 * @returns {Promise<{success: boolean, data?: {filename: string, url: string, originalName: string, size: number}, error?: string}>}
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    method: 'POST',
    body: formData,
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/files/upload`, config);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
        code: data.code || 'UPLOAD_ERROR',
      };
    }

    return data;
  } catch (error) {
    logger.error('File upload failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Upload a profile avatar image
 * @param {File} file - The image file to upload
 * @returns {Promise<{success: boolean, data?: {avatar_url: string}, error?: string}>}
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const config = {
    method: 'POST',
    body: formData,
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/avatar`, config);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
        code: data.code || 'UPLOAD_ERROR',
      };
    }

    return data;
  } catch (error) {
    logger.error('Avatar upload failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

// ============================================
// Auth API
// ============================================

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, data?: {token: string, user: Object}, error?: string}>}
 */
export async function signIn(email, password) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Return specific error messages for sign-in failures
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid email or password. Please check your credentials and try again.',
          code: data.code || 'INVALID_CREDENTIALS',
        };
      }
      return {
        success: false,
        error: data.error || 'Sign in failed. Please try again.',
        code: data.code || 'UNKNOWN_ERROR',
      };
    }
    
    return data;
  } catch (error) {
    logger.error('Sign in request failed', { error: error.message });
    return {
      success: false,
      error: 'Unable to connect to the server. Please check your internet connection.',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Sign up a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User full name
 * @param {string} userData.role - User role ('instructor' or 'student')
 * @returns {Promise<{success: boolean, data?: {token: string, user: Object}, error?: string}>}
 */
export async function signUp(userData) {
  return apiRequest('/api/v1/auth/signup', {
    method: 'POST',
    body: userData,
  });
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean}>}
 */
export async function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
  return { success: true };
}

// ============================================
// User API
// ============================================

/**
 * Get current user profile
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getUserProfile() {
  return apiRequest('/api/v1/users/profile');
}

/**
 * Get all students (for instructors)
 * @param {Object} [options] - Query options
 * @param {string} [options.course_code] - Filter by course code
 * @param {string} [options.search] - Search by name or email
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getStudents(options = {}) {
  const params = new URLSearchParams();
  if (options.course_code) params.append('course_code', options.course_code);
  if (options.search) params.append('search', options.search);
  const queryString = params.toString();
  return apiRequest(`/api/v1/users/students${queryString ? '?' + queryString : ''}`);
}

/**
 * Get user statistics
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getUserStats() {
  return apiRequest('/api/v1/users/stats');
}

/**
 * Update current user profile
 * @param {Object} updates - Profile fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateUserProfile(updates) {
  return apiRequest('/api/v1/users/profile', {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function changePassword(currentPassword, newPassword) {
  return apiRequest('/api/v1/users/password', {
    method: 'PUT',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

/**
 * Request password reset email
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function requestPasswordReset(email) {
  return apiRequest('/api/v1/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
}

/**
 * Reset password with token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetPassword(token, newPassword) {
  return apiRequest('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, new_password: newPassword },
  });
}

// ============================================
// Courses API
// ============================================

/**
 * Get all courses (instructors see their own, students see enrolled)
 * @param {Object} filters - Optional filters
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getCourses(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const query = params.toString();
  return apiRequest(`/api/v1/courses${query ? `?${query}` : ''}`);
}

/**
 * Get a specific course by ID
 * @param {string} courseId - Course UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}`);
}

/**
 * Create a new course
 * @param {Object} course - Course data
 * @param {string} course.name - Course name
 * @param {string} [course.code] - Course code
 * @param {string} [course.description] - Course description
 * @param {number} [course.credits] - Course credits
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createCourse(course) {
  return apiRequest('/api/v1/courses', {
    method: 'POST',
    body: course,
  });
}

/**
 * Update a course
 * @param {string} courseId - Course UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateCourse(courseId, updates) {
  return apiRequest(`/api/v1/courses/${courseId}`, {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Delete a course
 * @param {string} courseId - Course UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}`, {
    method: 'DELETE',
  });
}

/**
 * Archive a course
 * @param {string} courseId - Course UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function archiveCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/archive`, {
    method: 'POST',
  });
}

/**
 * Unarchive (restore) a course
 * @param {string} courseId - Course UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function unarchiveCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/unarchive`, {
    method: 'POST',
  });
}

/**
 * Enroll a student in a course using enrollment code
 * @param {string} enrollmentCode - Course enrollment code
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function enrollInCourse(enrollmentCode) {
  return apiRequest('/api/v1/courses/enroll', {
    method: 'POST',
    body: { enrollment_code: enrollmentCode },
  });
}

/**
 * Unenroll from a course
 * @param {string} courseId - Course UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unenrollFromCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/unenroll`, {
    method: 'POST',
  });
}

// ============================================
// Assignments API
// ============================================

/**
 * Get all assignments (instructor sees their own, students see active ones)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.status] - Filter by status (draft, active, closed)
 * @param {string} [filters.course_code] - Filter by course code
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getAssignments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.course_code) params.append('course_code', filters.course_code);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const query = params.toString();
  return apiRequest(`/api/v1/assignments${query ? `?${query}` : ''}`);
}

/**
 * Get a specific assignment by ID
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getAssignment(assignmentId) {
  return apiRequest(`/api/v1/assignments/${assignmentId}`);
}

/**
 * Create a new assignment
 * @param {Object} assignment - Assignment data
 * @param {string} assignment.title - Assignment title
 * @param {string} [assignment.description] - Assignment description
 * @param {string} [assignment.course_code] - Course code
 * @param {string} [assignment.rubric_id] - Rubric UUID
 * @param {string} [assignment.due_date] - Due date (ISO string)
 * @param {number} [assignment.max_resubmissions] - Max resubmissions allowed
 * @param {number} [assignment.total_points] - Total points
 * @param {string} [assignment.status] - Status (draft, active, closed)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createAssignment(assignment) {
  return apiRequest('/api/v1/assignments', {
    method: 'POST',
    body: assignment,
  });
}

/**
 * Update an assignment
 * @param {string} assignmentId - Assignment UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateAssignment(assignmentId, updates) {
  return apiRequest(`/api/v1/assignments/${assignmentId}`, {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Delete an assignment
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteAssignment(assignmentId) {
  return apiRequest(`/api/v1/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

/**
 * Upload a PDF as assignment question
 * @param {string} assignmentId - Assignment UUID
 * @param {File} file - PDF file to upload
 * @returns {Promise<{success: boolean, data?: {filename: string, path: string, size: number, textExtracted: boolean, textLength: number}, error?: string}>}
 */
export async function uploadQuestionPdf(assignmentId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    method: 'POST',
    body: formData,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/assignments/${assignmentId}/upload-question`, config);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload question PDF',
        code: data.code || 'UPLOAD_ERROR',
      };
    }

    return data;
  } catch (error) {
    logger.error('Question PDF upload failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Upload a PDF as reference/model answer
 * @param {string} assignmentId - Assignment UUID
 * @param {File} file - PDF file to upload
 * @returns {Promise<{success: boolean, data?: {filename: string, path: string, size: number, textExtracted: boolean, textLength: number}, error?: string}>}
 */
export async function uploadReferencePdf(assignmentId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    method: 'POST',
    body: formData,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/assignments/${assignmentId}/upload-reference`, config);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload reference PDF',
        code: data.code || 'UPLOAD_ERROR',
      };
    }

    return data;
  } catch (error) {
    logger.error('Reference PDF upload failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Delete question PDF from assignment
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteQuestionPdf(assignmentId) {
  return apiRequest(`/api/v1/assignments/${assignmentId}/question-pdf`, {
    method: 'DELETE',
  });
}

/**
 * Delete reference PDF from assignment
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteReferencePdf(assignmentId) {
  return apiRequest(`/api/v1/assignments/${assignmentId}/reference-pdf`, {
    method: 'DELETE',
  });
}

// ============================================
// Quiz API
// ============================================

/**
 * Add a question to a quiz assignment
 * @param {string} assignmentId - Assignment UUID
 * @param {Object} question - Question data
 * @param {string} question.question_type - Type: multiple_choice, true_false, short_answer, essay
 * @param {string} question.question_text - The question text
 * @param {Array} [question.options] - Options for multiple choice
 * @param {Array} [question.correct_answers] - Correct answers for short answer
 * @param {string} [question.reference_answer] - Reference answer for essay
 * @param {number} question.points - Points for this question
 * @param {string} [question.explanation] - Explanation shown after answering
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function addQuizQuestion(assignmentId, question) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/questions`, {
    method: 'POST',
    body: question,
  });
}

/**
 * Get all questions for a quiz
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, data?: Array, meta?: Object, error?: string}>}
 */
export async function getQuizQuestions(assignmentId) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/questions`);
}

/**
 * Update a quiz question
 * @param {string} assignmentId - Assignment UUID
 * @param {string} questionId - Question UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateQuizQuestion(assignmentId, questionId, updates) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/questions/${questionId}`, {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Delete a quiz question
 * @param {string} assignmentId - Assignment UUID
 * @param {string} questionId - Question UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteQuizQuestion(assignmentId, questionId) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder quiz questions
 * @param {string} assignmentId - Assignment UUID
 * @param {Array<string>} questionIds - Ordered array of question IDs
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reorderQuizQuestions(assignmentId, questionIds) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/questions/reorder`, {
    method: 'PUT',
    body: { question_ids: questionIds },
  });
}

/**
 * Submit quiz answers
 * @param {string} assignmentId - Assignment UUID
 * @param {Array} answers - Array of { question_id, answer_text, selected_options, time_spent_seconds }
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function submitQuiz(assignmentId, answers) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/submit`, {
    method: 'POST',
    body: { answers },
  });
}

/**
 * Get quiz results for a student
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getQuizResults(assignmentId) {
  return apiRequest(`/api/v1/quizzes/${assignmentId}/results`);
}

// ============================================
// Submissions API
// ============================================

/**
 * Get submissions (filtered by role and optional params)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.assignment_id] - Filter by assignment
 * @param {string} [filters.status] - Filter by status (pending, graded, error)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getSubmissions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assignment_id) params.append('assignment_id', filters.assignment_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const query = params.toString();
  return apiRequest(`/api/v1/submissions${query ? `?${query}` : ''}`);
}

/**
 * Get a specific submission by ID
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getSubmission(submissionId) {
  return apiRequest(`/api/v1/submissions/${submissionId}`);
}

/**
 * Create a new submission (student only)
 * @param {Object} submission - Submission data
 * @param {string} submission.assignment_id - Assignment UUID
 * @param {string} submission.content - Submission content/answer
 * @param {string} [submission.pdf_url] - Optional PDF URL
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createSubmission(submission) {
  return apiRequest('/api/v1/submissions', {
    method: 'POST',
    body: submission,
  });
}

/**
 * Get submission version history for an assignment
 * Returns all versions with scores and timestamps for version timeline display
 * @param {string} assignmentId - Assignment UUID
 * @param {string} [studentId] - Student UUID (required for instructor view)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getSubmissionHistory(assignmentId, studentId = null) {
  const params = new URLSearchParams();
  if (studentId) params.append('studentId', studentId);
  const query = params.toString();
  return apiRequest(`/api/v1/submissions/history/${assignmentId}${query ? `?${query}` : ''}`);
}

// ============================================
// Grades API
// ============================================

/**
 * Get grades (filtered by role and optional params)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.assignment_id] - Filter by assignment
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getGrades(filters = {}) {
  const params = new URLSearchParams();
  if (filters.assignment_id) params.append('assignment_id', filters.assignment_id);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const query = params.toString();
  return apiRequest(`/api/v1/grades${query ? `?${query}` : ''}`);
}

/**
 * Get a specific grade by ID
 * @param {string} gradeId - Grade UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getGrade(gradeId) {
  return apiRequest(`/api/v1/grades/${gradeId}`);
}

/**
 * Get grade by submission ID
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getGradeBySubmission(submissionId) {
  return apiRequest(`/api/v1/grades/submission/${submissionId}`);
}

/**
 * Update a grade (instructor only)
 * @param {string} gradeId - Grade UUID
 * @param {Object} updates - Fields to update (score, feedback, is_approved)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateGrade(gradeId, updates) {
  return apiRequest(`/api/v1/grades/${gradeId}`, {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Grade a submission (create or update grade)
 * @param {string} submissionId - Submission UUID
 * @param {Object} gradeData - Grading data
 * @param {number} [gradeData.score] - Score for the submission
 * @param {string} [gradeData.feedback] - Feedback for the student
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function gradeSubmission(submissionId, gradeData) {
  return apiRequest(`/api/v1/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: gradeData,
  });
}

/**
 * Get AI grade preview without saving
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getAIGradePreview(submissionId) {
  return apiRequest(`/api/v1/submissions/${submissionId}/ai-preview`, {
    method: 'POST',
  });
}

// ============================================
// Rubrics API
// ============================================

/**
 * Get rubrics (user's own + templates)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.type] - Filter by type (essay, coding, quiz, lab, other)
 * @param {boolean} [filters.is_template] - Filter by template status
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getRubrics(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.is_template !== undefined) params.append('is_template', filters.is_template);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const query = params.toString();
  return apiRequest(`/api/v1/rubrics${query ? `?${query}` : ''}`);
}

/**
 * Get rubric templates (public)
 * @param {string} [type] - Optional type filter
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getRubricTemplates(type = null) {
  const query = type ? `?type=${type}` : '';
  return apiRequest(`/api/v1/rubrics/templates${query}`);
}

/**
 * Get a specific rubric by ID
 * @param {string} rubricId - Rubric UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getRubric(rubricId) {
  return apiRequest(`/api/v1/rubrics/${rubricId}`);
}

/**
 * Create a new rubric
 * @param {Object} rubric - Rubric data
 * @param {string} rubric.name - Rubric name
 * @param {string} [rubric.description] - Rubric description
 * @param {Array} rubric.criteria - Array of grading criteria
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createRubric(rubric) {
  return apiRequest('/api/v1/rubrics', {
    method: 'POST',
    body: rubric,
  });
}

/**
 * Update an existing rubric
 * @param {string} rubricId - Rubric UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateRubric(rubricId, updates) {
  return apiRequest(`/api/v1/rubrics/${rubricId}`, {
    method: 'PUT',
    body: updates,
  });
}

/**
 * Delete a rubric
 * @param {string} rubricId - Rubric UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteRubric(rubricId) {
  return apiRequest(`/api/v1/rubrics/${rubricId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Batch Operations API
// ============================================

/**
 * Trigger batch grading for an assignment
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function triggerBatchGrading(assignmentId) {
  return apiRequest('/api/v1/batch/grade', {
    method: 'POST',
    body: { assignment_id: assignmentId },
  });
}

/**
 * Get batch job status
 * @param {string} jobId - Batch job UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getBatchJobStatus(jobId) {
  return apiRequest(`/api/v1/batch/status/${jobId}`);
}

// ============================================
// Export API
// ============================================

/**
 * Export grades for an assignment
 * @param {string} assignmentId - Assignment UUID
 * @param {string} format - Export format (csv, pdf)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function exportGrades(assignmentId, format = 'csv') {
  return apiRequest(`/api/v1/export/grades/${assignmentId}?format=${format}`);
}

/**
 * Export all grades for a course
 * @param {string} courseCode - Course code
 * @param {string} format - Export format (csv, pdf)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function exportCourseGrades(courseCode, format = 'csv') {
  return apiRequest(`/api/v1/export/course/${courseCode}?format=${format}`);
}

// ============================================
// Dashboard Stats API
// ============================================

/**
 * Get instructor dashboard statistics
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getInstructorDashboardStats() {
  try {
    const [assignmentsResult, submissionsResult, gradesResult] = await Promise.all([
      getAssignments(),
      getSubmissions(),
      getGrades(),
    ]);

    const assignments = assignmentsResult.data || [];
    const submissions = submissionsResult.data || [];
    const grades = gradesResult.data || [];

    const pendingGrading = submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length;
    const avgScore = grades.length > 0 
      ? Math.round(grades.reduce((acc, g) => acc + (g.score || 0), 0) / grades.length)
      : 0;

    return {
      success: true,
      data: {
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter(a => a.status === 'active').length,
        totalSubmissions: submissions.length,
        pendingGrading,
        averageScore: avgScore,
        gradedCount: grades.length,
        recentSubmissions: submissions.slice(0, 5),
        recentGrades: grades.slice(0, 5),
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get student dashboard statistics
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getStudentDashboardStats() {
  try {
    const [assignmentsResult, submissionsResult, gradesResult] = await Promise.all([
      getAssignments(),
      getSubmissions(),
      getGrades(),
    ]);

    const assignments = assignmentsResult.data || [];
    const submissions = submissionsResult.data || [];
    const grades = gradesResult.data || [];

    const submittedIds = new Set(submissions.map(s => s.assignment_id));
    const pendingAssignments = assignments.filter(a => !submittedIds.has(a.id)).length;
    const avgScore = grades.length > 0 
      ? Math.round(grades.reduce((acc, g) => acc + (g.score || 0), 0) / grades.length)
      : 0;

    return {
      success: true,
      data: {
        totalAssignments: assignments.length,
        pendingAssignments,
        completedAssignments: submittedIds.size,
        averageScore: avgScore,
        totalGrades: grades.length,
        recentSubmissions: submissions.slice(0, 5),
        recentGrades: grades.slice(0, 5),
        upcomingAssignments: assignments
          .filter(a => a.due_date && new Date(a.due_date) > new Date())
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 5),
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Helper functions
// ============================================

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('authToken');
}

/**
 * Get current user from localStorage
 * @returns {Object|null}
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

/**
 * Store auth data in localStorage
 * @param {string} token - JWT token
 * @param {Object} user - User object
 */
export function storeAuthData(token, user) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

// ============================================
// Generic API Client Helper
// ============================================

/**
 * Generic API client with convenience methods
 */
export const apiClient = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  get: (endpoint) => apiRequest(`/api/v1${endpoint}`),

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  post: (endpoint, body) => apiRequest(`/api/v1${endpoint}`, { method: 'POST', body }),

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  put: (endpoint, body) => apiRequest(`/api/v1${endpoint}`, { method: 'PUT', body }),

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  delete: (endpoint) => apiRequest(`/api/v1${endpoint}`, { method: 'DELETE' }),
};

// ============================================
// Courses API
// ============================================

/**
 * Get student's enrolled courses
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getMyCourses() {
  return apiRequest('/api/v1/courses/my-courses');
}

/**
 * Drop a course (student)
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function dropCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/unenroll`, {
    method: 'DELETE',
  });
}

/**
 * Get course roster (enrolled students)
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getCourseRoster(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/roster`);
}

/**
 * Get assignments for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getCourseAssignments(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/assignments`);
}

/**
 * Regenerate enrollment code for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function regenerateEnrollmentCode(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/regenerate-code`, {
    method: 'POST',
  });
}

/**
 * Manually enroll a student in a course (instructor)
 * @param {string} courseId - Course ID
 * @param {string} studentId - Student ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function enrollStudent(courseId, studentId) {
  return apiRequest(`/api/v1/courses/${courseId}/enroll-student`, {
    method: 'POST',
    body: { student_id: studentId },
  });
}

/**
 * Remove a student from a course (instructor)
 * @param {string} courseId - Course ID
 * @param {string} studentId - Student ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeStudentFromCourse(courseId, studentId) {
  return apiRequest(`/api/v1/courses/${courseId}/students/${studentId}`, {
    method: 'DELETE',
  });
}

