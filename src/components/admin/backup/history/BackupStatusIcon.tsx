
import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BackupStatusIconProps {
  status: 'success' | 'error' | 'none';
}

const BackupStatusIcon: React.FC<BackupStatusIconProps> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

export default BackupStatusIcon;
