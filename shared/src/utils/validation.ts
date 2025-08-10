import { ErrorInfo } from '../types/common';

export function validateFile(file: File): ErrorInfo | null {
  if (!file) {
    return {
      code: 'NO_FILE',
      message: 'No file selected'
    };
  }

  if (file.size === 0) {
    return {
      code: 'EMPTY_FILE',
      message: 'File is empty'
    };
  }

  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    return {
      code: 'FILE_TOO_LARGE',
      message: 'File is too large (max 100MB)'
    };
  }

  if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
    return {
      code: 'INVALID_FILE_TYPE',
      message: 'Only .txt files are supported'
    };
  }

  return null;
}

export function validateAnalysisRequest(content: string): ErrorInfo | null {
  if (!content || content.trim().length === 0) {
    return {
      code: 'EMPTY_CONTENT',
      message: 'Content is empty'
    };
  }

  if (content.length > 50 * 1024 * 1024) { // 50MB limit
    return {
      code: 'CONTENT_TOO_LARGE',
      message: 'Content is too large (max 50MB)'
    };
  }

  return null;
}

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}
