/**
 * Error handling utilities for production-ready error management
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public isOperational = true
  ) {
    super(message)
    this.name = 'AppError'
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode)
    this.name = 'NetworkError'
  }
}

export class ContractError extends AppError {
  constructor(message = 'Contract interaction failed', code?: string) {
    super(message, code || 'CONTRACT_ERROR')
    this.name = 'ContractError'
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', field?: string) {
    super(message, field ? `VALIDATION_ERROR_${field.toUpperCase()}` : 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * Wraps async functions with error handling and timeout
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: number
    retries?: number
    retryDelay?: number
    errorMessage?: string
  } = {}
): Promise<T> {
  const { timeout = 30000, retries = 0, retryDelay = 1000, errorMessage } = options
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new NetworkError('Request timeout')), timeout)
      })
      
      const result = await Promise.race([fn(), timeoutPromise])
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on the last attempt
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
    }
  }
  
  // If we have a custom error message, wrap the original error
  if (errorMessage) {
    throw new AppError(errorMessage, lastError!.name, undefined, true)
  }
  
  throw lastError!
}

/**
 * Safely executes a function and returns a result with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await fn()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }
}

/**
 * Formats error messages for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    // Handle common Web3/Wagmi errors
    if (error.message.includes('User rejected')) {
      return 'Transaction was cancelled by user'
    }
    
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction'
    }
    
    if (error.message.includes('network')) {
      return 'Network connection error. Please check your connection and try again.'
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred'
}

/**
 * Logs errors appropriately based on environment
 */
export function logError(error: Error, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context || 'Error'}]:`, error)
  }
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // errorReportingService.captureException(error, { context })
  }
}

/**
 * Creates a retry function with exponential backoff
 */
export function createRetryFunction<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
) {
  return async (): Promise<T> => {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
}