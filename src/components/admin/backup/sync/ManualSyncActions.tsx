
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Download } from 'lucide-react';

interface ManualSyncActionsProps {
  isOnline: boolean;
  syncStatus: 'connected' | 'disconnected' | 'syncing';
  onManualSync: () => void;
}

const ManualSyncActions: React.FC<ManualSyncActionsProps> = ({
  isOnline,
  syncStatus,
  onManualSync
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Actions</CardTitle>
        <CardDescription>Perform immediate sync operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onManualSync}
            disabled={!isOnline || syncStatus !== 'connected'}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Sync Now
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!isOnline || syncStatus !== 'connected'}
                className="flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Force Full Sync
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Force Full Synchronization</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sync all data to Google Sheets, which may take longer and could create duplicate entries.
                  Only use this if regular sync is not working properly.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onManualSync}>
                  Force Sync
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManualSyncActions;
