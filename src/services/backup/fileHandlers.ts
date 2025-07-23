

export interface FileHandlerOptions {
  filename: string;
  contentType: string;
  data: Blob | string;
  size?: number;
}

export interface PreviewData {
  type: 'pdf' | 'image' | 'text' | 'json' | 'csv' | 'xlsx' | 'zip';
  content: string | Blob;
  filename: string;
  size: number;
}


export const previewFile = async (file: File): Promise<PreviewData> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const size = file.size;

  switch (extension) {
    case 'pdf': {
      return {
        type: 'pdf',
        content: file,
        filename: file.name,
        size
      };
    }

    case 'json': {
      const jsonText = await file.text();
      return {
        type: 'json',
        content: JSON.stringify(JSON.parse(jsonText), null, 2),
        filename: file.name,
        size
      };
    }

    case 'csv': {
      const csvText = await file.text();
      return {
        type: 'csv',
        content: csvText,
        filename: file.name,
        size
      };
    }

    case 'xlsx': {
      return {
        type: 'xlsx',
        content: file,
        filename: file.name,
        size
      };
    }

    case 'zip': {
      return {
        type: 'zip',
        content: file,
        filename: file.name,
        size
      };
    }

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif': {
      return {
        type: 'image',
        content: file,
        filename: file.name,
        size
      };
    }

    default: {
      const text = await file.text();
      return {
        type: 'text',
        content: text,
        filename: file.name,
        size
      };
    }
  }
};


export const downloadFile = async (options: FileHandlerOptions): Promise<void> => {
  try {
    let blob: Blob;
    
    if (typeof options.data === 'string') {
      blob = new Blob([options.data], { type: options.contentType });
    } else {
      blob = options.data;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};


export const printFile = async (options: FileHandlerOptions): Promise<void> => {
  try {
    const extension = options.filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf': {
        await printPDF(options.data as Blob);
        break;
      }
        
      case 'json':
      case 'csv':
      case 'txt': {
        await printText(options.data as string, options.filename);
        break;
      }
        
      case 'xlsx': {
        await printExcel(options.data as Blob, options.filename);
        break;
      }
        
      default:
        throw new Error(`Printing not supported for ${extension} files`);
    }
  } catch (error) {
    console.error('Error printing file:', error);
    throw new Error('Failed to print file');
  }
};


const printPDF = async (pdfBlob: Blob): Promise<void> => {
  const url = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  
  document.body.appendChild(iframe);
  
  iframe.onload = () => {
    try {
      iframe.contentWindow?.print();
    } catch (error) {
      console.error('Error printing PDF:', error);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    }
  };
};


const printText = async (text: string, filename: string): Promise<void> => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: monospace; font-size: 12px; line-height: 1.4; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .content { white-space: pre-wrap; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${filename}</h2>
        <p>Printed on ${new Date().toLocaleString()}</p>
      </div>
      <div class="content">${text}</div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};


const printExcel = async (excelBlob: Blob, filename: string): Promise<void> => {
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        .message { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .download-link { color: #007bff; text-decoration: none; }
        .download-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h2>${filename}</h2>
      <div class="message">
        <p>Excel files cannot be printed directly in the browser.</p>
        <p>Please download the file and open it in Microsoft Excel or Google Sheets to print.</p>
        <a href="#" class="download-link" onclick="window.close()">Close this window</a>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
};


export const generateBackupFile = async (
  data: Record<string, unknown>[],
  filename: string,
  format: 'json' | 'csv' | 'xlsx'
): Promise<File> => {
  let content: string | Blob;
  let contentType: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      break;
      
    case 'csv':
      content = convertToCSV(data);
      contentType = 'text/csv';
      break;
      
    case 'xlsx':
      content = await convertToExcel(data);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
      
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const blob = typeof content === 'string' 
    ? new Blob([content], { type: contentType })
    : content;

  return new File([blob], filename, { type: contentType });
};


const convertToCSV = (data: Record<string, unknown>[]): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};


const convertToExcel = async (data: Record<string, unknown>[]): Promise<Blob> => {
  
  
  const csv = convertToCSV(data);
  return new Blob([csv], { type: 'text/csv' });
};


export const extractZipFiles = async (zipBlob: Blob): Promise<{ name: string; content: Blob }[]> => {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipBlob);
    
    const files: { name: string; content: Blob }[] = [];
    
    for (const [filename, file] of Object.entries(zipContent.files)) {
      if (!file.dir) {
        const content = await file.async('blob');
        files.push({ name: filename, content });
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error extracting ZIP file:', error);
    throw new Error('Failed to extract ZIP file');
  }
};


export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


export const isValidFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}; 