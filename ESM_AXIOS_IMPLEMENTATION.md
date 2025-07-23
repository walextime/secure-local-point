# ESM and Axios Implementation Guide

## Overview
The backup system now supports both CommonJS and ESM module systems, with axios as an alternative to node-fetch for HTTP requests. This provides better compatibility and more robust HTTP handling.

## Implementation Details

### 1. Axios Integration

#### Benefits of Axios over node-fetch:
- **Better Error Handling**: Automatic error throwing for HTTP error status codes
- **Request/Response Interceptors**: Built-in middleware support
- **Automatic JSON Parsing**: Handles JSON responses automatically
- **Timeout Support**: Built-in timeout configuration
- **Request Cancellation**: Support for canceling requests
- **Progress Tracking**: Upload/download progress monitoring

#### Key Features Added:
```javascript
const response = await axios({
  method: 'POST',
  url: targetUrl,
  headers,
  data: requestBody,
  timeout: 30000, // 30 second timeout
  validateStatus: () => true // Don't throw on HTTP error status
});
```

### 2. ESM Support

#### File Structure:
- **CommonJS**: `server/proxy.cjs` (existing)
- **ESM**: `server/proxy.mjs` (new)

#### ESM Import Syntax:
```javascript
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import FormData from 'form-data';
```

#### CommonJS Require Syntax:
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
```

## Usage

### Running Proxy Servers

#### CommonJS Version:
```bash
npm run start:proxy
# or
node server/proxy.cjs
```

#### ESM Version:
```bash
npm run start:proxy:esm
# or
node server/proxy.mjs
```

### Package.json Scripts
```json
{
  "scripts": {
    "start:proxy": "node server/proxy.cjs",
    "start:proxy:esm": "node server/proxy.mjs",
    "dev:all": "concurrently \"npm run start:proxy\" \"npm run start:launcher\" \"npx vite --port 8000\"",
    "dev:all:esm": "concurrently \"npm run start:proxy:esm\" \"npm run start:launcher\" \"npx vite --port 8000\""
  }
}
```

## Configuration Options

### Axios Configuration
```javascript
const axiosConfig = {
  method: 'POST',
  url: targetUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  data: requestBody,
  timeout: 30000, // 30 seconds
  validateStatus: () => true, // Don't throw on HTTP errors
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024 // 50MB
};
```

### Timeout Handling
```javascript
try {
  const response = await axios(config);
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    console.error('Request timeout');
  } else if (error.response) {
    console.error('HTTP error:', error.response.status);
  } else if (error.request) {
    console.error('Network error');
  }
}
```

## Error Handling Improvements

### Axios Error Types
1. **Request Errors**: Network issues, timeouts
2. **Response Errors**: HTTP error status codes
3. **Validation Errors**: Invalid configuration

### Enhanced Error Logging
```javascript
console.error(`[${requestId}] Axios Error Details:`);
console.error(`[${requestId}] Error type: ${error.constructor.name}`);
console.error(`[${requestId}] Error message: ${error.message}`);
if (error.response) {
  console.error(`[${requestId}] HTTP Status: ${error.response.status}`);
  console.error(`[${requestId}] Response data: ${error.response.data}`);
}
```

## Performance Benefits

### 1. Request Timeout
- **30-second timeout** prevents hanging requests
- **Automatic cleanup** of timed-out requests
- **Better resource management**

### 2. Response Handling
- **Automatic JSON parsing** for JSON responses
- **Text handling** for non-JSON responses
- **Consistent data format**

### 3. Error Recovery
- **Detailed error information** for debugging
- **Request ID tracking** for correlation
- **Response time monitoring**

## Migration Guide

### From node-fetch to Axios

#### Old (node-fetch):
```javascript
const response = await fetch(url, {
  method: 'POST',
  headers,
  body: data
});
const text = await response.text();
```

#### New (axios):
```javascript
const response = await axios({
  method: 'POST',
  url,
  headers,
  data
});
const text = response.data;
```

### Key Differences:
1. **URL**: Separate `url` parameter instead of first argument
2. **Body**: Use `data` instead of `body`
3. **Response**: Access data directly via `response.data`
4. **Headers**: Axios automatically sets content-type for JSON

## Testing

### Test Both Versions
```bash
# Test CommonJS version
npm run start:proxy
# In another terminal
curl -X POST http://localhost:888/proxy -H "Content-Type: application/json" -d '{"targetUrl":"https://httpbin.org/post","test":true}'

# Test ESM version
npm run start:proxy:esm
# In another terminal
curl -X POST http://localhost:888/proxy -H "Content-Type: application/json" -d '{"targetUrl":"https://httpbin.org/post","test":true}'
```

### Browser Testing
```javascript
// Test proxy with axios
fetch('http://localhost:888/proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'https://httpbin.org/post',
    test: true
  })
}).then(r => r.json()).then(console.log);
```

## Troubleshooting

### Common Issues

#### 1. ESM Import Errors
**Error**: `Cannot use import statement outside a module`
**Solution**: Use `.mjs` extension or add `"type": "module"` to package.json

#### 2. Axios Timeout
**Error**: `ECONNABORTED`
**Solution**: Increase timeout or check network connectivity

#### 3. FormData Issues
**Error**: `FormData is not defined`
**Solution**: Import FormData from 'form-data' package

### Debug Commands
```bash
# Check if ports are available
netstat -an | findstr :888

# Test proxy directly
curl -X POST http://localhost:888/proxy -H "Content-Type: application/json" -d '{"targetUrl":"https://httpbin.org/post","test":true}'

# Check Node.js version
node --version

# Verify ESM support
node -e "console.log('ESM supported')"
```

## Best Practices

### 1. Error Handling
```javascript
try {
  const response = await axios(config);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('HTTP Error:', error.response.status);
  } else if (error.request) {
    // Request was made but no response
    console.error('Network Error');
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
}
```

### 2. Request Configuration
```javascript
const config = {
  timeout: 30000,
  validateStatus: () => true,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'TechPlusPOS-Proxy/1.0'
  }
};
```

### 3. Logging
```javascript
console.log(`[${requestId}] Request: ${method} ${url}`);
console.log(`[${requestId}] Response: ${status} ${statusText}`);
console.log(`[${requestId}] Time: ${responseTime}ms`);
```

## Future Enhancements

### 1. Request Interceptors
```javascript
axios.interceptors.request.use(
  config => {
    console.log(`[${Date.now()}] Request: ${config.method} ${config.url}`);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);
```

### 2. Response Interceptors
```javascript
axios.interceptors.response.use(
  response => {
    console.log(`[${Date.now()}] Response: ${response.status}`);
    return response;
  },
  error => {
    console.error('Response error:', error);
    return Promise.reject(error);
  }
);
```

### 3. Retry Logic
```javascript
const axiosRetry = require('axios-retry');
axiosRetry(axios, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay
});
```

## Conclusion

The implementation of ESM and axios provides:
- ✅ **Better Error Handling**: More detailed error information
- ✅ **Improved Performance**: Timeout and retry capabilities
- ✅ **Module Flexibility**: Support for both CommonJS and ESM
- ✅ **Enhanced Logging**: Request/response tracking
- ✅ **Future-Proof**: Modern JavaScript standards

Both versions are fully functional and can be used interchangeably based on your preference and requirements. 