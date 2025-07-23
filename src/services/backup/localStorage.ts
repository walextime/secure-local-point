export async function saveBackupToLocal(zipBlob: Blob, filename: string) {
  // Always use the browser's download mechanism (Downloads folder only)
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  return false;
}

export async function loadBackupFromLocal(filename: string) {
  
}

export function getBackupDirectory(date: Date): string {
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function ensureBackupDirectoryExists(date: Date) {
  
  
} 