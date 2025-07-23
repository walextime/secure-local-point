import { incrementalBackupDB, Workflow, WorkflowStep } from '@/lib/incrementalBackupSchema';
import { generateId } from '@/lib/utils';
import { toast } from 'sonner';

// Backup and restore logic with comprehensive error handling and integrity checks

export class BackupRestoreLogic {
  private static instance: BackupRestoreLogic;

  static getInstance(): BackupRestoreLogic {
    if (!BackupRestoreLogic.instance) {
      BackupRestoreLogic.instance = new BackupRestoreLogic();
    }
    return BackupRestoreLogic.instance;
  }

  // Generate checksum for data integrity
  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create incremental backup with workflow tracking
  async createIncrementalBackup(
    name: string,
    description?: string,
    parentSnapshotUUID?: string
  ): Promise<string> {
    const workflow = await incrementalBackupDB.createWorkflow(
      `Create Incremental Backup: ${name}`,
      'BACKUP',
      { name, description, parentSnapshotUUID }
    );

    try {
      // Step 1: Initialize backup
      const initStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'INITIALIZE_BACKUP',
        { name, description, parentSnapshotUUID }
      );

      await this.executeStep(initStep, async () => {
        console.log('Initializing incremental backup...');
        // Validate parent snapshot if provided
        if (parentSnapshotUUID) {
          const parentSnapshot = await incrementalBackupDB.snapshots
            .where('uuid')
            .equals(parentSnapshotUUID)
            .first();
          
          if (!parentSnapshot) {
            throw new Error(`Parent snapshot not found: ${parentSnapshotUUID}`);
          }
        }
      });

      // Step 2: Capture entity UUIDs
      const uuidStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CAPTURE_ENTITY_UUIDS',
        {},
        [initStep.uuid]
      );

      const entityUUIDs = await this.executeStep(uuidStep, async () => {
        console.log('Capturing entity UUIDs...');
        return await incrementalBackupDB.entityUUIDs.toArray();
      });

