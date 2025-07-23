
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings } from 'lucide-react';

interface GoogleSheetsConfigProps {
  spreadsheetId: string;
  clientId: string;
  apiKey: string;
  isOnline: boolean;
  syncStatus: 'connected' | 'disconnected' | 'syncing';
  syncEnabled: boolean;
  onSpreadsheetIdChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTestConnection: () => void;
  onEnableSync: () => void;
}

const GoogleSheetsConfig: React.FC<GoogleSheetsConfigProps> = ({
  spreadsheetId,
  clientId,
  apiKey,
  isOnline,
  syncStatus,
  syncEnabled,
  onSpreadsheetIdChange,
  onClientIdChange,
  onApiKeyChange,
  onTestConnection,
  onEnableSync
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Google Sheets Configuration
        </CardTitle>
        <CardDescription>
          Enter your Google Sheets API credentials and spreadsheet information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">Google Sheet ID</Label>
            <Input
              id="spreadsheetId"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={spreadsheetId}
              onChange={(e) => onSpreadsheetIdChange(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Found in your Google Sheet URL: /spreadsheets/d/[SHEET_ID]/edit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">OAuth Client ID</Label>
            <Input
              id="clientId"
              placeholder="123456789-abcdefg.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => onClientIdChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="AIzaSyBnNp-GlTzjHK..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onTestConnection}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="flex-1"
          >
            <Settings className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
          <Button
            onClick={onEnableSync}
            disabled={!isOnline}
            className="flex-1"
          >
            {syncEnabled ? 'Disable Sync' : 'Enable Sync'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsConfig;
