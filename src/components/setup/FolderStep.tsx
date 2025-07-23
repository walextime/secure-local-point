
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FolderOpen, Info } from 'lucide-react';
import { toast } from 'sonner';

interface FolderStepProps {
  onSubmit: (path: string) => void;
  onBack: () => void;
  initialPath: string;
  isLoading?: boolean;
}

const FolderStep: React.FC<FolderStepProps> = ({
  onSubmit,
  onBack,
  initialPath,
  isLoading = false
}) => {
  const [folderPath, setFolderPath] = useState(initialPath);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (folderPath.trim() === '') {
      setError('Please enter a valid folder path');
      return;
    }
    
    
    toast.info('In browser mode, secure data will be stored in browser storage');
    onSubmit(folderPath);
  };
  
  const handleBrowseFolder = async () => {
    toast.info('Folder browser not available in web version');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="folderPath">Secure Data Location</Label>
          <div className="flex space-x-2">
            <Input
              id="folderPath"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Browser Storage"
              required
              disabled={isLoading}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBrowseFolder}
              disabled={isLoading}
            >
              <FolderOpen size={16} className="mr-2" />
              Browse
            </Button>
          </div>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            In web mode, we'll use secure browser storage instead of file system folders.
          </AlertDescription>
        </Alert>
        
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            This location will store your encrypted data including:
            <ul className="list-disc pl-5 mt-2">
              <li>Encrypted database files</li>
              <li>Receipts and invoices</li>
              <li>Backups and exported reports</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack} 
            className="w-1/2"
            disabled={isLoading}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="w-1/2 bg-pos-navy hover:bg-blue-800"
            disabled={isLoading}
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default FolderStep;
