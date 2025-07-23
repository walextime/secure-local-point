# Incremental Backup & Restore System

## Overview

This document outlines the comprehensive incremental backup and restore system for the PWA POS application, featuring snapshot-based backups, action log tracking, UUID-based deduplication, and workflow resumption capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Incremental Backup System                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Snapshot      │  │   Action Log    │  │   Workflow      │ │
│  │   Management    │  │   Tracking      │  │   Engine        │ │
│  │                 │  │                 │  │                 │ │
│  │ • Full/Incremental│ • UUID Tracking │ • State Machine   │ │
│  │ • Differential  │ • Idempotent Ops  │ • Resume Support  │ │
│  │ • Schema Migrations│ • Dependency Mgmt│ • Error Recovery │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Data Models                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   EntityUUID    │  │   ActionLog     │  │   Snapshot      │ │
│  │                 │  │                 │  │                 │ │
│  │ • UUID Mapping  │  │ • Action History│  │ • Metadata      │ │
│  │ • Version Track │  │ • Dependencies  │  │ • Table Data    │ │
│  │ • Cross-Refs    │  │ • Retry Logic   │  │ • File Assets   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### 1. Entity UUID Tracking

```typescript
interface EntityUUID {
  id: string;           // Original entity ID
  uuid: string;         // Unique UUID for cross-backup tracking
  table: string;        // Database table name
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
  version: number;      // Version for conflict resolution
}
```

**Purpose**: 
- Track entities across multiple backups
- Enable deduplication and incremental updates
- Support schema migrations and data evolution

### 2. Action Log Entry

```typescript
interface ActionLogEntry {
  id: string;           // Unique action ID
  uuid: string;         // Action UUID for tracking
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_CREATE' | 'BATCH_UPDATE' | 'BATCH_DELETE';
  table: string;        // Target table
  entityId?: string;    // Original entity ID
  entityUUID?: string;  // Entity UUID reference
  data?: any;           // New data
  previousData?: any;   // Previous data for rollback
  timestamp: number;    // Action timestamp
  userId?: string;      // User who performed action
  sessionId: string;    // Session tracking
  sequence: number;     // Sequential order
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  error?: string;       // Error message if failed
  retryCount: number;   // Retry attempts
  dependencies?: string[]; // UUIDs of dependent actions
}
```

**Purpose**:
- Track all database operations
- Enable idempotent replay during restore
- Support dependency management
- Provide audit trail

### 3. Snapshot Metadata

```typescript
interface SnapshotMetadata {
  id: string;           // Snapshot ID
  uuid: string;         // Snapshot UUID
  name: string;         // Human-readable name
  description?: string; // Optional description
  timestamp: number;    // Creation timestamp
  schemaVersion: number; // Database schema version
  appVersion: string;   // Application version
  snapshotType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  parentSnapshotUUID?: string; // For incremental snapshots
  baseSnapshotUUID?: string;   // For differential snapshots
  checksum: string;     // SHA-256 integrity check
  size: number;         // Archive size in bytes
  compressionRatio?: number; // Compression efficiency
  tableCounts: Record<string, number>; // Record counts per table
  actionLogCount: number; // Number of action log entries
  entityUUIDCount: number; // Number of tracked entities
  isComplete: boolean;  // Backup completion status
  isVerified: boolean;  // Integrity verification status
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
}
```

**Purpose**:
- Comprehensive snapshot metadata
- Version compatibility tracking
- Integrity validation
- Performance metrics

### 4. Workflow Management

```typescript
interface Workflow {
  id: string;           // Workflow ID
  uuid: string;         // Workflow UUID
  name: string;         // Workflow name
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: 'BACKUP' | 'RESTORE' | 'MIGRATION' | 'REPLAY';
  data?: any;           // Workflow-specific data
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
  completedAt?: number; // Completion timestamp
  error?: string;       // Error message if failed
  retryCount: number;   // Retry attempts
  maxRetries: number;   // Maximum retry attempts
}

interface WorkflowStep {
  id: string;           // Step ID
  uuid: string;         // Step UUID
  workflowId: string;   // Parent workflow ID
  stepType: string;     // Step type identifier
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  data?: any;           // Step-specific data
  sequence: number;     // Execution order
  startedAt?: number;   // Start timestamp
  completedAt?: number; // Completion timestamp
  error?: string;       // Error message if failed
  retryCount: number;   // Retry attempts
  dependencies?: string[]; // UUIDs of dependent steps
}
```

