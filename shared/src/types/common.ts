export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface AnalysisProgress {
  percentage: number;
  stage: 'reading' | 'analyzing' | 'complete';
  message: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
}
