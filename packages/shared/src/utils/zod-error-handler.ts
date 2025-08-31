/**
 * Utility for extracting user-friendly error messages from various error types
 * including Zod validation errors, tRPC errors, and generic errors
 */

export interface ErrorDetails {
  message: string;
  field?: string;
  code?: string;
}

/**
 * Extract the first meaningful error message from various error types
 */
export function extractErrorMessage(error: unknown): ErrorDetails {
  // Handle Error instances
  if (error instanceof Error) {
    // Try to parse JSON error messages first (common with tRPC)
    try {
      const parsed = JSON.parse(error.message);
      
      // Handle array of errors
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
        return {
          message: parsed[0].message,
          field: parsed[0].path?.[0],
          code: parsed[0].code
        };
      }
    } catch {
      // If JSON parsing fails, use the raw error message
      return { message: error.message };
    }
    
    return { message: error.message };
  }

  // Handle objects with shape (tRPC/Zod errors)
  if (typeof error === "object" && error !== null) {
    // Handle tRPC errors with Zod validation
    if ("shape" in error) {
      const zodErrors = (error as any).shape?.zodError?.fieldErrors;
      if (zodErrors) {
        const firstField = Object.keys(zodErrors)[0];
        if (firstField && Array.isArray(zodErrors[firstField]) && zodErrors[firstField][0]) {
          return {
            message: zodErrors[firstField][0],
            field: firstField,
            code: "validation_error"
          };
        }
      }
      
      // Handle tRPC error message
      if ((error as any).shape?.message) {
        return {
          message: (error as any).shape.message,
          code: (error as any).shape?.code
        };
      }
    }
    
    // Handle direct message property
    if ("message" in error && typeof (error as any).message === "string") {
      return {
        message: (error as any).message,
        code: (error as any).code
      };
    }

    // Handle data property (some API responses)
    if ("data" in error && typeof (error as any).data === "object") {
      const data = (error as any).data;
      if (data.message) {
        return {
          message: data.message,
          field: data.field,
          code: data.code
        };
      }
    }
  }

  // Fallback for unknown error types
  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "An unexpected error occurred" };
}

/**
 * Extract all error messages from an error (useful for form validation)
 */
export function extractAllErrorMessages(error: unknown): ErrorDetails[] {
  const errors: ErrorDetails[] = [];

  if (typeof error === "object" && error !== null && "shape" in error) {
    const zodErrors = (error as any).shape?.zodError?.fieldErrors;
    if (zodErrors) {
      Object.entries(zodErrors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message: string) => {
            errors.push({
              message,
              field,
              code: "validation_error"
            });
          });
        }
      });
      return errors;
    }
  }

  // If we can't extract multiple errors, return single error
  const singleError = extractErrorMessage(error);
  return [singleError];
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(errorDetails: ErrorDetails): string {
  if (errorDetails.field) {
    return `${errorDetails.field}: ${errorDetails.message}`;
  }
  return errorDetails.message;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const details = extractErrorMessage(error);
  return details.code === "validation_error" || details.field !== undefined;
}

/**
 * Simple function that just returns the error message string (for backward compatibility)
 */
export function getErrorMessage(error: unknown): string {
  return extractErrorMessage(error).message;
}