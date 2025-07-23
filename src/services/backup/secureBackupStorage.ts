
import { toast } from 'sonner';

export class SecureBackupStorage {
    static async saveBackupFiles(
    files: { name: string; data: Buffer | Uint8Array }[]
  ): Promise<{ success: boolean; savedFiles: string[]; errors: string[] }> {
    const result = {
      success: true,
      savedFiles: [] as string[],
      errors: [] as string[]
    };

    try {
      
      for (const file of files) {
        try {
          const blob = new Blob([file.data], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          result.savedFiles.push(`Downloaded: ${file.name}`);
        } catch (error) {
          result.errors.push(`Failed to download ${file.name}`);
          result.success = false;
        }
      }
    } catch (error) {
      result.errors.push(`Backup storage error: ${(error as Error).message}`);
      result.success = false;
    }

    return result;
  }

    static showBackupResult(
    savedFiles: string[], 
    errors: string[]
  ): void {
    if (savedFiles.length > 0) {
      const filesText = savedFiles.join('\n');
      
      toast.success(
        `Backup completed successfully!\n\nFiles downloaded:\n${filesText}`,
        { duration: 8000 }
      );
    }

    if (errors.length > 0) {
      toast.error(
        `Backup completed with errors:\n${errors.join('\n')}`,
        { duration: 8000 }
      );
    }
  }
}