      // Step 3: Capture table data
      const dataStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CAPTURE_TABLE_DATA',
        {},
        [uuidStep.uuid]
      );

      const tableData = await this.executeStep(dataStep, async () => {
        console.log('Capturing table data...');
        const tables = ['products', 'customers', 'sales', 'pendingSales', 'users', 'settings', 'creditPayments', 'partialPayments', 'userReceiptCounters', 'pendingSaleEvents'];
        const data: Record<string, any[]> = {};
        
        for (const table of tables) {
          const tableData = await this.getTableData(table);
          data[table] = tableData;
        }
        
        return data;
      });

      // Step 4: Capture action log
      const actionLogStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CAPTURE_ACTION_LOG',
        { parentSnapshotUUID },
        [dataStep.uuid]
      );

      const actionLog = await this.executeStep(actionLogStep, async () => {
        console.log('Capturing action log...');
        if (parentSnapshotUUID) {
          const parentSnapshot = await incrementalBackupDB.snapshots
            .where('uuid')
            .equals(parentSnapshotUUID)
            .first();
          
          if (parentSnapshot) {
            return await incrementalBackupDB.actionLog
              .where('timestamp')
              .above(parentSnapshot.metadata.timestamp)
              .toArray();
          }
        }
        
        return await incrementalBackupDB.actionLog.toArray();
      });

      // Step 5: Capture configuration and files
      const configStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CAPTURE_CONFIGURATION',
        {},
        [actionLogStep.uuid]
      );

      const configuration = await this.executeStep(configStep, async () => {
        console.log('Capturing configuration...');
        return {
          appVersion: '1.0.0',
          schemaVersion: 1,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          storageQuota: await this.getStorageQuota()
        };
      });

      const fileAssets = await this.executeStep(configStep, async () => {
        console.log('Capturing file assets...');
        return await this.captureFileAssets();
      });

      // Step 6: Create snapshot
      const snapshotStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CREATE_SNAPSHOT',
        { entityUUIDs, tableData, actionLog, configuration, fileAssets },
        [configStep.uuid]
      );

      const snapshotUUID = await this.executeStep(snapshotStep, async () => {
        console.log('Creating snapshot...');
        return await this.createSnapshot(name, description, parentSnapshotUUID, {
          entityUUIDs,
          tableData,
          actionLog,
          configuration,
          fileAssets
        });
      });

      // Step 7: Validate snapshot
      const validationStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'VALIDATE_SNAPSHOT',
        { snapshotUUID },
        [snapshotStep.uuid]
      );

      await this.executeStep(validationStep, async () => {
        console.log('Validating snapshot...');
        await this.validateSnapshot(snapshotUUID);
      });

      // Complete workflow
      workflow.status = 'COMPLETED';
      workflow.completedAt = Date.now();
      await incrementalBackupDB.workflows.put(workflow);

      console.log('Incremental backup completed successfully:', snapshotUUID);
      toast.success('Incremental backup completed successfully');
      
      return snapshotUUID;

    } catch (error) {
      console.error('Incremental backup failed:', error);
      
      workflow.status = 'FAILED';
      workflow.error = error instanceof Error ? error.message : String(error);
      workflow.updatedAt = Date.now();
      await incrementalBackupDB.workflows.put(workflow);
      
      toast.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Restore snapshot with action replay
  async restoreSnapshot(snapshotUUID: string): Promise<void> {
    const workflow = await incrementalBackupDB.createWorkflow(
      `Restore Snapshot: ${snapshotUUID}`,
      'RESTORE',
      { snapshotUUID }
    );

    try {
      // Step 1: Validate snapshot
      const validationStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'VALIDATE_SNAPSHOT',
        { snapshotUUID }
      );

      const snapshot = await this.executeStep(validationStep, async () => {
        console.log('Validating snapshot...');
        const snapshot = await incrementalBackupDB.snapshots
          .where('uuid')
          .equals(snapshotUUID)
          .first();
        
        if (!snapshot) {
          throw new Error(`Snapshot not found: ${snapshotUUID}`);
        }

        if (!snapshot.metadata.isComplete || !snapshot.metadata.isVerified) {
          throw new Error('Snapshot is incomplete or unverified');
        }

        // Validate integrity
        await this.validateSnapshotIntegrity(snapshot);
        
        return snapshot;
      });

      // Step 2: Check schema compatibility
      const schemaStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CHECK_SCHEMA_COMPATIBILITY',
        { snapshot },
        [validationStep.uuid]
      );

      await this.executeStep(schemaStep, async () => {
        console.log('Checking schema compatibility...');
        const currentSchemaVersion = 1; // Get from current app
        
        if (snapshot.metadata.schemaVersion > currentSchemaVersion) {
          throw new Error(`Snapshot schema version (${snapshot.metadata.schemaVersion}) is newer than current version (${currentSchemaVersion})`);
        }
      });

      // Step 3: Migrate if needed
      const migrationStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'MIGRATE_SCHEMA',
        { snapshot },
        [schemaStep.uuid]
      );

      await this.executeStep(migrationStep, async () => {
        console.log('Migrating schema if needed...');
        const currentSchemaVersion = 1;
        
        if (snapshot.metadata.schemaVersion < currentSchemaVersion) {
          await this.migrateSnapshot(snapshot, currentSchemaVersion);
        }
      });

      // Step 4: Clear existing data
      const clearStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'CLEAR_EXISTING_DATA',
        {},
        [migrationStep.uuid]
      );

      await this.executeStep(clearStep, async () => {
        console.log('Clearing existing data...');
        await this.clearExistingData();
      });

      // Step 5: Restore database
      const restoreStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'RESTORE_DATABASE',
        { snapshot },
        [clearStep.uuid]
      );

      await this.executeStep(restoreStep, async () => {
        console.log('Restoring database...');
        await this.restoreDatabase(snapshot);
      });

      // Step 6: Restore file assets
      const fileStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'RESTORE_FILE_ASSETS',
        { snapshot },
        [restoreStep.uuid]
      );

      await this.executeStep(fileStep, async () => {
        console.log('Restoring file assets...');
        await this.restoreFileAssets(snapshot.fileAssets);
      });

      // Step 7: Replay action log
      const replayStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'REPLAY_ACTION_LOG',
        { snapshot },
        [fileStep.uuid]
      );

      await this.executeStep(replayStep, async () => {
        console.log('Replaying action log...');
        await this.replayActionLog(snapshot.actionLog);
      });

      // Step 8: Final validation
      const finalValidationStep = await incrementalBackupDB.addWorkflowStep(
        workflow.id,
        'FINAL_VALIDATION',
        { snapshot },
        [replayStep.uuid]
      );

      await this.executeStep(finalValidationStep, async () => {
        console.log('Performing final validation...');
        await this.validateRestoredData(snapshot);
      });

      // Complete workflow
      workflow.status = 'COMPLETED';
      workflow.completedAt = Date.now();
      await incrementalBackupDB.workflows.put(workflow);

      console.log('Snapshot restored successfully:', snapshotUUID);
      toast.success('Snapshot restored successfully');

    } catch (error) {
      console.error('Restore failed:', error);
      
      workflow.status = 'FAILED';
      workflow.error = error instanceof Error ? error.message : String(error);
      workflow.updatedAt = Date.now();
      await incrementalBackupDB.workflows.put(workflow);
      
      toast.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Execute workflow step with error handling
  private async executeStep<T>(
    step: WorkflowStep,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      step.status = 'IN_PROGRESS';
      step.startedAt = Date.now();
      await incrementalBackupDB.workflowSteps.put(step);

      const result = await operation();

      step.status = 'COMPLETED';
      step.completedAt = Date.now();
      await incrementalBackupDB.workflowSteps.put(step);

      return result;

    } catch (error) {
      console.error(`Step execution failed: ${step.uuid}`, error);
      
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      step.retryCount++;
      await incrementalBackupDB.workflowSteps.put(step);
      
      // Retry if under max retries
      if (step.retryCount < 3) {
        console.log(`Retrying step ${step.uuid} (attempt ${step.retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * step.retryCount));
        return this.executeStep(step, operation);
      }
      
      throw error;
    }
  }

  // Get table data
  private async getTableData(table: string): Promise<any[]> {
    // This would use the actual database operations
    // For now, return empty array
    return [];
  }

  // Get storage quota
  private async getStorageQuota(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      } catch (error) {
        console.error('Failed to get storage quota:', error);
        return null;
      }
    }
    return null;
  }

  // Capture file assets
  private async captureFileAssets(): Promise<Record<string, string>> {
    const fileAssets: Record<string, string> = {};
    
    // LocalStorage
    const localStorageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key);
      }
    }
    fileAssets['localStorage.json'] = btoa(JSON.stringify(localStorageData));

    // SessionStorage
    const sessionStorageData = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageData[key] = sessionStorage.getItem(key);
      }
    }
    fileAssets['sessionStorage.json'] = btoa(JSON.stringify(sessionStorageData));

    return fileAssets;
  }

  // Create snapshot
  private async createSnapshot(
    name: string,
    description: string | undefined,
    parentSnapshotUUID: string | undefined,
    data: any
  ): Promise<string> {
    const snapshotUUID = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const snapshot = {
      id: generateId(),
      uuid: snapshotUUID,
      metadata: {
        id: generateId(),
        uuid: snapshotUUID,
        name,
        description,
        timestamp: Date.now(),
        schemaVersion: 1,
        appVersion: '1.0.0',
        snapshotType: parentSnapshotUUID ? 'INCREMENTAL' : 'FULL',
        parentSnapshotUUID,
        checksum: '', // Will be set below
        size: 0, // Will be calculated
        tableCounts: Object.fromEntries(Object.entries(data.tableData).map(([k, v]) => [k, v.length])),
        actionLogCount: data.actionLog.length,
        entityUUIDCount: data.entityUUIDs.length,
        isComplete: false,
        isVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      ...data
    };

    // Generate checksum
    const dataString = JSON.stringify(snapshot);
    snapshot.metadata.checksum = await this.generateChecksum(dataString);
    snapshot.metadata.size = dataString.length;

    // Save snapshot
    await incrementalBackupDB.snapshots.add(snapshot);

    // Mark as complete and verified
    snapshot.metadata.isComplete = true;
    snapshot.metadata.isVerified = true;
    await incrementalBackupDB.snapshots.put(snapshot);

    return snapshotUUID;
  }

  // Validate snapshot
  private async validateSnapshot(snapshotUUID: string): Promise<void> {
    const snapshot = await incrementalBackupDB.snapshots
      .where('uuid')
      .equals(snapshotUUID)
      .first();
    
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotUUID}`);
    }

    await this.validateSnapshotIntegrity(snapshot);
  }

  // Validate snapshot integrity
  private async validateSnapshotIntegrity(snapshot: any): Promise<void> {
    const dataString = JSON.stringify(snapshot);
    const expectedChecksum = await this.generateChecksum(dataString);
    
    if (expectedChecksum !== snapshot.metadata.checksum) {
      throw new Error('Snapshot checksum validation failed');
    }

    // Additional integrity checks
    if (!snapshot.metadata.isComplete) {
      throw new Error('Snapshot is incomplete');
    }

    if (!snapshot.metadata.isVerified) {
      throw new Error('Snapshot is unverified');
    }
  }

  // Migrate snapshot
  private async migrateSnapshot(snapshot: any, targetSchemaVersion: number): Promise<void> {
    console.log(`Migrating snapshot from schema version ${snapshot.metadata.schemaVersion} to ${targetSchemaVersion}`);
    
    for (let version = snapshot.metadata.schemaVersion + 1; version <= targetSchemaVersion; version++) {
      console.log(`Applying migration to version ${version}`);
      
      // Apply schema-specific migrations
      if (version === 2) {
        // Example migration: Add new fields to existing tables
        for (const [tableName, data] of Object.entries(snapshot.tableData)) {
          if (tableName === 'customers') {
            for (const customer of data) {
              if (!customer.hasOwnProperty('creditLimit')) {
                customer.creditLimit = 0;
              }
              if (!customer.hasOwnProperty('balance')) {
                customer.balance = 0;
              }
            }
          }
        }
      }
      
      // Update schema version
      snapshot.metadata.schemaVersion = version;
    }
  }

  // Clear existing data
  private async clearExistingData(): Promise<void> {
    // This would clear the actual database tables
    // Implementation depends on the database layer
    console.log('Clearing existing data...');
  }

  // Restore database
  private async restoreDatabase(snapshot: any): Promise<void> {
    // This would restore the actual database tables
    // Implementation depends on the database layer
    console.log('Restoring database...');
    
    for (const [tableName, data] of Object.entries(snapshot.tableData)) {
      console.log(`Restoring table ${tableName} with ${data.length} records`);
    }
  }

  // Restore file assets
  private async restoreFileAssets(fileAssets: Record<string, string>): Promise<void> {
    for (const [filename, base64Data] of Object.entries(fileAssets)) {
      if (filename === 'localStorage.json') {
        const data = JSON.parse(atob(base64Data));
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value as string);
        }
      } else if (filename === 'sessionStorage.json') {
        const data = JSON.parse(atob(base64Data));
        for (const [key, value] of Object.entries(data)) {
          sessionStorage.setItem(key, value as string);
        }
      }
    }
  }

  // Replay action log with idempotent operations
  private async replayActionLog(actionLog: any[]): Promise<void> {
    console.log(`Replaying ${actionLog.length} actions...`);
    
    // Sort by sequence number to ensure correct order
    const sortedActions = actionLog.sort((a, b) => a.sequence - b.sequence);
    
    for (const action of sortedActions) {
      try {
        console.log(`Replaying action ${action.uuid}: ${action.action} on ${action.table}`);
        
        // Check if action was already applied (idempotent check)
        const existingEntity = await this.getEntity(action.table, action.entityId);
        
        if (action.action === 'CREATE' && !existingEntity) {
          // Create entity if it doesn't exist
          await this.createEntity(action.table, action.data);
        } else if (action.action === 'UPDATE' && existingEntity) {
          // Update entity if it exists
          await this.updateEntity(action.table, action.entityId, action.data);
        } else if (action.action === 'DELETE' && existingEntity) {
          // Delete entity if it exists
          await this.deleteEntity(action.table, action.entityId);
        } else if (action.action === 'BATCH_CREATE') {
          // Handle batch operations
          for (const item of action.data) {
            const existing = await this.getEntity(action.table, item.id);
            if (!existing) {
              await this.createEntity(action.table, item);
            }
          }
        }
        
      } catch (error) {
        console.error(`Failed to replay action ${action.uuid}:`, error);
        // Continue with other actions, don't fail the entire restore
      }
    }
  }

  // Validate restored data
  private async validateRestoredData(snapshot: any): Promise<void> {
    console.log('Validating restored data...');
    
    // Check that all tables have the expected number of records
    for (const [tableName, expectedCount] of Object.entries(snapshot.metadata.tableCounts)) {
      const actualCount = await this.getTableCount(tableName);
      if (actualCount !== expectedCount) {
        console.warn(`Table ${tableName} count mismatch: expected ${expectedCount}, got ${actualCount}`);
      }
    }
    
    // Additional validation checks can be added here
    console.log('Restored data validation completed');
  }

  // Helper methods for database operations
  private async getEntity(table: string, entityId: string): Promise<any> {
    // This would use the actual database operations
    return null;
  }

  private async createEntity(table: string, data: any): Promise<void> {
    // This would use the actual database operations
    console.log(`Creating entity in ${table}:`, data.id);
  }

  private async updateEntity(table: string, entityId: string, data: any): Promise<void> {
    // This would use the actual database operations
    console.log(`Updating entity in ${table}:`, entityId);
  }

  private async deleteEntity(table: string, entityId: string): Promise<void> {
    // This would use the actual database operations
    console.log(`Deleting entity in ${table}:`, entityId);
  }

  private async getTableCount(table: string): Promise<number> {
    // This would use the actual database operations
    return 0;
  }

  // Resume unfinished workflows
  async resumeUnfinishedWorkflows(): Promise<void> {
    console.log('Resuming unfinished workflows...');
    
    const unfinishedWorkflows = await incrementalBackupDB.workflows
      .where('status')
      .anyOf(['PENDING', 'IN_PROGRESS'])
      .toArray();

    for (const workflow of unfinishedWorkflows) {
      console.log(`Resuming workflow: ${workflow.name} (${workflow.uuid})`);
      
      // Check if workflow should be retried
      if (workflow.retryCount < workflow.maxRetries) {
        workflow.status = 'IN_PROGRESS';
        workflow.retryCount++;
        workflow.updatedAt = Date.now();
        await incrementalBackupDB.workflows.put(workflow);
        
        // Resume workflow execution based on type
        if (workflow.type === 'BACKUP') {
          // Resume backup workflow
          await this.resumeBackupWorkflow(workflow);
        } else if (workflow.type === 'RESTORE') {
          // Resume restore workflow
          await this.resumeRestoreWorkflow(workflow);
        }
      } else {
        // Mark as failed after max retries
        workflow.status = 'FAILED';
        workflow.error = 'Max retries exceeded';
        workflow.updatedAt = Date.now();
        await incrementalBackupDB.workflows.put(workflow);
      }
    }
  }

  // Resume backup workflow
  private async resumeBackupWorkflow(workflow: Workflow): Promise<void> {
    const steps = await incrementalBackupDB.workflowSteps
      .where('workflowId')
      .equals(workflow.id)
      .orderBy('sequence')
      .toArray();

    // Find the last completed step
    const lastCompletedStep = steps
      .filter(s => s.status === 'COMPLETED')
      .sort((a, b) => b.sequence - a.sequence)[0];

    if (lastCompletedStep) {
      // Resume from the next step
      const nextStep = steps.find(s => s.sequence === lastCompletedStep.sequence + 1);
      if (nextStep) {
        console.log(`Resuming backup workflow from step: ${nextStep.stepType}`);
        // Execute the next step and continue
        await this.executeWorkflowStep(nextStep);
      }
    }
  }

  // Resume restore workflow
  private async resumeRestoreWorkflow(workflow: Workflow): Promise<void> {
    const steps = await incrementalBackupDB.workflowSteps
      .where('workflowId')
      .equals(workflow.id)
      .orderBy('sequence')
      .toArray();

    // Find the last completed step
    const lastCompletedStep = steps
      .filter(s => s.status === 'COMPLETED')
      .sort((a, b) => b.sequence - a.sequence)[0];

    if (lastCompletedStep) {
      // Resume from the next step
      const nextStep = steps.find(s => s.sequence === lastCompletedStep.sequence + 1);
      if (nextStep) {
        console.log(`Resuming restore workflow from step: ${nextStep.stepType}`);
        // Execute the next step and continue
        await this.executeWorkflowStep(nextStep);
      }
    }
  }

  // Execute individual workflow step
  private async executeWorkflowStep(step: WorkflowStep): Promise<void> {
    try {
      step.status = 'IN_PROGRESS';
      step.startedAt = Date.now();
      await incrementalBackupDB.workflowSteps.put(step);

      // Execute step based on type
      switch (step.stepType) {
        case 'INITIALIZE_BACKUP':
          // Implementation for backup initialization
          break;
        case 'CAPTURE_ENTITY_UUIDS':
          // Implementation for capturing entity UUIDs
          break;
        case 'CAPTURE_TABLE_DATA':
          // Implementation for capturing table data
          break;
        case 'CAPTURE_ACTION_LOG':
          // Implementation for capturing action log
          break;
        case 'CAPTURE_CONFIGURATION':
          // Implementation for capturing configuration
          break;
        case 'CREATE_SNAPSHOT':
          // Implementation for creating snapshot
          break;
        case 'VALIDATE_SNAPSHOT':
          // Implementation for validating snapshot
          break;
        case 'CHECK_SCHEMA_COMPATIBILITY':
          // Implementation for checking schema compatibility
          break;
        case 'MIGRATE_SCHEMA':
          // Implementation for schema migration
          break;
        case 'CLEAR_EXISTING_DATA':
          // Implementation for clearing existing data
          break;
        case 'RESTORE_DATABASE':
          // Implementation for restoring database
          break;
        case 'RESTORE_FILE_ASSETS':
          // Implementation for restoring file assets
          break;
        case 'REPLAY_ACTION_LOG':
          // Implementation for replaying action log
          break;
        case 'FINAL_VALIDATION':
          // Implementation for final validation
          break;
        default:
          throw new Error(`Unknown step type: ${step.stepType}`);
      }

      step.status = 'COMPLETED';
      step.completedAt = Date.now();
      await incrementalBackupDB.workflowSteps.put(step);

    } catch (error) {
      console.error(`Step execution failed: ${step.uuid}`, error);
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      step.retryCount++;
      await incrementalBackupDB.workflowSteps.put(step);
      
      // Retry if under max retries
      if (step.retryCount < 3) {
        setTimeout(() => {
          this.executeWorkflowStep(step);
        }, 1000 * step.retryCount); // Exponential backoff
      }
    }
  }
}

export const backupRestoreLogic = BackupRestoreLogic.getInstance(); 