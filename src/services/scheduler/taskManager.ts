import { ScheduleStatus } from './types';

export class TaskManager {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

    clearScheduledTask(taskName: string): void {
    const existingTask = this.scheduledTasks.get(taskName);
    if (existingTask) {
      clearTimeout(existingTask);
      this.scheduledTasks.delete(taskName);
    }
  }

    clearAllTasks(): void {
    this.scheduledTasks.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledTasks.clear();
  }

    getScheduleStatus(): ScheduleStatus {
    return {
      autoBackup: this.scheduledTasks.has('auto-backup'),
      dailyReport: this.scheduledTasks.has('daily-report')
    };
  }

    getScheduledTasks(): Map<string, NodeJS.Timeout> {
    return this.scheduledTasks;
  }
}
