# Error Handling Guide for Backup System

## Overview
This guide helps you identify and resolve issues with the backup system. The system now includes comprehensive logging and error reporting to help diagnose problems quickly.

## Logging System

### Request IDs
Every request gets a unique timestamp-based ID for tracking:
```
[1703123456789] PROXY REQUEST STARTED
[1703123456789] Target URL: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Log Levels
- **INFO**: Normal operations (request start, success)
- **WARN**: Potential issues (non-standard URLs)
- **ERROR**: Actual errors (failed requests, validation errors)

## Common Error Scenarios

### 1. Proxy Server Not Running
**Symptoms:**
- Frontend shows "Connection failed" or "Network error"
- Browser console shows "Failed to fetch"

**Error Messages:**
```
❌ Proxy connection failed: Failed to fetch
Check if proxy server is running on port 888
```

**Solutions:**
1. Start proxy server: `npm run start:proxy`
2. Check if port 888 is available: `netstat -an | findstr :888`
3. Kill existing process on port 888 if needed

### 2. Invalid Google Apps Script URL
**Symptoms:**
- Connection test fails immediately
- Validation error in logs

**Error Messages:**
```
❌ Invalid Google Apps Script URL format. URL must start with https://script.google.com/
```

**Solutions:**
1. Ensure URL starts with `https://script.google.com/`
2. Verify the script is deployed as web app
3. Check script permissions (execute as: me, who has access: anyone)

### 3. Missing Required Fields
**Symptoms:**
- Validation error before request is sent
- Clear field-specific error message

**Error Messages:**
```
❌ Missing required fields: Script URL, Folder ID, Email
```

**Solutions:**
1. Fill in all required fields in backup settings
2. Verify Google Drive folder ID is correct
3. Ensure email address is valid

### 4. Google Apps Script Errors
**Symptoms:**
- Proxy receives response but Google Apps Script fails
- Error message from Google Apps Script

**Error Messages:**
```
❌ Upload failed: Script execution failed
```

**Solutions:**
1. Check Google Apps Script logs in Google Cloud Console
2. Verify script has proper error handling
3. Test script directly in Google Apps Script editor

### 5. Network/Connectivity Issues
**Symptoms:**
- Timeout errors
- Connection refused
- DNS resolution failures

**Error Messages:**
```
❌ Upload failed: Network timeout
❌ Upload failed: Connection refused
```

**Solutions:**
1. Check internet connection
2. Verify firewall settings
3. Test with different network

### 6. File Size Issues
**Symptoms:**
- Large backup files fail to upload
- Timeout during file transfer

**Error Messages:**
```
❌ Upload failed: Request entity too large
```

**Solutions:**
1. Reduce backup data size
2. Split large backups into smaller chunks
3. Check Google Apps Script execution time limits

## Debugging Steps

### Step 1: Check Proxy Logs
```bash
# Start proxy with verbose logging
npm run start:proxy

# Look for request IDs and error details
[1703123456789] PROXY ERROR:
[1703123456789] Error type: TypeError
[1703123456789] Error message: fetch failed
[1703123456789] Error stack: ...
```

### Step 2: Check Frontend Console
Open browser developer tools and look for:
- Network tab: Request/response details
- Console tab: Error messages and logs
- Application tab: Local storage and session data

### Step 3: Test Individual Components

#### Test Proxy Connection
```javascript
// In browser console
fetch('http://localhost:888/proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    action: 'test'
  })
}).then(r => r.text()).then(console.log)
```

#### Test Google Apps Script Directly
```javascript
// Test script endpoint directly (may have CORS issues)
fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'test' })
}).then(r => r.text()).then(console.log)
```

### Step 4: Validate Configuration
1. **Script URL**: Must start with `https://script.google.com/`
2. **Folder ID**: Must be valid Google Drive folder ID
3. **Email**: Must be valid email address
4. **Proxy**: Must be running on port 888

## Error Response Format

### Successful Response
```json
{
  "success": true,
  "message": "Backup uploaded successfully!",
  "_proxy": {
    "requestId": "1703123456789",
    "responseTime": "1234ms",
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

### Error Response
```json
{
  "error": "Proxy error",
  "details": "fetch failed",
  "requestId": "1703123456789",
  "responseTime": "5000ms",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "errorType": "TypeError"
}
```

## Troubleshooting Checklist

### Before Starting
- [ ] Proxy server is running on port 888
- [ ] Frontend is running on port 8000
- [ ] Internet connection is stable
- [ ] Google Apps Script is deployed and accessible

### During Backup
- [ ] Check proxy logs for request details
- [ ] Monitor browser console for errors
- [ ] Verify file sizes are reasonable
- [ ] Check Google Apps Script execution logs

### After Error
- [ ] Copy request ID from logs
- [ ] Check proxy response details
- [ ] Verify Google Apps Script logs
- [ ] Test with smaller data set

## Common Solutions

### Proxy Issues
```bash
# Kill existing process on port 888
netstat -ano | findstr :888
taskkill /PID <PID> /F

# Start proxy server
npm run start:proxy
```

### Google Apps Script Issues
1. Open Google Apps Script editor
2. Check execution logs
3. Test function directly
4. Verify deployment settings

### Network Issues
1. Test internet connection
2. Check firewall settings
3. Try different network
4. Use VPN if needed

## Getting Help

### Information to Provide
1. **Request ID**: From proxy logs
2. **Error Message**: Exact error text
3. **Steps to Reproduce**: What you were doing
4. **Configuration**: Script URL, folder ID, email
5. **Environment**: Browser, OS, network

### Log Locations
- **Proxy Logs**: Terminal where proxy server is running
- **Frontend Logs**: Browser developer console
- **Google Apps Script Logs**: Google Cloud Console

### Testing Tools
- **TestProxy Component**: Built-in testing interface
- **Browser Console**: Manual testing commands
- **Network Tab**: Request/response inspection
- **Google Apps Script Editor**: Direct script testing

## Prevention Tips

1. **Regular Testing**: Test backup system weekly
2. **Monitor Logs**: Check proxy logs regularly
3. **Update Scripts**: Keep Google Apps Script updated
4. **Backup Configuration**: Save working settings
5. **Document Changes**: Note any configuration changes

## Emergency Procedures

### If Backup System Completely Fails
1. Export data manually from database
2. Use alternative backup method
3. Contact support with full logs
4. Restore from previous backup

### If Proxy Server Crashes
1. Restart proxy server
2. Check for port conflicts
3. Verify dependencies are installed
4. Check system resources

### If Google Apps Script Fails
1. Check Google Apps Script quotas
2. Verify script permissions
3. Test script in editor
4. Redeploy script if needed 