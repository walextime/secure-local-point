const express = require('express');
const cors = require('cors');

const app = express();

// Enable JSON parsing with increased limit for large base64 data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true
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

// Test endpoint for debugging
app.post('/api/test', (req, res) => {
  console.log('Test endpoint called with:', req.body);
  res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoint for backup upload service
app.post('/proxy', async (req, res) => {
  try {
    console.log('=== PROXY REQUEST RECEIVED ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Target URL:', req.body.targetUrl);
    console.log('Action:', req.body.action);
    console.log('Has zipFile:', !!req.body.zipFile);
    console.log('Has sysZipFile:', !!req.body.sysZipFile);
    console.log('Email:', req.body.email);
    console.log('Email destination:', req.body.emailDestination);
    console.log('Drive folder ID:', req.body.driveFolderId);
    console.log('Zip file length:', req.body.zipFile ? req.body.zipFile.length : 'N/A');
    console.log('Sys zip file length:', req.body.sysZipFile ? req.body.sysZipFile.length : 'N/A');
    console.log('Timestamp:', req.body.timestamp);

    if (!req.body.targetUrl) {
      console.error('Missing targetUrl in request body');
      return res.status(400).json({ error: 'Missing targetUrl in request body' });
    }

    // Prepare data to send to Apps Script
    const appsScriptData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => key !== 'targetUrl')
    );
    
    console.log('=== SENDING TO APPS SCRIPT ===');
    console.log('Apps Script data keys:', Object.keys(appsScriptData));
    console.log('Apps Script data size:', JSON.stringify(appsScriptData).length, 'characters');

    // Forward to Apps Script with JSON format (Apps Script expects JSON)
    const response = await fetch(req.body.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appsScriptData)
    });

    const responseText = await response.text();
    console.log('=== APPS SCRIPT RESPONSE ===');
    console.log('Apps Script response status:', response.status);
    console.log('Apps Script response length:', responseText.length, 'characters');
    console.log('Apps Script response preview:', responseText.substring(0, 500));

    // Set the same status code as the Apps Script response
    res.status(response.status).send(responseText);
  } catch (err) {
    console.error('=== PROXY ERROR ===');
    console.error('Proxy error:', err);
    console.error('Error message:', err.message);
    res.status(500).json({error: 'Proxy error', details: err.message});
  }
});

const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 