import { BackupScheduler } from './scheduler/backupScheduler';
import { ReportScheduler } from './scheduler/reportScheduler';
import { TaskManager } from './scheduler/taskManager';
import { ScheduleStatus } from './scheduler/types';

export class SchedulerService {
  private static instance: SchedulerService;
  private taskManager: TaskManager;
  private isInitialized = false;

  private constructor() {
    this.taskManager = new TaskManager();
  }

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

    async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.setupAutoBackupSchedule();
      await this.setupDailyReportSchedule();
      this.isInitialized = true;
    } catch (error) {
      
    }
  }

    async setupAutoBackupSchedule(): Promise<void> {
    return BackupScheduler.setupAutoBackupSchedule(
      this.taskManager.getScheduledTasks(),
      this.taskManager.clearScheduledTask.bind(this.taskManager)
    );
  }

    async setupDailyReportSchedule(): Promise<void> {
    return ReportScheduler.setupDailyReportSchedule(
      this.taskManager.getScheduledTasks(),
      this.taskManager.clearScheduledTask.bind(this.taskManager)
    );
  }

    clearAllTasks(): void {
    this.taskManager.clearAllTasks();
  }

    getScheduleStatus(): ScheduleStatus {
    return this.taskManager.getScheduleStatus();
  }
}

export const schedulerService = SchedulerService.getInstance();
