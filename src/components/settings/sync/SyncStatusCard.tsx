
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cloud, Upload } from 'lucide-react';

interface SyncStatusCardProps {
  isOnline: boolean;
  autoSync: boolean;
  syncInterval: number;
  isSyncing: boolean;
  onAutoSyncChange: (checked: boolean) => void;
  onSyncIntervalChange: (value: number) => void;
  onManualSync: () => void;
}

const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  isOnline,
  autoSync,
  syncInterval,
  isSyncing,
  onAutoSyncChange,
  onSyncIntervalChange,
  onManualSync
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Synchronization Settings
        </CardTitle>
        <CardDescription>
          Configure data synchronization with Google Sheets and local Excel storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="online-status">Connection Status</Label>
          <div className={`px-3 py-1 rounded-full text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="auto-sync">Enable Auto Sync</Label>
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={onAutoSyncChange}
          />
        </div>

        <div>
          <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
          <Input
            id="sync-interval"
            type="number"
            value={syncInterval}
            onChange={(e) => onSyncIntervalChange(parseInt(e.target.value) || 10)}
            min="1"
            max="60"
            className="mt-1"
          />
        </div>

        <Button 
          onClick={onManualSync} 
          disabled={isSyncing}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SyncStatusCard;
