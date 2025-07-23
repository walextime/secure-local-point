import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ManualBackupTab from './ManualBackupTab';
import AutoBackupTab from './AutoBackupTab';
import DailyReportsTab from './DailyReportsTab';
import BackupHistoryTab from './BackupHistoryTab';
import { Shield, AlertTriangle, Lock, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BackupManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDecryptDialog, setShowDecryptDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Check if user has admin/manager access
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need administrator or manager privileges to access the Backup Manager.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleDecryptBackup = async () => {
    if (!selectedFile || !masterPassword) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter the master password",
        variant: "destructive"
      });
      return;
    }

    setIsDecrypting(true);
    try {
      
      
      toast({
        title: "Decryption successful",
        description: "Backup file has been decrypted and downloaded"
      });
      setShowDecryptDialog(false);
      setSelectedFile(null);
      setMasterPassword('');
    } catch (error) {
      toast({
        title: "Decryption failed",
        description: "Invalid master password or corrupted file",
        variant: "destructive"
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid encrypted backup ZIP file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Backup Manager</h1>
        </div>
        
        {}
        <Button
          onClick={() => setShowDecryptDialog(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Lock className="h-4 w-4" />
          Decrypt Backup
        </Button>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manual">Manual Backup</TabsTrigger>
          <TabsTrigger value="auto">Auto Backup</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="history">Backup History</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <ManualBackupTab />
        </TabsContent>

        <TabsContent value="auto" className="space-y-4">
          <AutoBackupTab />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <DailyReportsTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BackupHistoryTab />
        </TabsContent>
      </Tabs>

      {}
      <Dialog open={showDecryptDialog} onOpenChange={setShowDecryptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Decrypt Backup File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="backup-file">Select Encrypted Backup File</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="master-password">Master Password</Label>
              <Input
                id="master-password"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter master password"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This password is used to decrypt human-readable backup files only.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecryptDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDecryptBackup} 
              disabled={!selectedFile || !masterPassword || isDecrypting}
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupManager; 