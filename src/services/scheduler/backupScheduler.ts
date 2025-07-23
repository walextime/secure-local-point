import { MasterPasswordService } from '../security/masterPasswordService';
import { toast } from 'sonner';

export class BackupScheduler {
    static setupAutoBackupSchedule(
    scheduledTasks: Map<string, NodeJS.Timeout>,
    clearScheduledTask: (taskName: string) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      (async () => {
        try {
          
          clearScheduledTask('auto-backup');

          
          const isMasterPasswordSet = await MasterPasswordService.isSet();
          if (!isMasterPasswordSet) {
            resolve();
            return;
          }

          
          
          const now = new Date();
          const nextBackup = new Date();
          nextBackup.setHours(20, 0, 0, 0); 

          
          if (nextBackup <= now) {
            nextBackup.setDate(nextBackup.getDate() + 1);
          }

          const timeUntilBackup = nextBackup.getTime() - now.getTime();

          
          const timeoutId = setTimeout(async () => {
            await BackupScheduler.notifyScheduledBackup();
            
            BackupScheduler.setupAutoBackupSchedule(scheduledTasks, clearScheduledTask);
          }, timeUntilBackup);

          scheduledTasks.set('auto-backup', timeoutId);

          resolve();
        } catch (error) {
          resolve();
        }
      })();
    });
  }

    static async notifyScheduledBackup(): Promise<void> {
    try {
      
      
      toast.info(
        'Scheduled backup time - Please go to Backup Manager to create secure backup',
        { duration: 15000 }
      );
    } catch (error) {
      
    }
  }
}
