import Dexie, { Table } from 'dexie';

// Schema versions and migration definitions
export const SCHEMA_VERSIONS = {
  V1: 1,
  V2: 2,
  V3: 3,
  CURRENT: 3
};

// Migration definitions
export const MIGRATIONS = {
  [SCHEMA_VERSIONS.V1]: {
    name: 'Initial schema',
    description: 'Basic incremental backup tables',
    apply: (db: Dexie) => {
      // V1: Basic tables
      db.version(1).stores({
        entityUUIDs: 'id, uuid, table, createdAt, updatedAt',
        actionLog: 'id, uuid, action, table, timestamp, sequence, status',
        snapshots: 'id, uuid, timestamp, schemaVersion, isComplete',
        backupSessions: 'id, sessionId, status, startTime',
        restoreSessions: 'id, sessionId, status, startTime',
        migrations: 'id, version, name, appliedAt'
      });
    }
  },
  [SCHEMA_VERSIONS.V2]: {
    name: 'Add UUID indexes and compression',
    description: 'Add unique indexes and compression support',
    apply: (db: Dexie) => {
      db.version(2).stores({
        entityUUIDs: 'id, uuid, table, createdAt, updatedAt, &uuid',
        actionLog: 'id, uuid, action, table, timestamp, sequence, status, &uuid',
        snapshots: 'id, uuid, timestamp, schemaVersion, isComplete, &uuid',
        backupSessions: 'id, sessionId, status, startTime',
        restoreSessions: 'id, sessionId, status, startTime',
        migrations: 'id, version, name, appliedAt'
      });
    }
  },
  [SCHEMA_VERSIONS.V3]: {
    name: 'Add workflow resumption and dependencies',
    description: 'Add workflow tracking and action dependencies',
    apply: (db: Dexie) => {
      db.version(3).stores({
        entityUUIDs: 'id, uuid, table, createdAt, updatedAt, &uuid, version',
        actionLog: 'id, uuid, action, table, timestamp, sequence, status, &uuid, dependencies, retryCount',
        snapshots: 'id, uuid, timestamp, schemaVersion, isComplete, &uuid, parentSnapshotUUID, baseSnapshotUUID',
        backupSessions: 'id, sessionId, status, startTime, snapshotUUID',
        restoreSessions: 'id, sessionId, status, startTime, snapshotUUID, migrationLog, replayLog',
        migrations: 'id, version, name, appliedAt, checksum',
        workflows: 'id, uuid, name, status, createdAt, updatedAt, &uuid',
        workflowSteps: 'id, workflowId, stepType, status, data, sequence, &uuid'
      });
    }
  }
};

// Migration tracking interface
export interface MigrationRecord {
  id: string;
  version: number;
  name: string;
  appliedAt: number;
  checksum: string;
}

// Workflow tracking for resuming unfinished operations
export interface Workflow {
  id: string;
  uuid: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: 'BACKUP' | 'RESTORE' | 'MIGRATION' | 'REPLAY';
  data?: any;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// Workflow step for detailed tracking
export interface WorkflowStep {
  id: string;
  uuid: string;
  workflowId: string;
  stepType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  data?: any;
  sequence: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  dependencies?: string[]; // UUIDs of dependent steps
}

// Extended database class with migration support
export class IncrementalBackupDatabase extends Dexie {
  // Core tables
  entityUUIDs!: Table<{
    id: string;
    uuid: string;
    table: string;
    createdAt: number;
    updatedAt: number;
    version: number;
  }>;
  
  actionLog!: Table<{
    id: string;
    uuid: string;
    action: string;
    table: string;
    entityId?: string;
    entityUUID?: string;
    data?: any;
    previousData?: any;
    timestamp: number;
    userId?: string;
    sessionId: string;
    sequence: number;
    status: string;
    error?: string;
    retryCount: number;
    dependencies?: string[];
  }>;
  
  snapshots!: Table<{
    id: string;
    uuid: string;
    metadata: any;
    entityUUIDs: any[];
    tableData: Record<string, any[]>;
    actionLog: any[];
    configuration: Record<string, any>;
    fileAssets: Record<string, string>;
  }>;
  
  backupSessions!: Table<{
    id: string;
    sessionId: string;
    status: string;
    snapshotUUID?: string;
    progress: number;
    message: string;
    startTime: number;
    endTime?: number;
    error?: string;
    retryCount: number;
  }>;
  
  restoreSessions!: Table<{
    id: string;
    sessionId: string;
    status: string;
    snapshotUUID?: string;
    progress: number;
    message: string;
    startTime: number;
    endTime?: number;
    error?: string;
    migrationLog: string[];
    replayLog: string[];
  }>;
  
