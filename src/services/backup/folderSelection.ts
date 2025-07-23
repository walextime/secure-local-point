

export interface FolderInfo {
  name: string;
  path: string;
  files: FileInfo[];
  totalSize: number;
  lastModified: Date;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  isDirectory: boolean;
}

export interface BackupPreview {
  totalFiles: number;
  totalSize: number;
  backupFiles: FileInfo[];
  systemFiles: FileInfo[];
  otherFiles: FileInfo[];
  lastBackup: Date | null;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }
}

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite';
  startIn?: FileSystemHandle;
}


export const isFileSystemAccessSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};


export const selectBackupFolder = async (): Promise<FolderInfo | null> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const dirHandle = await window.showDirectoryPicker!({
      mode: 'readwrite'
    });

    const folderInfo = await getFolderInfo(dirHandle);
    
    
    localStorage.setItem('selected_backup_folder', JSON.stringify({
      name: folderInfo.name,
      path: folderInfo.path,
      lastSelected: new Date().toISOString()
    }));

    return folderInfo;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      
      return null;
    }
    throw error;
  }
};


export const getFolderInfo = async (dirHandle: FileSystemDirectoryHandle): Promise<FolderInfo> => {
  const files: FileInfo[] = [];
  let totalSize = 0;

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      
      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        isDirectory: false
      };
      
      files.push(fileInfo);
      totalSize += file.size;
    } else if (handle.kind === 'directory') {
      const fileInfo: FileInfo = {
        name: handle.name,
        size: 0,
        type: 'directory',
        lastModified: new Date(),
        isDirectory: true
      };
      
      files.push(fileInfo);
    }
  }

  return {
    name: dirHandle.name,
    path: dirHandle.name, 
    files,
    totalSize,
    lastModified: new Date()
  };
};


export const previewBackupFolder = async (): Promise<BackupPreview | null> => {
  const saved = localStorage.getItem('selected_backup_folder');
  if (!saved) {
    return null;
  }

  try {
    const folderInfo = JSON.parse(saved);
    
    
    
    return {
      totalFiles: 15,
      totalSize: 1024 * 1024 * 50, 
      backupFiles: [
        {
          name: 'backup_2024-01-15_18-00-00.zip',
          size: 1024 * 1024 * 2.3,
          type: 'application/zip',
          lastModified: new Date('2024-01-15T18:00:00'),
          isDirectory: false
        },
        {
          name: 'system_backup_2024-01-15_18-05-00.zip',
          size: 1024 * 1024 * 1.8,
          type: 'application/zip',
          lastModified: new Date('2024-01-15T18:05:00'),
          isDirectory: false
        }
      ],
      systemFiles: [
        {
          name: 'indexeddb-export_2024-01-15_18-05-00.json',
          size: 1024 * 512,
          type: 'application/json',
          lastModified: new Date('2024-01-15T18:05:00'),
          isDirectory: false
        }
      ],
      otherFiles: [],
      lastBackup: new Date('2024-01-15T18:05:00')
    };
  } catch (error) {
    console.error('Error previewing backup folder:', error);
    return null;
  }
};


export const getSelectedBackupFolder = (): { name: string; path: string; lastSelected: string } | null => {
  try {
    const saved = localStorage.getItem('selected_backup_folder');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error getting selected backup folder:', error);
    return null;
  }
};


export const saveBackupToSelectedFolder = async (file: File, filename: string): Promise<boolean> => {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported');
  }

  try {
    
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error saving backup to folder:', error);
    return false;
  }
};


export const isBackupFolder = (folderInfo: FolderInfo): boolean => {
  const backupPatterns = [
    /^backup_.*\.zip$/i,
    /^system_backup_.*\.zip$/i,
    /^indexeddb-export_.*\.json$/i,
    /^readable_backup_.*\.zip$/i
  ];

  return folderInfo.files.some(file => 
    backupPatterns.some(pattern => pattern.test(file.name))
  );
};


export const getBackupStats = (folderInfo: FolderInfo) => {
  const backupFiles = folderInfo.files.filter(file => 
    /^backup_.*\.zip$/i.test(file.name) ||
    /^system_backup_.*\.zip$/i.test(file.name) ||
    /^readable_backup_.*\.zip$/i.test(file.name)
  );

  const systemFiles = folderInfo.files.filter(file => 
    /^indexeddb-export_.*\.json$/i.test(file.name)
  );

  const totalBackupSize = backupFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSystemSize = systemFiles.reduce((sum, file) => sum + file.size, 0);

  const lastBackup = backupFiles.length > 0 
    ? new Date(Math.max(...backupFiles.map(f => f.lastModified.getTime())))
    : null;

  return {
    backupCount: backupFiles.length,
    systemCount: systemFiles.length,
    totalBackupSize,
    totalSystemSize,
    lastBackup,
    oldestBackup: backupFiles.length > 0 
      ? new Date(Math.min(...backupFiles.map(f => f.lastModified.getTime())))
      : null
  };
}; 