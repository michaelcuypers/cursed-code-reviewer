// Types for SpectralAnalyzer Lambda and code scanning

export interface SpectralScanRequest {
  type: 'file' | 'pr' | 'text';
  content: string; // Code content or PR URL
  language?: string;
  severityLevel?: 'minor' | 'moderate' | 'critical';
  autoFixEnabled?: boolean;
}

export interface SpectralScanResult {
  scanId: string;
  timestamp: string;
  issues: CursedIssue[];
  overallCurseLevel: number;
  scanDuration: number;
  language: string;
  status: 'completed' | 'failed' | 'processing';
}

export interface CursedIssue {
  id: string;
  severity: 'minor' | 'moderate' | 'critical';
  lineNumber: number;
  columnNumber: number;
  demonicMessage: string;
  technicalExplanation: string;
  ruleId: string;
  hauntedPatch?: HauntedPatch;
}

export interface HauntedPatch {
  id: string;
  issueId: string;
  originalCode: string;
  cursedCode: string;
  explanation: string;
  confidence: number;
}

export interface CodeIssue {
  severity: 'minor' | 'moderate' | 'critical';
  lineNumber: number;
  columnNumber: number;
  message: string;
  ruleId: string;
  context: string;
}

export interface PRDiff {
  files: PRFile[];
  repository: string;
  prNumber: number;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  patch: string;
  content?: string;
}

// DynamoDB record types
export interface SpectralScanRecord {
  PK: string; // "SCAN#${scanId}"
  SK: string; // "METADATA"
  entityType: 'SpectralScan';
  scanId: string;
  soulId: string;
  submissionType: 'file' | 'pr' | 'text';
  s3CodeKey?: string;
  language: string;
  severityLevel: string;
  scanTimestamp: string;
  scanDuration: number;
  overallCurseLevel: number;
  status: 'completed' | 'failed' | 'processing';
  ttl?: number;
}

export interface CursedIssueRecord {
  PK: string; // "SCAN#${scanId}"
  SK: string; // "ISSUE#${issueId}"
  entityType: 'CursedIssue';
  issueId: string;
  scanId: string;
  severity: string;
  lineNumber: number;
  columnNumber: number;
  demonicMessage: string;
  technicalExplanation: string;
  ruleId: string;
}

export interface HauntedPatchRecord {
  PK: string; // "SCAN#${scanId}"
  SK: string; // "PATCH#${patchId}"
  entityType: 'HauntedPatch';
  patchId: string;
  issueId: string;
  originalCode: string;
  cursedCode: string;
  explanation: string;
  confidence: number;
  accepted: boolean;
  appliedAt?: string;
}
