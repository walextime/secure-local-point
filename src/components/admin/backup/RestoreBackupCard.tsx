import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, AlertTriangle } from 'lucide-react';
import { restoreFromSystemBackup } from '@/services/backup/backupManager';
import { useToast } from '@/hooks/use-toast';

const RestoreBackupCard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid backup ZIP file",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    
    setIsRestoring(true);
    try {
      const result = await restoreFromSystemBackup(selectedFile);
      if (result.success) {
        toast({
          title: "Restore successful",
          description: result.message
        });
        setSelectedFile(null);
      } else {
        toast({
          title: "Restore failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Restore failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
      setShowConfirm(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Restore from Backup
        </CardTitle>
        <CardDescription>
          Restore your data from a system backup file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="backup-file" className="text-sm font-medium">
            Select Backup File
          </label>
          <input
            id="backup-file"
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={!selectedFile || isRestoring}
              className="w-full"
              variant="destructive"
            >
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Restore
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will replace all current data with the backup data. This action cannot be undone. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default RestoreBackupCard; 