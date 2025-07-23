
export interface ScheduleTask {
  id: string;
  name: string;
  timeoutId: NodeJS.Timeout;
  nextRun: Date;
}

export interface ScheduleStatus {
  autoBackup: boolean;
  dailyReport: boolean;
}

export interface ScheduleConfig {
  autoBackupTime?: string;
  dailyReportTime?: string;
  enabledTasks: string[];
}
