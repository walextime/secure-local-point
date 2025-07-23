import express from 'express';
import cors from 'cors';

// Dynamic HTTP client selection
let fetchClient = null;
let axiosClient = null;

// Try to load fetch (node-fetch@3) - ES module version
try {
  const nodeFetch = await import('node-fetch');
  fetchClient = nodeFetch.default;
  console.log('✅ node-fetch@3 loaded successfully');
} catch (error) {
  console.log('⚠️ node-fetch@3 not available, will use axios fallback');
}

// Try to load axios
try {
  const axios = await import('axios');
  axiosClient = axios.default;
  console.log('✅ axios loaded successfully');
} catch (error) {
  console.error('❌ axios not available, HTTP requests may fail');
}

const app = express();
const PORT = process.env.PORT || 888;

// CORS configuration for both development and production
const corsOptions = {
  origin: [
    'http://localhost:8000',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-production-domain.com', // Replace with your production domain
    'https://*.vercel.app',
    'https://*.netlify.app'
  ],
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Support large payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    clients: {
      fetch: fetchClient ? 'available' : 'unavailable',
      axios: axiosClient ? 'available' : 'unavailable'
    }
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    clients: {
      fetch: fetchClient ? 'available' : 'unavailable',
      axios: axiosClient ? 'available' : 'unavailable'
    }
  });
});

// Retry configuration
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_BASE = 1000; // 1 second

// Exponential backoff function
const getRetryDelay = (attempt) => {
  return RETRY_DELAY_BASE * Math.pow(2, attempt);
};

// Circuit breaker state
let circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  threshold: 5,
  timeout: 30000 // 30 seconds
};

// Circuit breaker logic
const isCircuitBreakerOpen = () => {
  if (circuitBreaker.state === 'OPEN') {
    const now = Date.now();
    if (now - circuitBreaker.lastFailure > circuitBreaker.timeout) {
      circuitBreaker.state = 'HALF_OPEN';
      return false;
    }
    return true;
  }
  return false;
};

const recordSuccess = () => {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'CLOSED';
};

const recordFailure = () => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.state = 'OPEN';
  }
};