**Purpose**:
- Track complex operations
- Enable workflow resumption
- Support error recovery
- Provide detailed progress tracking

## Dexie.js Schema with Migrations

### Schema Versions

```typescript
export const SCHEMA_VERSIONS = {
  V1: 1,  // Initial schema
  V2: 2,  // Add UUID indexes and compression
  V3: 3,  // Add workflow resumption and dependencies
  CURRENT: 3
};
```

### Migration Definitions

```typescript
export const MIGRATIONS = {
  [SCHEMA_VERSIONS.V1]: {
    name: 'Initial schema',
    description: 'Basic incremental backup tables',
    apply: (db: Dexie) => {
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
```

## Backup and Restore Logic

### 1. Incremental Backup Creation

```typescript
async function createIncrementalBackup(
  name: string,
  description?: string,
  parentSnapshotUUID?: string
): Promise<string> {
  // 1. Create workflow for tracking
  const workflow = await createWorkflow('BACKUP', { name, description, parentSnapshotUUID });
  
  // 2. Initialize backup
  await executeStep('INITIALIZE_BACKUP', async () => {
    if (parentSnapshotUUID) {
      await validateParentSnapshot(parentSnapshotUUID);
    }
  });
  
  // 3. Capture entity UUIDs
  const entityUUIDs = await executeStep('CAPTURE_ENTITY_UUIDS', async () => {
    return await getAllEntityUUIDs();
  });
  
  // 4. Capture table data
  const tableData = await executeStep('CAPTURE_TABLE_DATA', async () => {
    return await captureAllTableData();
  });
  
  // 5. Capture action log (incremental since parent)
  const actionLog = await executeStep('CAPTURE_ACTION_LOG', async () => {
    if (parentSnapshotUUID) {
      return await getActionLogSince(parentSnapshotUUID);
    }
    return await getAllActionLog();
  });
  
  // 6. Capture configuration and files
  const { configuration, fileAssets } = await executeStep('CAPTURE_CONFIGURATION', async () => {
    return {
      configuration: await captureConfiguration(),
      fileAssets: await captureFileAssets()
    };
  });
  
  // 7. Create snapshot
  const snapshotUUID = await executeStep('CREATE_SNAPSHOT', async () => {
    return await createSnapshot(name, description, parentSnapshotUUID, {
      entityUUIDs, tableData, actionLog, configuration, fileAssets
    });
  });
  
  // 8. Validate snapshot
  await executeStep('VALIDATE_SNAPSHOT', async () => {
    await validateSnapshot(snapshotUUID);
  });
  
  return snapshotUUID;
}
```

### 2. Snapshot Restore with Action Replay

```typescript
async function restoreSnapshot(snapshotUUID: string): Promise<void> {
  // 1. Create workflow for tracking
  const workflow = await createWorkflow('RESTORE', { snapshotUUID });
  
  // 2. Validate snapshot
  const snapshot = await executeStep('VALIDATE_SNAPSHOT', async () => {
    const snapshot = await loadSnapshot(snapshotUUID);
    await validateSnapshotIntegrity(snapshot);
    return snapshot;
  });
  
  // 3. Check schema compatibility
  await executeStep('CHECK_SCHEMA_COMPATIBILITY', async () => {
    const currentSchemaVersion = getCurrentSchemaVersion();
    if (snapshot.metadata.schemaVersion > currentSchemaVersion) {
      throw new Error('Snapshot schema version is newer than current version');
    }
  });
  
  // 4. Migrate if needed
  await executeStep('MIGRATE_SCHEMA', async () => {
    const currentSchemaVersion = getCurrentSchemaVersion();
    if (snapshot.metadata.schemaVersion < currentSchemaVersion) {
      await migrateSnapshot(snapshot, currentSchemaVersion);
    }
  });
  
  // 5. Clear existing data
  await executeStep('CLEAR_EXISTING_DATA', async () => {
    await clearAllExistingData();
  });
  
  // 6. Restore database
  await executeStep('RESTORE_DATABASE', async () => {
    await restoreDatabaseTables(snapshot.tableData);
  });
  
  // 7. Restore file assets
  await executeStep('RESTORE_FILE_ASSETS', async () => {
    await restoreFileAssets(snapshot.fileAssets);
  });
  
  // 8. Replay action log (idempotent)
  await executeStep('REPLAY_ACTION_LOG', async () => {
    await replayActionLog(snapshot.actionLog);
  });
  
  // 9. Final validation
  await executeStep('FINAL_VALIDATION', async () => {
    await validateRestoredData(snapshot);
  });
}
```

