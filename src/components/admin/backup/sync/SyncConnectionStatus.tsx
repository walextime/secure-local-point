
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface SyncConnectionStatusProps {
  isOnline: boolean;
  syncStatus: 'connected' | 'disconnected' | 'syncing';
  lastSyncTime: Date | null;
  syncEnabled: boolean;
  autoSyncInterval: number;
}

const SyncConnectionStatus: React.FC<SyncConnectionStatusProps> = ({
  isOnline,
  syncStatus,
  lastSyncTime,
  syncEnabled,
  autoSyncInterval
}) => {
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Cloud className="h-5 w-5 text-blue-500" /> : <CloudOff className="h-5 w-5 text-gray-400" />}
            Google Sheets Sync
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Automatically synchronize your POS data with Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <CloudOff className="h-4 w-4" />
              <span className="font-medium">Offline Mode</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              You're currently offline. Sync will resume when connection is restored.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Last Sync</p>
            <p className="font-semibold text-blue-800">{formatLastSync(lastSyncTime)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Auto Sync</p>
            <p className="font-semibold text-green-800">{syncEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">Interval</p>
            <p className="font-semibold text-purple-800">{autoSyncInterval} min</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncConnectionStatus;
