export type BugSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface BugReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
  pageUrl?: string;
  device?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  isFixed: boolean;
  fixedAt?: string;
  reportedAt: string;
  reporterDisplayName: string;
}

export interface SubmitBugReportRequest {
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
  pageUrl?: string;
  device?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
}