### 3. Action Replay with Idempotent Operations

```typescript
async function replayActionLog(actionLog: ActionLogEntry[]): Promise<void> {
  // Sort by sequence number for correct order
  const sortedActions = actionLog.sort((a, b) => a.sequence - b.sequence);
  
  for (const action of sortedActions) {
    try {
      // Check if action was already applied (idempotent check)
      const existingEntity = await getEntity(action.table, action.entityId);
      
      switch (action.action) {
        case 'CREATE':
          if (!existingEntity) {
            await createEntity(action.table, action.data);
          }
          break;
          
        case 'UPDATE':
          if (existingEntity) {
            await updateEntity(action.table, action.entityId, action.data);
          }
          break;
          
        case 'DELETE':
          if (existingEntity) {
            await deleteEntity(action.table, action.entityId);
          }
          break;
          
        case 'BATCH_CREATE':
          for (const item of action.data) {
            const existing = await getEntity(action.table, item.id);
            if (!existing) {
              await createEntity(action.table, item);
            }
          }
          break;
      }
      
    } catch (error) {
      console.error(`Failed to replay action ${action.uuid}:`, error);
      // Continue with other actions, don't fail the entire restore
    }
  }
}
```

### 4. Workflow Resumption

```typescript
async function resumeUnfinishedWorkflows(): Promise<void> {
  const unfinishedWorkflows = await getUnfinishedWorkflows();
  
  for (const workflow of unfinishedWorkflows) {
    if (workflow.retryCount < workflow.maxRetries) {
      // Resume workflow execution
      await resumeWorkflow(workflow);
    } else {
      // Mark as failed after max retries
      await markWorkflowAsFailed(workflow, 'Max retries exceeded');
    }
  }
}

async function resumeWorkflow(workflow: Workflow): Promise<void> {
  const steps = await getWorkflowSteps(workflow.id);
  const lastCompletedStep = getLastCompletedStep(steps);
  
  if (lastCompletedStep) {
    // Resume from the next step
    const nextStep = getNextStep(steps, lastCompletedStep);
    if (nextStep) {
      await executeWorkflowStep(nextStep);
    }
  }
}
```

## Mid-Backup Interruption Handling

### 1. Atomic Operations

```typescript
// All backup operations are wrapped in transactions
async function createBackupWithTransaction(): Promise<void> {
  await db.transaction('rw', [/* all tables */], async () => {
    // Backup operations here
    // If any operation fails, entire transaction is rolled back
  });
}
```

### 2. State Tracking

```typescript
// Track backup state to handle interruptions
interface BackupState {
  id: string;
  status: 'INITIALIZING' | 'CAPTURING' | 'PROCESSING' | 'COMPLETING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  startTime: number;
  lastUpdateTime: number;
  error?: string;
}
```

### 3. Recovery Logic

```typescript
async function handleBackupInterruption(): Promise<void> {
  const interruptedBackups = await getInterruptedBackups();
  
  for (const backup of interruptedBackups) {
    switch (backup.status) {
      case 'INITIALIZING':
        // Restart from beginning
        await restartBackup(backup);
        break;
        
      case 'CAPTURING':
        // Resume from last captured data
        await resumeBackupFromCapture(backup);
        break;
        
      case 'PROCESSING':
        // Continue processing
        await continueProcessing(backup);
        break;
        
      case 'COMPLETING':
        // Finalize backup
        await finalizeBackup(backup);
        break;
    }
  }
}
```

## Integrity Checks

