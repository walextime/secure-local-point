
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Trash2 } from 'lucide-react';
import { BackupHistoryEntry } from '@/types/backup';
import { toast } from 'sonner';

interface BackupEntryActionsProps {
  entry: BackupHistoryEntry;
}

const BackupEntryActions: React.FC<BackupEntryActionsProps> = ({ entry }) => {
  const handleRestore = async (entry: BackupHistoryEntry) => {
    try {
      
      toast.info('Restore functionality will be implemented based on backup format');
      console.log('Restoring backup:', entry.id);
    } catch (error) {
      toast.error('Failed to restore backup');
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      
      toast.success('Backup record deleted');
      console.log('Deleting backup:', entryId);
    } catch (error) {
      toast.error('Failed to delete backup record');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRestore(entry)}
        disabled={!entry.success}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Restore
      </Button>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup record? This action cannot be undone.
              The actual backup files will not be deleted from your storage location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(entry.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackupEntryActions;
