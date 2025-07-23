# Cloud Proxy for TechPlusPOS Backup

## Features
- Node.js Express proxy for Google Apps Script backup
- CORS: allows http://localhost:8000, file://, and your production domain
- POST /proxy endpoint forwards payload to Google Apps Script
- Returns Apps Script JSON response, preserves status codes
- 50MB JSON body limit

## Usage (Local)
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the proxy:
   ```sh
   npm run start:proxy
   ```
3. Frontend fetch example:
   ```js
   fetch('http://localhost:8889/proxy', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({
       targetUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
       ...yourBackupPayload
     })
   })
   .then(res => res.json())
   .then(console.log)
   .catch(console.error);
   ```

## Deploy to Heroku
1. Commit all files to git.
2. Create a Heroku app:
   ```sh
   heroku create your-proxy-app
   ```
3. Deploy:
   ```sh
   git push heroku main
   ```
4. Your endpoint will be:
   ```
   https://your-proxy-app.herokuapp.com/proxy
   ```

## CORS
- Edit `server/proxy.cjs` to add your production domain to the allowedOrigins array.
- Supports `http://localhost:8000` and `file://` for local/offline use.

## Notes
- Make sure your frontend backup code sends the correct `targetUrl` and payload.
- For other cloud providers, deploy as a standard Node.js app using `server/proxy.cjs` as the entry point. 