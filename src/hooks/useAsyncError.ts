import { useCallback } from 'react'
import { formatErrorMessage, logError } from '@/utils/errorHandling'
import { useToast } from '@/components/Toast'

/**
 * Hook for handling async errors in components
 * Provides consistent error handling and user feedback
 */
export function useAsyncError() {
  const { addToast } = useToast()

  const handleError = useCallback(
    (error: unknown, context?: string, showToast = true) => {
      const errorMessage = formatErrorMessage(error)
      
      // Log the error
      if (error instanceof Error) {
        logError(error, context)
      }
      
      // Show user-friendly toast notification
      if (showToast) {
        addToast({
          type: 'error',
          title: 'Error',
          message: errorMessage
        })
      }
      
      return errorMessage
    },
    [addToast]
  )

  const executeAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: {
        context?: string
        showToast?: boolean
        onError?: (error: string) => void
        onSuccess?: (result: T) => void
      } = {}
    ): Promise<T | null> => {
      const { context, showToast = true, onError, onSuccess } = options
      
      try {
        const result = await asyncFn()
        onSuccess?.(result)
        return result
      } catch (error) {
        const errorMessage = handleError(error, context, showToast)
        onError?.(errorMessage)
        return null
      }
    },
    [handleError]
  )

  return {
    handleError,
    executeAsync
  }
}

/**
 * Hook for wrapping component state with error handling
 */
export function useErrorState<T>(initialValue: T) {
  const { handleError } = useAsyncError()
  
  const safeSetState = useCallback(
    (setter: (prev: T) => T, context?: string) => {
      try {
        return setter
      } catch (error) {
        handleError(error, context)
        return (prev: T) => prev // Return identity function on error
      }
    },
    [handleError]
  )

  return { safeSetState }
}