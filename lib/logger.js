/**
 * Frontend Logger Utility
 * Provides consistent logging across the application
 * In production, logs are suppressed except for errors
 * @module lib/logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels with corresponding console methods and colors
 */
const LOG_LEVELS = {
  debug: { method: 'log', prefix: '🔍 [DEBUG]', enabled: isDevelopment },
  info: { method: 'info', prefix: 'ℹ️ [INFO]', enabled: isDevelopment },
  warn: { method: 'warn', prefix: '⚠️ [WARN]', enabled: true },
  error: { method: 'error', prefix: '❌ [ERROR]', enabled: true },
};

/**
 * Format log message with timestamp and context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {string[]} Formatted log arguments
 */
function formatLog(level, message, context) {
  const timestamp = new Date().toISOString();
  const prefix = LOG_LEVELS[level].prefix;
  
  if (context && Object.keys(context).length > 0) {
    return [`${prefix} ${timestamp} - ${message}`, context];
  }
  return [`${prefix} ${timestamp} - ${message}`];
}

/**
 * Logger object with methods for each log level
 */
const logger = {
  /**
   * Debug level logging - only in development
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    if (LOG_LEVELS.debug.enabled) {
      console[LOG_LEVELS.debug.method](...formatLog('debug', message, context));
    }
  },

  /**
   * Info level logging - only in development
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    if (LOG_LEVELS.info.enabled) {
      console[LOG_LEVELS.info.method](...formatLog('info', message, context));
    }
  },

  /**
   * Warning level logging - always enabled
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    if (LOG_LEVELS.warn.enabled) {
      console[LOG_LEVELS.warn.method](...formatLog('warn', message, context));
    }
  },

  /**
   * Error level logging - always enabled
   * Sanitizes error objects to avoid logging sensitive data
   * @param {string} message - Log message
   * @param {Object|Error} [context] - Additional context or error object
   */
  error(message, context = {}) {
    if (LOG_LEVELS.error.enabled) {
      // If context is an Error, extract safe properties
      let safeContext = context;
      if (context instanceof Error) {
        safeContext = {
          name: context.name,
          message: context.message,
          // Only include stack in development
          ...(isDevelopment && { stack: context.stack }),
        };
      }
      
      // Remove any sensitive fields
      if (typeof safeContext === 'object' && safeContext !== null) {
        const { password, token, apiKey, secret, ...safe } = safeContext;
        safeContext = safe;
      }
      
      console[LOG_LEVELS.error.method](...formatLog('error', message, safeContext));
    }
  },

  /**
   * Log API request result for debugging
   * @param {string} endpoint - API endpoint called
   * @param {Object} result - API result
   */
  apiResult(endpoint, result) {
    if (!result.success) {
      this.error(`API call failed: ${endpoint}`, {
        error: result.error,
        code: result.code,
      });
    } else if (isDevelopment) {
      this.debug(`API call succeeded: ${endpoint}`);
    }
  },
};

export default logger;