### 1. Checksum Validation

```typescript
async function validateSnapshotIntegrity(snapshot: SnapshotData): Promise<boolean> {
  // Generate expected checksum
  const dataString = JSON.stringify(snapshot);
  const expectedChecksum = await generateSHA256(dataString);
  
  // Compare with stored checksum
  if (expectedChecksum !== snapshot.metadata.checksum) {
    throw new Error('Snapshot checksum validation failed');
  }
  
  return true;
}
```

### 2. Schema Validation

```typescript
async function validateSchemaCompatibility(snapshot: SnapshotData): Promise<boolean> {
  const currentSchemaVersion = getCurrentSchemaVersion();
  
  if (snapshot.metadata.schemaVersion > currentSchemaVersion) {
    throw new Error(`Snapshot schema version (${snapshot.metadata.schemaVersion}) is newer than current version (${currentSchemaVersion})`);
  }
  
  return true;
}
```

### 3. Data Consistency Checks

```typescript
async function validateRestoredData(snapshot: SnapshotData): Promise<boolean> {
  // Check table record counts
  for (const [tableName, expectedCount] of Object.entries(snapshot.metadata.tableCounts)) {
    const actualCount = await getTableRecordCount(tableName);
    if (actualCount !== expectedCount) {
      console.warn(`Table ${tableName} count mismatch: expected ${expectedCount}, got ${actualCount}`);
    }
  }
  
  // Check entity UUID consistency
  const entityUUIDs = await getAllEntityUUIDs();
  if (entityUUIDs.length !== snapshot.metadata.entityUUIDCount) {
    console.warn('Entity UUID count mismatch');
  }
  
  return true;
}
```

## Performance Optimizations

### 1. Incremental Backups

```typescript
// Only backup changed data since last snapshot
async function createIncrementalBackup(parentSnapshotUUID: string): Promise<void> {
  const parentSnapshot = await loadSnapshot(parentSnapshotUUID);
  const changedData = await getChangedDataSince(parentSnapshot.timestamp);
  
  // Create incremental snapshot with only changed data
  await createSnapshot('INCREMENTAL', changedData);
}
```

### 2. Compression

```typescript
// Compress large datasets
async function compressSnapshotData(data: any): Promise<Uint8Array> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  
  // Use compression algorithm (e.g., gzip)
  return await compressData(dataBuffer);
}
```

### 3. Background Processing

```typescript
// Use Web Workers for large operations
const backupWorker = new Worker('/backup-worker.js');
backupWorker.postMessage({
  type: 'CREATE_BACKUP',
  data: { name, description, parentSnapshotUUID }
});
```

## Error Handling and Recovery

### 1. Retry Logic

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}
```

### 2. Rollback Support

```typescript
async function rollbackFailedRestore(): Promise<void> {
  // Restore from last known good state
  const lastGoodSnapshot = await getLastGoodSnapshot();
  if (lastGoodSnapshot) {
    await restoreSnapshot(lastGoodSnapshot.uuid);
  }
}
```

### 3. Error Classification

```typescript
enum BackupErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

function classifyError(error: Error): BackupErrorType {
  if (error.message.includes('checksum')) return BackupErrorType.VALIDATION_ERROR;
  if (error.message.includes('schema')) return BackupErrorType.SCHEMA_ERROR;
  if (error.message.includes('storage')) return BackupErrorType.STORAGE_ERROR;
  if (error.message.includes('network')) return BackupErrorType.NETWORK_ERROR;
  if (error.message.includes('timeout')) return BackupErrorType.TIMEOUT_ERROR;
  return BackupErrorType.VALIDATION_ERROR;
}
```

## Conclusion

This incremental backup system provides:

1. **Reliability**: Atomic operations with comprehensive error handling
2. **Efficiency**: Incremental backups with UUID-based deduplication
3. **Flexibility**: Schema migration and version compatibility
4. **Resilience**: Workflow resumption and interruption handling
5. **Integrity**: Multiple validation layers and checksums
6. **Performance**: Compression and background processing
7. **Usability**: Comprehensive UI with progress tracking

The system ensures data protection, enables disaster recovery, and provides a robust foundation for the PWA POS application. 