import React, { useState } from 'react';
import { uploadBackup } from '@/services/backup/backupUploadService';

// Helper to get config from localStorage with fallback
function getCloudBackupConfigWithFallback() {
  let config = {
    scriptUrl: '',
    driveFolderId: '',
    emailDestination: ''
  };
  const savedConfig = localStorage.getItem('backupUploadConfig');
  if (savedConfig) {
    try {
      config = JSON.parse(savedConfig);
    } catch (e) {
      console.error('Failed to parse backupUploadConfig:', e);
    }
  }
  if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
    const lastConfig = localStorage.getItem('lastCloudBackupConfig');
    if (lastConfig) {
      try {
        const parsed = JSON.parse(lastConfig);
        config = { ...config, ...parsed };
      } catch (e) {
        console.error('Failed to parse lastCloudBackupConfig:', e);
      }
    }
  }
  return config;
}

const BackupUploader = () => {
  const [readableFile, setReadableFile] = useState<File | null>(null);
  const [systemFile, setSystemFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string[]>([]);
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const validateSettings = () => {
    if (!scriptUrl || !scriptUrl.startsWith('https://')) {
      alert('❌ Invalid Apps Script URL');
      return false;
    }
    if (!email || !email.includes('@')) {
      alert('❌ Invalid email address');
      return false;
    }
    if (!folderId) {
      alert('❌ Google Drive Folder ID required');
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File, type: 'readable' | 'system') => {
    setStatus(prev => [...prev, `Uploading ${file.name}...`]);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('http://localhost:888/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: scriptUrl,
            filename: file.name.replace(/\.[^/.]+$/, ""),
            file: base64,
            mimeType: 'application/zip',
            email,
            folderId,
          })
        });
        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {
          data = { error: await res.text() };
        }
        if (res.ok && (data.success || data.fileUrl)) {
          setStatus(prev => [...prev, `✅ ${type} backup uploaded: ${data.fileUrl || 'Success'}`]);
        } else {
          setStatus(prev => [...prev, `❌ ${type} upload failed: ${data.error || data.message || res.statusText}`]);
        }
      } catch (err) {
        setStatus(prev => [...prev, `❌ ${type} upload error: ${err}`]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    setStatus([]);
    const config = getCloudBackupConfigWithFallback();
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      alert('❌ Please configure Script URL, Folder ID, and Email in settings.');
      return;
    }
    if (!readableFile || !systemFile) {
      alert('❌ Please select both files');
      return;
    }
    setUploading(true);
    // Use uploadBackup for both files (if needed, adapt to your logic)
    // Here, just upload the latest config (for generated backup)
    await uploadBackup(config);
    setUploading(false);
  };

  // New: Generate and upload latest backup
  const handleGenerateAndUpload = async () => {
    setStatus([]);
    const config = getCloudBackupConfigWithFallback();
    if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
      alert('❌ Please configure Script URL, Folder ID, and Email in settings.');
      return;
    }
    setUploading(true);
    setStatus([`Generating and uploading latest backup...`]);
    try {
      const result = await uploadBackup(config);
      if (result.success) {
        setStatus([`✅ Backup uploaded successfully!`,
          `Readable ZIP size: ${result.readableZipSize} bytes`,
          `System ZIP size: ${result.systemZipSize} bytes`,
          result.message
        ]);
      } else {
        setStatus([`❌ Upload failed: ${result.message}`]);
      }
    } catch (err) {
      setStatus([`❌ Upload error: ${err instanceof Error ? err.message : String(err)}`]);
    }
    setUploading(false);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-2">📤 POS Backup Uploader</h2>
      <input
        type="text"
        placeholder="Apps Script URL"
        className="w-full p-2 border mb-2"
        value={scriptUrl}
        onChange={e => setScriptUrl(e.target.value)}
      />
      <input
        type="text"
        placeholder="Google Drive Folder ID"
        className="w-full p-2 border mb-2"
        value={folderId}
        onChange={e => setFolderId(e.target.value)}
      />
      <input
        type="email"
        placeholder="Notification Email"
        className="w-full p-2 border mb-2"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <label className="block mb-1 font-semibold" htmlFor="readable-zip">Readable Backup (ZIP)</label>
      <input id="readable-zip" type="file" accept=".zip" onChange={e => setReadableFile(e.target.files?.[0] || null)} />

      <label className="block mt-4 mb-1 font-semibold" htmlFor="system-zip">System Backup (ZIP)</label>
      <input id="system-zip" type="file" accept=".zip" onChange={e => setSystemFile(e.target.files?.[0] || null)} />

      <button
        onClick={handleUpload}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        disabled={uploading}
      >
        🚀 Upload Both Backups
      </button>

      {}
      <button
        onClick={handleGenerateAndUpload}
        className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
        disabled={uploading}
      >
        🛡️ Generate and Upload Latest Backup
      </button>

      <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">
        {status.map((s, i) => <div key={i}>{s}</div>)}
      </div>
    </div>
  );
};

export default BackupUploader; 