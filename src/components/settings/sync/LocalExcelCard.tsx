
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from 'lucide-react';

const LocalExcelCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Local Excel Storage
        </CardTitle>
        <CardDescription>
          Data is automatically saved locally every 5 minutes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Your data is continuously backed up in Excel format and stored locally in your browser.
          This ensures you never lose your work even when offline. No automatic downloads are triggered.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-1">Local Storage Benefits:</h5>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Data saved every 5 minutes automatically</li>
            <li>• No unwanted file downloads</li>
            <li>• Duplicate upload prevention</li>
            <li>• Sync conflict avoidance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalExcelCard;
