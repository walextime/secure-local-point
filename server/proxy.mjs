import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';

const app = express();

// Enable JSON parsing
app.use(express.json());

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

    // Prepare FormData for Apps Script
    const formData = new FormData();
    
    // Add all fields from the request body
    Object.keys(req.body).forEach(key => {
      if (key !== 'targetUrl') {
        // Convert all values to strings to avoid FormData type errors
        const value = req.body[key];
        const stringValue = typeof value === 'boolean' ? value.toString() : 
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value);
        formData.append(key, stringValue);
      }
    });

    console.log('Forwarding request to:', req.body.targetUrl);
    console.log('FormData fields:', Object.keys(req.body).filter(key => key !== 'targetUrl'));

    // Forward to Apps Script
    const response = await fetch(req.body.targetUrl, {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('Apps Script response status:', response.status);
    console.log('Apps Script response:', responseText);

    // Set the same status code as the Apps Script response
    res.status(response.status).send(responseText);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({error: 'Proxy error', details: err.message});
  }
});

const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 