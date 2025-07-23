# Correct Apps Script URL and Deployment Guide

## ✅ Working Apps Script URLs

Based on our testing, these URLs are working correctly:

### URL 1 (Primary):
```
https://script.google.com/macros/s/AKfycbxgZwnhBEr_PGGzwqjKVtuwW1O28nSESi3uRg-uMXfZdZzMHg64R_MaeHKqdaTpB2rf/exec
```

### URL 2 (Alternative):
```
https://script.google.com/macros/s/AKfycbyQO_Pb2VE8wLPcMncMIB4DK14wMuvrV1nfKdbahfTKAMmZrzmKCJMQWsKNsNnu/exec
```

## 🔧 How to Fix the 401 Error

The 401 error you're seeing means the app is using an incorrect Apps Script URL. Here's how to fix it:

### Step 1: Update the Apps Script URL in Your App

1. Open your TechPlus POS app
2. Go to **Settings** → **Backup**
3. In the **Google Apps Script URL** field, enter one of the working URLs above
4. Make sure the URL ends with `/exec`

### Step 2: Verify Your Configuration

Your backup settings should look like this:

- **Google Apps Script URL**: `https://script.google.com/macros/s/AKfycbxgZwnhBEr_PGGzwqjKVtuwW1O28nSESi3uRg-uMXfZdZzMHg64R_MaeHKqdaTpB2rf/exec`
- **Google Drive Folder ID**: `1JcPf0LzShNZz1763I65KtFCP6HjJlGGR` (or your preferred folder)
- **Email Backup Destination**: `xavierfosso14@gmail.com`

### Step 3: Test the Connection

1. Click **"Test Connection"** button
2. You should see: ✅ **Connected**
3. If it still fails, check the browser console for detailed error messages

## 🚀 Deploy Your Own Apps Script (Optional)

If you want to deploy your own Apps Script:

1. **Copy the code** from `google-apps-script-backup-handler.gs`
2. **Create new Apps Script** at [script.google.com](https://script.google.com)
3. **Paste the code** and save
4. **Update default values**:
   ```javascript
   const DEFAULT_DRIVE_FOLDER_ID = 'YOUR_FOLDER_ID';
   const DEFAULT_EMAIL_DESTINATION = 'your-email@gmail.com';
   ```
5. **Deploy as Web App**:
   - Execute as: "Me"
   - Who has access: "Anyone"
6. **Copy the Web app URL** (ends with `/exec`)
7. **Use this URL** in your app

## 🔍 Troubleshooting

### If you still get 401 errors:

1. **Check the URL format**: Must start with `https://script.google.com/` and end with `/exec`
2. **Verify deployment**: The Apps Script must be deployed as a Web app
3. **Check permissions**: "Execute as" should be "Me" and "Who has access" should be "Anyone"
4. **Test the URL directly**: Open the URL in a browser to see if it returns JSON

### If the proxy server shows errors:

1. **Restart the proxy server**:
   ```bash
   node server/proxy.cjs
   ```
2. **Check if port 8888 is available**:
   ```bash
   netstat -ano | findstr :8888
   ```

## ✅ Verification

To verify everything is working:

1. **Test the Apps Script URL directly** in a browser
2. **Test the proxy server** with our test script
3. **Test the connection** from your app
4. **Try uploading a backup** to verify the complete flow

## 📧 Email Notifications

The Apps Script will send email notifications with:
- ✅ Backup file attachments
- ✅ Detailed upload reports
- ✅ Success/failure status
- ✅ File URLs and sizes

## 🔒 Security Notes

- The Apps Script has access to your Google Drive and Gmail
- Only use trusted Apps Script URLs
- The script only uploads files when you explicitly trigger a backup
- All uploaded files will be visible in your Google Drive folder 