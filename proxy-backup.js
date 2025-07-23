import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import FormData from 'form-data';

dotenv.config();

const app = express();
app.use(fileUpload()); // Enable multipart/form-data
app.use(express.json()); // Enable JSON parsing

const allowedOrigins = [process.env.ALLOWED_ORIGIN || 'http://localhost:8000'];
app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Proxy endpoint for backup upload service
app.post('/proxy', async (req, res) => {
  try {
    console.log('Proxy request received:', {
      targetUrl: req.body.targetUrl,
      action: req.body.action,
      hasZipFile: !!req.body.zipFile,
      hasSysZipFile: !!req.body.sysZipFile,
      email: req.body.email,
      driveFolderId: req.body.driveFolderId
    });

    if (!req.body.targetUrl) {
      return res.status(400).json({ error: 'Missing targetUrl in request body' });
    }

    let response;
    
    // For test requests, send JSON directly
    if (req.body.action === 'test') {
      console.log('Sending test request as JSON');
      response = await fetch(req.body.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: req.body.action,
          driveFolderId: req.body.driveFolderId,
          emailDestination: req.body.emailDestination,
          test: req.body.test
        })
      });
    } else {
      // For upload requests, use FormData
      console.log('Sending upload request as FormData');
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      // Add all fields from the request body
      Object.keys(req.body).forEach(key => {
        if (key !== 'targetUrl') {
          const value = req.body[key];
          
          // Handle binary data (ZIP files) properly
          if (key === 'zipFile' || key === 'sysZipFile') {
            // Convert base64 string back to Buffer for binary data
            if (typeof value === 'string' && value.length > 0) {
              try {
                const buffer = Buffer.from(value, 'base64');
                formData.append(key, buffer, {
                  filename: key === 'zipFile' ? 'readable_backup.zip' : 'system_backup.zip',
                  contentType: 'application/zip'
                });
                console.log(`Added ${key} as binary data, size: ${buffer.length} bytes`);
              } catch (error) {
                console.error(`Error converting ${key} to buffer:`, error);
                // Fallback to string if conversion fails
                formData.append(key, value);
              }
            } else {
              console.log(`Skipping empty ${key}`);
            }
          } else {
            // Convert other values to strings
            const stringValue = typeof value === 'boolean' ? value.toString() : 
                               typeof value === 'object' ? JSON.stringify(value) : 
                               String(value);
            formData.append(key, stringValue);
            console.log(`Added ${key} as string: ${stringValue.substring(0, 50)}...`);
          }
        }
      });

      console.log('FormData created, sending to Apps Script...');
      response = await fetch(req.body.targetUrl, {
        method: 'POST',
        body: formData
      });
    }

    const responseText = await response.text();
    console.log('Apps Script response status:', response.status);
    console.log('Apps Script response:', responseText);

    // Set the same status code as the Apps Script response
    res.status(response.status).send(responseText);
  } catch (err) {
    console.error('Simple proxy error:', err);
    res.status(500).json({error: 'Proxy error', details: err.message});
  }
});

app.post('/api/backup-upload', async (req, res) => {
  try {
    if (!req.files || !req.files.backupFile) {
      return res.status(400).json({ error: 'No backup file uploaded. Use field name "backupFile".' });
    }
    const backupFile = req.files.backupFile;
    // Prepare FormData for Apps Script
    const formData = new FormData();
    formData.append('backupFile', backupFile.data, backupFile.name);
    if (req.body.email) formData.append('email', req.body.email);
    if (req.body.filename) formData.append('filename', req.body.filename);
    if (req.body.mimeType) formData.append('mimeType', req.body.mimeType);
    // Forward to Apps Script
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    const data = await response.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({error: 'Proxy error', details: err.message});
  }
});

const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 