
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SyncSettingsCardProps {
  autoSyncInterval: number;
  onAutoSyncIntervalChange: (value: number) => void;
}

const SyncSettingsCard: React.FC<SyncSettingsCardProps> = ({
  autoSyncInterval,
  onAutoSyncIntervalChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Settings</CardTitle>
        <CardDescription>Configure automatic synchronization behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="interval">Auto Sync Interval (minutes)</Label>
          <Input
            id="interval"
            type="number"
            min="5"
            max="1440"
            value={autoSyncInterval}
            onChange={(e) => onAutoSyncIntervalChange(Number(e.target.value))}
          />
          <p className="text-xs text-gray-500">
            How often to automatically sync data (5-1440 minutes)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Sync Information</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Sales data is synced to a "Sales" sheet</li>
            <li>• Customer data is synced to a "Customers" sheet</li>
            <li>• Inventory data is synced to an "Inventory" sheet</li>
            <li>• Data is appended, not overwritten</li>
            <li>• Sync only occurs when online</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncSettingsCard;
