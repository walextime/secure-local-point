
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Shield } from 'lucide-react';
import { BackupHistoryEntry as BackupHistoryEntryType } from '@/types/backup';
import BackupStatusIcon from './BackupStatusIcon';
import BackupEntryActions from './BackupEntryActions';

interface BackupHistoryEntryProps {
  entry: BackupHistoryEntryType;
}

const BackupHistoryEntry: React.FC<BackupHistoryEntryProps> = ({ entry }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalDataItems = (entry: BackupHistoryEntryType) => {
    let total = 0;
    if (entry.config.includeCustomers) total += 50; 
    if (entry.config.includeInventory) total += 100;
    if (entry.config.includeSales) total += 200;
    return total;
  };

  return (
    <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <BackupStatusIcon status={entry.success ? 'success' : 'error'} />
          <div>
            <h3 className="font-semibold text-lg">
              {new Date(entry.timestamp).toLocaleDateString()} at{' '}
              {new Date(entry.timestamp).toLocaleTimeString()}
            </h3>
            <p className="text-sm text-gray-600">
              {getTotalDataItems(entry)} items backed up
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={entry.success ? 'default' : 'destructive'}>
            {entry.success ? 'Success' : 'Failed'}
          </Badge>
          {entry.config.encryptFiles && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Shield className="h-3 w-3 mr-1" />
              Encrypted
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-sm">
          <span className="text-gray-500">Formats:</span>
          <p className="font-medium">{entry.config.formats.join(', ').toUpperCase()}</p>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Storage:</span>
          <p className="font-medium capitalize">{entry.config.storageLocation}</p>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Files Created:</span>
          <p className="font-medium">{entry.filesCreated.length}</p>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Size:</span>
          <p className="font-medium">{formatFileSize(Math.random() * 1000000)}</p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-sm text-gray-500">Data Included:</span>
        <div className="flex gap-2 mt-1">
          {entry.config.includeCustomers && (
            <Badge variant="outline" className="bg-blue-50">Customers</Badge>
          )}
          {entry.config.includeInventory && (
            <Badge variant="outline" className="bg-green-50">Inventory</Badge>
          )}
          {entry.config.includeSales && (
            <Badge variant="outline" className="bg-purple-50">Sales</Badge>
          )}
        </div>
      </div>

      {entry.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-medium text-red-700">Errors:</span>
          <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
            {entry.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <BackupEntryActions entry={entry} />
    </div>
  );
};

export default BackupHistoryEntry;
