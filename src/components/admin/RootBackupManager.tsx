import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database } from 'lucide-react';

const RootBackupManager: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup Manager
        </CardTitle>
        <CardDescription>
          Backup system temporarily disabled for maintenance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            The backup system is being updated. Please check back later.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default RootBackupManager;