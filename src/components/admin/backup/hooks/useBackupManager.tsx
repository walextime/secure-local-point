import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { backupService, BackupConfig, BackupResult } from '@/services/backupService';
import { DailyReportService } from '@/services/dailyReportService';
import { MasterPasswordService } from '@/services/security/masterPasswordService';
import { dbOperations, STORES } from '@/lib/db';
import { BackupSettings, BackupHistoryRecord, BackupHistoryEntry } from '@/types/backup';
import { getCurrentUser } from '@/lib/auth';
import { restartBackupScheduler } from '@/services/backup/backupScheduler';
import { createFullBackup, isBackupRunning } from '@/services/backup/backupManager';

export const useBackupManager = () => {
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    includeCustomers: true,
    includeInventory: true,
    includeSales: true,
    formats: ['json', 'pdf'],
    storageLocation: 'both',
    encryptFiles: true,
    password: ''
  });
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('20:00');
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [lastBackupStatus, setLastBackupStatus] = useState<'success' | 'error' | 'none'>('none');

  useEffect(() => {
    loadBackupSettings();
    loadBackupHistory();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const settings = await dbOperations.get(STORES.SETTINGS, 'backup-settings') as BackupSettings | undefined;
      if (settings) {
        setAutoBackupEnabled(settings.autoBackupEnabled || false);
        setAutoBackupTime(settings.autoBackupTime || '20:00');
        if (settings.defaultConfig) {
          setBackupConfig({ ...backupConfig, ...settings.defaultConfig });
        }
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
    }
  };

  const saveBackupSettings = async () => {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'root' && user.role !== 'admin')) {
      toast.error('Only admin and root users can save backup settings');
      return;
    }
    try {
      const settings: BackupSettings = {
        id: 'backup-settings',
        autoBackupEnabled,
        autoBackupTime,
        defaultConfig: backupConfig
      };
      await dbOperations.put(STORES.SETTINGS, settings);
      
      // Restart the backup scheduler with new settings
      restartBackupScheduler();
      
      toast.success('Backup settings saved successfully and scheduler restarted');
    } catch (error) {
      console.error('Error saving backup settings:', error);
      toast.error('Failed to save backup settings');
    }
  };

  const loadBackupHistory = async () => {
    try {
      const history = await dbOperations.get(STORES.SETTINGS, 'backup-history') as BackupHistoryRecord | undefined;
      if (history && history.entries) {
        setBackupHistory(history.entries.slice(-10));
        if (history.entries.length > 0) {
          const latest = history.entries[history.entries.length - 1];
          setLastBackupStatus(latest.success ? 'success' : 'error');
        }
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
    }
  };

  const saveBackupHistory = async (result: BackupResult, error?: unknown) => {
    try {
      const newEntry: BackupHistoryEntry = {
        id: `backup-${Date.now()}`,
        timestamp: result.timestamp || Date.now(),
        filesCreated: result.filesCreated || [],
        errors: result.errors || (error ? [(error instanceof Error ? error.message : String(error))] : []),
        success: result.success ?? false,
        config: { ...backupConfig }
      };

      const updatedHistory = [...backupHistory, newEntry].slice(-50); // keep more history
      setBackupHistory(updatedHistory);

      const historyRecord: BackupHistoryRecord = {
        id: 'backup-history',
        entries: updatedHistory
      };
      await dbOperations.put(STORES.SETTINGS, historyRecord);

      setLastBackupStatus(result.success ? 'success' : 'error');
    } catch (err) {
      console.error('Error saving backup history:', err);
    }
  };

  const handleManualBackup = async () => {
    // Check if backup is already running
    if (isBackupRunning()) {
      toast.error('Backup already in progress, please wait...');
      return;
    }

    setIsBackingUp(true);
    try {
      console.log('Starting manual backup...');
      await createFullBackup();
      
      toast.success('Manual backup completed successfully!');
      await loadBackupHistory(); // Refresh history
    } catch (error) {
      console.error('Manual backup failed:', error);
      toast.error('Manual backup failed: ' + (error.message || String(error)));
    } finally {
      setIsBackingUp(false);
    }
  };

  const generateDailyReport = async () => {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'root' && user.role !== 'admin')) return;
    if (!backupConfig.password) {
      toast.error('Please enter master password for report generation');
      return;
    }
    setIsGeneratingReport(true);
    try {
      const isValidPassword = await MasterPasswordService.verifyPassword(backupConfig.password);
      if (!isValidPassword) {
        toast.error('Invalid master password');
        setIsGeneratingReport(false);
        return;
      }
      const success = await DailyReportService.generateAndSaveDailyReport(backupConfig.password);
      if (success) {
        toast.success('Daily report generated and saved successfully');
      } else {
        toast.error('Failed to generate daily report');
      }
    } catch (error) {
      console.error('Daily report error:', error);
      toast.error('Failed to generate daily report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const updateBackupConfig = async (field: keyof BackupConfig, value: unknown) => {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'root' && user.role !== 'admin')) return;
    setBackupConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleFormat = async (format: 'xlsx' | 'json' | 'pdf') => {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'root' && user.role !== 'admin')) return;
    setBackupConfig(prev => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter(f => f !== format)
        : [...prev.formats, format]
    }));
  };

  return {
    backupConfig,
    isBackingUp,
    isGeneratingReport,
    autoBackupEnabled,
    autoBackupTime,
    backupHistory,
    lastBackupStatus,
    setAutoBackupEnabled,
    setAutoBackupTime,
    updateBackupConfig,
    toggleFormat,
    handleManualBackup,
    generateDailyReport,
    saveBackupSettings
  };
};