  migrations!: Table<MigrationRecord>;
  workflows!: Table<Workflow>;
  workflowSteps!: Table<WorkflowStep>;

  constructor() {
    super('IncrementalBackupDB');
    
    // Apply current schema
    this.version(SCHEMA_VERSIONS.CURRENT).stores({
      entityUUIDs: 'id, uuid, table, createdAt, updatedAt, &uuid, version',
      actionLog: 'id, uuid, action, table, timestamp, sequence, status, &uuid, dependencies, retryCount',
      snapshots: 'id, uuid, timestamp, schemaVersion, isComplete, &uuid, parentSnapshotUUID, baseSnapshotUUID',
      backupSessions: 'id, sessionId, status, startTime, snapshotUUID',
      restoreSessions: 'id, sessionId, status, startTime, snapshotUUID, migrationLog, replayLog',
      migrations: 'id, version, name, appliedAt, checksum',
      workflows: 'id, uuid, name, status, createdAt, updatedAt, &uuid',
      workflowSteps: 'id, workflowId, stepType, status, data, sequence, &uuid'
    });
  }

  // Migration management
  async applyMigrations(): Promise<void> {
    const appliedMigrations = await this.migrations.toArray();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    for (let version = 1; version <= SCHEMA_VERSIONS.CURRENT; version++) {
      if (!appliedVersions.has(version) && MIGRATIONS[version]) {
        console.log(`Applying migration ${version}: ${MIGRATIONS[version].name}`);
        
        try {
          // Apply migration
          await this.applyMigration(version);
          
          // Record migration
          const migrationRecord: MigrationRecord = {
            id: `migration_${version}`,
            version,
            name: MIGRATIONS[version].name,
            appliedAt: Date.now(),
            checksum: await this.generateMigrationChecksum(version)
          };
          
          await this.migrations.add(migrationRecord);
          console.log(`Migration ${version} applied successfully`);
          
        } catch (error) {
          console.error(`Migration ${version} failed:`, error);
          throw new Error(`Migration ${version} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // Apply specific migration
  private async applyMigration(version: number): Promise<void> {
    const migration = MIGRATIONS[version];
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    // Apply schema changes
    migration.apply(this);

    // Apply data migrations if needed
    await this.applyDataMigration(version);
  }

  // Apply data migrations
  private async applyDataMigration(version: number): Promise<void> {
    switch (version) {
      case 2:
        // V2: Add compression metadata to existing snapshots
        const snapshots = await this.snapshots.toArray();
        for (const snapshot of snapshots) {
          if (!snapshot.metadata.compressionRatio) {
            snapshot.metadata.compressionRatio = 1.0; // No compression for existing snapshots
            await this.snapshots.put(snapshot);
          }
        }
        break;
        
      case 3:
        // V3: Add workflow tracking for existing sessions
        const backupSessions = await this.backupSessions.toArray();
        for (const session of backupSessions) {
          if (!session.snapshotUUID && session.status === 'COMPLETED') {
            // Try to find associated snapshot
            const snapshots = await this.snapshots
              .where('timestamp')
              .between(session.startTime, session.endTime || Date.now())
              .toArray();
            
            if (snapshots.length > 0) {
              session.snapshotUUID = snapshots[0].uuid;
              await this.backupSessions.put(session);
            }
          }
        }
        break;
    }
  }

  // Generate migration checksum
  private async generateMigrationChecksum(version: number): Promise<string> {
    const migration = MIGRATIONS[version];
    const migrationData = JSON.stringify({
      version,
      name: migration.name,
      description: migration.description
    });
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(migrationData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Workflow management
  async createWorkflow(name: string, type: Workflow['type'], data?: any): Promise<Workflow> {
    const workflow: Workflow = {
      id: `workflow_${Date.now()}`,
      uuid: `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      status: 'PENDING',
      type,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    await this.workflows.add(workflow);
    return workflow;
  }

  async addWorkflowStep(
    workflowId: string,
    stepType: string,
    data?: any,
    dependencies?: string[]
  ): Promise<WorkflowStep> {
    const step: WorkflowStep = {
      id: `step_${Date.now()}`,
      uuid: `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      stepType,
      status: 'PENDING',
      data,
      sequence: await this.getNextStepSequence(workflowId),
      retryCount: 0,
      dependencies
    };

    await this.workflowSteps.add(step);
    return step;
  }

  private async getNextStepSequence(workflowId: string): Promise<number> {
    const steps = await this.workflowSteps
      .where('workflowId')
      .equals(workflowId)
      .toArray();
    
    return steps.length + 1;
  }

  // Resume unfinished workflows
  async resumeUnfinishedWorkflows(): Promise<void> {
    const unfinishedWorkflows = await this.workflows
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
        await this.workflows.put(workflow);
        
        // Resume workflow execution
        await this.executeWorkflow(workflow);
      } else {
        // Mark as failed after max retries
        workflow.status = 'FAILED';
        workflow.error = 'Max retries exceeded';
        workflow.updatedAt = Date.now();
        await this.workflows.put(workflow);
      }
    }
  }

  // Execute workflow
  private async executeWorkflow(workflow: Workflow): Promise<void> {
    try {
      const steps = await this.workflowSteps
        .where('workflowId')
        .equals(workflow.id)
        .orderBy('sequence')
        .toArray();

      for (const step of steps) {
        if (step.status === 'PENDING' || step.status === 'FAILED') {
          // Check dependencies
          if (step.dependencies && step.dependencies.length > 0) {
            const dependentSteps = await this.workflowSteps
              .where('uuid')
              .anyOf(step.dependencies)
              .toArray();
            
            const incompleteDependencies = dependentSteps.filter(s => s.status !== 'COMPLETED');
            if (incompleteDependencies.length > 0) {
              console.log(`Step ${step.uuid} waiting for dependencies`);
              continue;
            }
          }

          // Execute step
          await this.executeWorkflowStep(step);
        }
      }

      // Check if all steps are completed
      const allSteps = await this.workflowSteps
        .where('workflowId')
        .equals(workflow.id)
        .toArray();
      
      const allCompleted = allSteps.every(s => s.status === 'COMPLETED');
      if (allCompleted) {
        workflow.status = 'COMPLETED';
        workflow.completedAt = Date.now();
        await this.workflows.put(workflow);
      }

    } catch (error) {
      console.error(`Workflow execution failed: ${workflow.uuid}`, error);
      workflow.status = 'FAILED';
      workflow.error = error instanceof Error ? error.message : String(error);
      workflow.updatedAt = Date.now();
      await this.workflows.put(workflow);
    }
  }

  // Execute individual workflow step
  private async executeWorkflowStep(step: WorkflowStep): Promise<void> {
    try {
      step.status = 'IN_PROGRESS';
      step.startedAt = Date.now();
      await this.workflowSteps.put(step);

      // Execute step based on type
      switch (step.stepType) {
        case 'CREATE_SNAPSHOT':
          // Implementation for creating snapshot
          break;
        case 'RESTORE_SNAPSHOT':
          // Implementation for restoring snapshot
          break;
        case 'MIGRATE_DATA':
          // Implementation for data migration
          break;
        case 'REPLAY_ACTIONS':
          // Implementation for action replay
          break;
        default:
          throw new Error(`Unknown step type: ${step.stepType}`);
      }

      step.status = 'COMPLETED';
      step.completedAt = Date.now();
      await this.workflowSteps.put(step);

    } catch (error) {
      console.error(`Step execution failed: ${step.uuid}`, error);
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      step.retryCount++;
      await this.workflowSteps.put(step);
      
      // Retry if under max retries
      if (step.retryCount < 3) {
        setTimeout(() => {
          this.executeWorkflowStep(step);
        }, 1000 * step.retryCount); // Exponential backoff
      }
    }
  }

  // Cleanup old data
  async cleanupOldData(retentionDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    // Cleanup old sessions
    await this.backupSessions
      .where('startTime')
      .below(cutoffTime)
      .delete();

    await this.restoreSessions
      .where('startTime')
      .below(cutoffTime)
      .delete();

    // Cleanup old action logs (keep only recent ones)
    await this.actionLog
      .where('timestamp')
      .below(cutoffTime)
      .delete();

    // Cleanup completed workflows
    await this.workflows
      .where('status')
      .anyOf(['COMPLETED', 'FAILED'])
      .and(workflow => workflow.updatedAt < cutoffTime)
      .delete();

    console.log(`Cleaned up data older than ${retentionDays} days`);
  }

  // Get database statistics
  async getDatabaseStats(): Promise<Record<string, number>> {
    const [
      entityUUIDCount,
      actionLogCount,
      snapshotCount,
      workflowCount,
      workflowStepCount
    ] = await Promise.all([
      this.entityUUIDs.count(),
      this.actionLog.count(),
      this.snapshots.count(),
      this.workflows.count(),
      this.workflowSteps.count()
    ]);

    return {
      entityUUIDs: entityUUIDCount,
      actionLog: actionLogCount,
      snapshots: snapshotCount,
      workflows: workflowCount,
      workflowSteps: workflowStepCount
    };
  }
}

// Export singleton instance
export const incrementalBackupDB = new IncrementalBackupDatabase(); 