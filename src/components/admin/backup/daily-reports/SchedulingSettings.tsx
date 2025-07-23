
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Settings } from 'lucide-react';

interface SchedulingSettingsProps {
  autoScheduleEnabled: boolean;
  scheduleTime: string;
  reportFormat: 'pdf' | 'xlsx' | 'both';
  selectedCategory: string;
  onScheduleToggle: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
}

const categories = [
  { value: 'all', label: 'All Data' },
  { value: 'sales', label: 'Sales Only' },
  { value: 'inventory', label: 'Inventory Only' },
  { value: 'customers', label: 'Customers Only' }
];

export const SchedulingSettings: React.FC<SchedulingSettingsProps> = ({
  autoScheduleEnabled,
  scheduleTime,
  reportFormat,
  selectedCategory,
  onScheduleToggle,
  onTimeChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Automatic Scheduling
        </CardTitle>
        <CardDescription>
          Set up automatic daily report generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Daily Reports</Label>
            <p className="text-sm text-gray-600">
              Automatically generate and save reports every day
            </p>
          </div>
          <Switch
            checked={autoScheduleEnabled}
            onCheckedChange={onScheduleToggle}
          />
        </div>

        {autoScheduleEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="scheduleTime">Daily Generation Time</Label>
              <Input
                id="scheduleTime"
                type="time"
                value={scheduleTime}
                onChange={(e) => onTimeChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Report Settings</Label>
              <div className="text-sm text-gray-600">
                <p>• Format: {reportFormat === 'both' ? 'PDF & Excel' : reportFormat.toUpperCase()}</p>
                <p>• Category: {categories.find(c => c.value === selectedCategory)?.label}</p>
                <p>• Encrypted with master password</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Scheduling Notes</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Reports are generated using current filter settings</li>
                <li>• Files are automatically saved to your backup location</li>
                <li>• Master password is required for encryption</li>
                <li>• Schedule persists across application restarts</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
