
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';

interface GoogleSheetsCardProps {
  googleSheetsEnabled: boolean;
  spreadsheetId: string;
  clientId: string;
  apiKey: string;
  onGoogleSheetsEnabledChange: (checked: boolean) => void;
  onSpreadsheetIdChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTestConnection: () => void;
  onInitialize: () => void;
  onSaveSettings: () => void;
}

const GoogleSheetsCard: React.FC<GoogleSheetsCardProps> = ({
  googleSheetsEnabled,
  spreadsheetId,
  clientId,
  apiKey,
  onGoogleSheetsEnabledChange,
  onSpreadsheetIdChange,
  onClientIdChange,
  onApiKeyChange,
  onTestConnection,
  onInitialize,
  onSaveSettings
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Google Sheets Integration
        </CardTitle>
        <CardDescription>
          Connect to Google Sheets for cloud synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="google-sheets-enabled">Enable Google Sheets</Label>
          <Switch
            id="google-sheets-enabled"
            checked={googleSheetsEnabled}
            onCheckedChange={onGoogleSheetsEnabledChange}
          />
        </div>

        {googleSheetsEnabled && (
          <>
            <div>
              <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
              <Input
                id="spreadsheet-id"
                value={spreadsheetId}
                onChange={(e) => onSpreadsheetIdChange(e.target.value)}
                placeholder="Enter Google Sheets ID from URL"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => onClientIdChange(e.target.value)}
                placeholder="Enter OAuth Client ID"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Enter Google Sheets API Key"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={onTestConnection} variant="outline" className="flex-1">
                Test Connection
              </Button>
              <Button onClick={onInitialize} className="flex-1">
                Initialize
              </Button>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button onClick={onSaveSettings} className="flex-1">
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsCard;
