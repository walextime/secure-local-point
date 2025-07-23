
import React from 'react';
import { File } from 'lucide-react';

const EmptyBackupHistory: React.FC = () => {
  return (
    <div className="text-center py-12">
      <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="text-muted-foreground text-lg">No backup history available</p>
      <p className="text-sm text-gray-500 mt-2">Your backup operations will appear here</p>
    </div>
  );
};

export default EmptyBackupHistory;