// HTTP client wrapper with automatic fallback
const makeHttpRequest = async (url, options, attempt = 0) => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Making HTTP request (attempt ${attempt + 1})`);
  console.log(`[${requestId}] URL: ${url}`);
  console.log(`[${requestId}] Method: ${options.method || 'POST'}`);
  console.log(`[${requestId}] Headers:`, options.headers);

  // Check circuit breaker
  if (isCircuitBreakerOpen()) {
    throw new Error('Circuit breaker is OPEN - too many recent failures');
  }

  let error = null;

  // Try fetch first if available
  if (fetchClient && attempt === 0) {
    try {
      console.log(`[${requestId}] Attempting with fetch...`);
      const response = await fetchClient(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          ...options.headers
        },
        body: options.body || options.data,
        timeout: 30000
      });

      const responseText = await response.text();
      console.log(`[${requestId}] Fetch successful: ${response.status}`);
      
      recordSuccess();
      return {
        status: response.status,
        statusText: response.statusText,
        data: responseText,
        headers: Object.fromEntries(response.headers.entries()),
        client: 'fetch'
      };
    } catch (fetchError) {
      error = fetchError;
      console.error(`[${requestId}] Fetch failed:`, fetchError.message);
    }
  }

  // Fallback to axios
  if (axiosClient) {
    try {
      console.log(`[${requestId}] Attempting with axios...`);
      const response = await axiosClient({
        method: options.method || 'POST',
        url: url,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          ...options.headers
        },
        data: options.body || options.data,
        timeout: 30000,
        validateStatus: () => true // Don't throw on HTTP error status
      });

      console.log(`[${requestId}] Axios successful: ${response.status}`);
      
      recordSuccess();
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        client: 'axios'
      };
    } catch (axiosError) {
      error = axiosError;
      console.error(`[${requestId}] Axios failed:`, axiosError.message);
    }
  }

  // If both clients failed
  if (!fetchClient && !axiosClient) {
    throw new Error('No HTTP clients available (fetch or axios)');
  }

  throw error || new Error('All HTTP clients failed');
};

// Simple proxy endpoint for backup upload service
app.post('/proxy', async (req, res) => {
  try {
    console.log('Simple proxy request received:', {
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
    const FormData = (await import('form-data')).default;
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
    const response = await fetchClient(req.body.targetUrl, {
      method: 'POST',
      body: formData
    });

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

// Complex proxy endpoint (existing)
app.post('/api/proxy', async (req, res) => {
  const requestId = Date.now().toString();
  const startTime = Date.now();
  
  console.log(`[${requestId}] PROXY REQUEST STARTED`);
  console.log(`[${requestId}] Target URL: ${req.body.targetUrl}`);
  console.log(`[${requestId}] Request method: POST`);
  console.log(`[${requestId}] Request body keys: ${Object.keys(req.body).join(', ')}`);
  console.log(`[${requestId}] Request body size: ${JSON.stringify(req.body).length} characters`);
  
  try {
    const { targetUrl, formData, ...payload } = req.body;
    
    // Validation
    if (!targetUrl) {
      console.error(`[${requestId}] ERROR: Missing targetUrl`);
      return res.status(400).json({ 
        success: false,
        error: 'Missing targetUrl',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    if (!targetUrl.startsWith('https://')) {
      console.error(`[${requestId}] ERROR: Invalid URL - must use HTTPS`);
      return res.status(400).json({
        success: false,
        error: 'Invalid URL - must use HTTPS',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${requestId}] Validating target URL: ${targetUrl}`);
    if (!targetUrl.startsWith('https://script.google.com/')) {
      console.warn(`[${requestId}] WARNING: Target URL is not a Google Apps Script URL`);
    }

    // Prepare request data
    let requestBody;
    let headers = {};

    if (formData) {
      console.log(`[${requestId}] Processing FormData request`);
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof Object && value.type === 'file') {
          console.log(`[${requestId}] Processing file: ${key} (${value.name})`);
          const buffer = Buffer.from(value.data, 'base64');
          form.append(key, buffer, value.name);
        } else {
          console.log(`[${requestId}] Processing field: ${key}`);
          form.append(key, value);
        }
      });
      
      requestBody = form;
      headers = form.getHeaders();
      console.log(`[${requestId}] FormData headers:`, headers);
    } else {
      console.log(`[${requestId}] Processing JSON request`);
      headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      requestBody = JSON.stringify(payload);
      console.log(`[${requestId}] JSON payload preview:`, JSON.stringify(payload, null, 2).substring(0, 500));
    }

    // Retry logic with exponential backoff
    let lastError = null;
    
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[${requestId}] Making request to: ${targetUrl} (attempt ${attempt + 1}/${RETRY_ATTEMPTS + 1})`);
        
        const response = await makeHttpRequest(targetUrl, {
          method: 'POST',
          headers,
          body: requestBody
        }, attempt);
        
        const responseTime = Date.now() - startTime;
        console.log(`[${requestId}] RESPONSE RECEIVED`);
        console.log(`[${requestId}] Status: ${response.status} ${response.statusText}`);
        console.log(`[${requestId}] Response time: ${responseTime}ms`);
        console.log(`[${requestId}] Client used: ${response.client}`);
        console.log(`[${requestId}] Response headers:`, response.headers);
        
        const responseData = response.data;
        console.log(`[${requestId}] Response body length: ${responseData.length} characters`);
        console.log(`[${requestId}] Response body preview: ${responseData.substring(0, 200)}${responseData.length > 200 ? '...' : ''}`);
        
        // Parse response
        let data;
        try { 
          data = JSON.parse(responseData); 
          console.log(`[${requestId}] Parsed JSON response successfully`);
        } catch (parseError) { 
          console.log(`[${requestId}] Response is not JSON, treating as text`);
          data = responseData; 
        }
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:8000');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // Return response
        res.status(response.status).json({
          success: true,
          ...data,
          _proxy: {
            requestId,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            client: response.client,
            attempts: attempt + 1
          }
        });
        
        console.log(`[${requestId}] PROXY REQUEST COMPLETED SUCCESSFULLY`);
        return;
        
      } catch (error) {
        lastError = error;
        console.error(`[${requestId}] Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < RETRY_ATTEMPTS) {
          const delay = getRetryDelay(attempt);
          console.log(`[${requestId}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    recordFailure();
    const responseTime = Date.now() - startTime;
    
    console.error(`[${requestId}] ALL ATTEMPTS FAILED`);
    console.error(`[${requestId}] Final error:`, lastError.message);
    console.error(`[${requestId}] Error stack:`, lastError.stack);
    console.error(`[${requestId}] Total time: ${responseTime}ms`);
    
    res.status(500).json({ 
      success: false,
      error: 'Proxy error', 
      details: lastError.message,
      requestId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      errorType: lastError.constructor.name,
      attempts: RETRY_ATTEMPTS + 1
    });
    
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] PROXY ERROR:`);
    console.error(`[${requestId}] Error type: ${err.constructor.name}`);
    console.error(`[${requestId}] Error message: ${err.message}`);
    console.error(`[${requestId}] Error stack: ${err.stack}`);
    console.error(`[${requestId}] Response time: ${responseTime}ms`);
    
    res.status(500).json({ 
      success: false,
      error: 'Proxy error', 
      details: err.message,
      requestId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      errorType: err.constructor.name
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    details: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Robust Proxy Server started on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ HTTP Clients: fetch=${fetchClient ? '✅' : '❌'}, axios=${axiosClient ? '✅' : '❌'}`);
  console.log(`🔄 Retry attempts: ${RETRY_ATTEMPTS}`);
  console.log(`⚡ Circuit breaker: ${circuitBreaker.threshold} failures threshold`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
}); 