/**
 * Formats a case number for display
 * @param caseNumber - The base32 case number (e.g., "AAAAAA", "AAAAB", "AAAAC")
 * @returns The formatted case number
 */
export function formatCaseNumber(caseNumber: string): string {
  if (!caseNumber) return caseNumber;
  
  // The caseNumber is already in the correct format (6-character base32)
  return caseNumber;
}

/**
 * Gets a display-friendly case identifier
 * @param caseNumber - The base32 case number
 * @param caseId - The full CUID (fallback)
 * @returns A user-friendly case identifier
 */
export function getCaseDisplayId(caseNumber?: string, caseId?: string): string {
  if (caseNumber) {
    return caseNumber; // Use the clean base32 case number
  }
  
  if (caseId) {
    // Fallback to shortened CUID if no case number
    return caseId.substring(Math.max(0, caseId.length - 5)).toUpperCase();
  }
  
  return "Unknown";
}
