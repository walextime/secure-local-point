
import React from 'react';
import SyncStatusCard from './sync/SyncStatusCard';
import GoogleSheetsCard from './sync/GoogleSheetsCard';
import LocalExcelCard from './sync/LocalExcelCard';
import { useSyncSettings } from './sync/useSyncSettings';

const SyncSettings: React.FC = () => {
  const {
    config,
    isSyncing,
    isOnline,
    updateConfig,
    saveConfig,
    testGoogleSheetsConnection,
    performManualSync,
    initializeSyncManager
  } = useSyncSettings();

  return (
    <div className="space-y-6">
      <SyncStatusCard
        isOnline={isOnline}
        autoSync={config.autoSync}
        syncInterval={config.syncInterval}
        isSyncing={isSyncing}
        onAutoSyncChange={(checked) => updateConfig('autoSync', checked)}
        onSyncIntervalChange={(value) => updateConfig('syncInterval', value)}
        onManualSync={performManualSync}
      />

      <GoogleSheetsCard
        googleSheetsEnabled={config.googleSheetsEnabled}
        spreadsheetId={config.spreadsheetId}
        clientId={config.clientId}
        apiKey={config.apiKey}
        onGoogleSheetsEnabledChange={(checked) => updateConfig('googleSheetsEnabled', checked)}
        onSpreadsheetIdChange={(value) => updateConfig('spreadsheetId', value)}
        onClientIdChange={(value) => updateConfig('clientId', value)}
        onApiKeyChange={(value) => updateConfig('apiKey', value)}
        onTestConnection={testGoogleSheetsConnection}
        onInitialize={initializeSyncManager}
        onSaveSettings={saveConfig}
      />

      <LocalExcelCard />
    </div>
  );
};

export default SyncSettings;
