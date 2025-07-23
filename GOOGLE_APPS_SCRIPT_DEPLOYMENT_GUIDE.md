# Google Apps Script Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Open Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Sign in with your Google account
3. Click **"New Project"**

### 2. Copy the Code
1. Delete the default `Code.gs` file content
2. Copy the entire code from `google-apps-script-backup-handler.gs`
3. Paste it into the Apps Script editor
4. Save the project (Ctrl+S or Cmd+S)

### 3. Configure the Script
1. **Update the default values** at the top of the script:
   ```javascript
   const DEFAULT_DRIVE_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'; // Replace with your folder ID
   const DEFAULT_EMAIL_DESTINATION = 'your-email@gmail.com'; // Replace with your email
   ```

### 4. Get Your Google Drive Folder ID
1. Go to [drive.google.com](https://drive.google.com)
2. Create a new folder or use an existing one
3. Right-click on the folder → **"Share"**
4. Copy the link
5. The folder ID is the long string between `/folders/` and the next `/`
   - Example: `https://drive.google.com/drive/folders/1ABC123DEF456GHI789JKL` → Folder ID is `1ABC123DEF456GHI789JKL`

### 5. Deploy as Web App
1. Click **"Deploy"** → **"New deployment"**
2. Choose **"Web app"** as the type
3. Configure the settings:
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone`
4. Click **"Deploy"**
5. **Copy the Web app URL** (it should end with `/exec`)

### 6. Test the Deployment
1. Open the Web app URL in a browser
2. You should see a JSON response like:
   ```json
   {
     "success": true,
     "message": "Tech Plus POS Backup Handler - GET request received",
     "timestamp": "2025-07-20T...",
     "version": "1.0.0",
     "status": "operational"
   }
   ```

### 7. Configure Your TechPlus POS App
1. Open your TechPlus POS app
2. Go to **Settings** → **Backup**
3. Enter the following:
   - **Apps Script URL**: Your Web app URL (ends with `/exec`)
   - **Email**: Your email address
   - **Folder ID**: Your Google Drive folder ID (optional - leave empty for root folder)

### 8. Test the Backup Upload
1. In your TechPlus POS app, try uploading a backup
2. Check your Google Drive folder for the uploaded files
3. Check your email for the notification

## Troubleshooting

### If you get "No request data received":
1. Make sure the Apps Script is deployed as a **Web app**
2. Verify the URL ends with `/exec`
3. Check that "Execute as" is set to "Me"
4. Check that "Who has access" is set to "Anyone"

### If files don't upload to the correct folder:
1. Verify your folder ID is correct
2. Make sure you have access to the folder
3. Try leaving the folder ID empty to upload to root

### If email notifications don't work:
1. Make sure the email address is correct
2. Check your spam folder
3. Verify the email address has access to the Google Drive files

### If the proxy server shows errors:
1. Make sure the proxy server is running on port 8888
2. Check that the Apps Script URL is correct
3. Verify the proxy server can reach the Apps Script

## Security Notes

- The Apps Script will have access to your Google Drive and Gmail
- Only share the Web app URL with trusted applications
- The script will only upload files when you explicitly trigger a backup
- All uploaded files will be visible in your Google Drive

## Features

This Apps Script provides:
- ✅ **Backup file upload** to Google Drive
- ✅ **Email notifications** with file attachments
- ✅ **Multiple file support** (readable and system backups)
- ✅ **Error handling** and detailed logging
- ✅ **Base64 validation** for security
- ✅ **Flexible folder configuration**
- ✅ **Test endpoints** for debugging

## Support

If you encounter issues:
1. Check the Apps Script logs in the Google Apps Script editor
2. Verify the proxy server logs
3. Test the Apps Script URL directly in a browser
4. Ensure all URLs and IDs are correct 