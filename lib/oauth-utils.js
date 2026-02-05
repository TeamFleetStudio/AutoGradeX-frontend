/**
 * OAuth utilities for frontend
 * Handles OAuth flow initiation and callback processing
 */

import logger from './logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Generate Google OAuth login URL
 * @returns {string} Google login URL
 */
export function getGoogleAuthURL() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google-callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Generate GitHub OAuth login URL
 * @returns {string} GitHub login URL
 */
export function getGitHubAuthURL() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/github-callback`,
    scope: 'user:email',
    allow_signup: 'true',
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Handle Google OAuth callback
 * @param {string} code - Authorization code from Google
 * @param {string} [role] - User role for new accounts
 * @returns {Promise<{success: boolean, token?: string, user?: Object, error?: string}>}
 */
export async function handleGoogleCallback(code, role) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Google authentication failed',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Handle GitHub OAuth callback
 * @param {string} code - Authorization code from GitHub
 * @param {string} [role] - User role for new accounts
 * @returns {Promise<{success: boolean, token?: string, user?: Object, error?: string}>}
 */
export async function handleGitHubCallback(code, role) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/github/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'GitHub authentication failed',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Start Google OAuth flow
 * @param {string} [role] - User role ('instructor' or 'student')
 */
export function signInWithGoogle(role = 'student') {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    logger.error('Google Client ID not configured');
    return;
  }
  // Store selected role for use after OAuth callback
  localStorage.setItem('oauth_pending_role', role);
  window.location.href = getGoogleAuthURL();
}

/**
 * Start GitHub OAuth flow
 * @param {string} [role] - User role ('instructor' or 'student')
 */
export function signInWithGitHub(role = 'student') {
  if (!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID) {
    logger.error('GitHub Client ID not configured');
    return;
  }
  // Store selected role for use after OAuth callback
  localStorage.setItem('oauth_pending_role', role);
  window.location.href = getGitHubAuthURL();
}
