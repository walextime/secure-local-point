// Tech Plus POS Backup Handler
// Google Apps Script for handling backup uploads to Google Drive and email notifications

// Configuration - these are fallbacks only
const DEFAULT_DRIVE_FOLDER_ID = '1JcPf0LzShNZz1763I65KtFCP6HjJlGGR'; // Updated to match app configuration
const DEFAULT_EMAIL_DESTINATION = 'xavierfosso14@gmail.com'; // Add your actual email here

/**
 * SMS Configuration and Functions
 */
const SMS_CONFIG = {
  twilio: {
    accountSid: '', // Will be set from request
    authToken: '',  // Will be set from request
    fromNumber: '', // Will be set from request
    baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/'
  },
  nexmo: {
    apiKey: '',     // Will be set from request
    apiSecret: '',  // Will be set from request
    fromNumber: '', // Will be set from request
    baseUrl: 'https://rest.nexmo.com/sms/json'
  },
  awsSns: {
    accessKeyId: '',     // Will be set from request
    secretAccessKey: '', // Will be set from request
    region: 'us-east-1', // Will be set from request
    baseUrl: 'https://sns.us-east-1.amazonaws.com/'
  }
};

/**
 * Send SMS using configured provider
 */
function sendSMS(provider, config, toNumber, message) {
  try {
    console.log(`=== SENDING SMS VIA ${provider.toUpperCase()} ===`);
    console.log('To:', toNumber);
    console.log('Message length:', message.length);
    console.log('Message preview:', message.substring(0, 100) + '...');
    
    let response;
    
    switch (provider.toLowerCase()) {
      case 'twilio':
        response = sendSMSViaTwilio(config, toNumber, message);
        break;
      case 'nexmo':
        response = sendSMSViaNexmo(config, toNumber, message);
        break;
      case 'aws-sns':
        response = sendSMSViaAWSSNS(config, toNumber, message);
        break;
      case 'custom':
        response = sendSMSViaCustom(config, toNumber, message);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
    
    console.log('SMS response:', response);
    return { success: true, provider, message: 'SMS sent successfully' };
    
  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, provider, error: error.message };
  }
}

/**
 * Send SMS via Twilio
 */
function sendSMSViaTwilio(config, toNumber, message) {
  const url = `${SMS_CONFIG.twilio.baseUrl}${config.accountSid}/Messages.json`;
  const payload = {
    'To': toNumber,
    'From': config.fromNumber,
    'Body': message
  };
  
  const options = {
    'method': 'post',
    'headers': {
      'Authorization': 'Basic ' + Utilities.base64Encode(config.accountSid + ':' + config.authToken),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': payload
  };
  
  return UrlFetchApp.fetch(url, options);
}

/**
 * Send SMS via Vonage (Nexmo)
 */
function sendSMSViaNexmo(config, toNumber, message) {
  const payload = {
    'api_key': config.apiKey,
    'api_secret': config.apiSecret,
    'to': toNumber,
    'from': config.fromNumber,
    'text': message
  };
  
  const options = {
    'method': 'post',
    'payload': payload
  };
  
  return UrlFetchApp.fetch(SMS_CONFIG.nexmo.baseUrl, options);
}

/**
 * Send SMS via AWS SNS
 */
function sendSMSViaAWSSNS(config, toNumber, message) {
  // This is a simplified version - AWS SNS requires AWS SDK or complex signing
  const payload = {
    'Action': 'Publish',
    'Version': '2010-03-31',
    'Message': message,
    'PhoneNumber': toNumber
  };
  
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'AWS4-HMAC-SHA256' // Simplified - would need proper AWS signing
    },
    'payload': payload
  };
  
  return UrlFetchApp.fetch(`${SMS_CONFIG.awsSns.baseUrl}`, options);
}

/**
 * Send SMS via Custom API
 */
function sendSMSViaCustom(config, toNumber, message) {
  const url = config.apiUrl || '';
  const payload = {
    'to': toNumber,
    'message': message,
    'api_key': config.apiKey
  };
  
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    'payload': JSON.stringify(payload)
  };
  
  return UrlFetchApp.fetch(url, options);
}

/**
 * Generate SMS message for backup status
 */
function generateSMSMessage(data, format = 'summary') {
  const timestamp = new Date().toLocaleString();
  
  if (format === 'summary') {
    return `TechPlus POS Backup: ${data.success ? '✅ Success' : '❌ Failed'} - ${timestamp}`;
  } else {
    // Detailed format
    let message = `TechPlus POS Backup Report\n`;
    message += `Status: ${data.success ? 'SUCCESS' : 'FAILED'}\n`;
    message += `Time: ${timestamp}\n`;
    
    if (data.results && data.results.length > 0) {
      message += `Files: ${data.results.length}\n`;
      data.results.forEach(result => {
        message += `${result.success ? '✅' : '❌'} ${result.name}\n`;
      });
    }
    
    if (data.message) {
      message += `Details: ${data.message.substring(0, 50)}...`;
    }
    
    return message;
  }
}

/**
 * Generate SMS message for daily report
 */
function generateDailyReportSMS(data, format = 'summary') {
  const timestamp = new Date().toLocaleString();
  
  if (format === 'summary') {
    return `📊 Daily Report: $${data.totalRevenue || 0} revenue, ${data.totalTransactions || 0} transactions - ${timestamp}`;
  } else {
    // Detailed format with enhanced metrics
    let message = `📊 TechPlus POS Daily Report\n`;
    message += `Date: ${timestamp}\n`;
    message += `💰 Revenue: $${data.totalRevenue || 0}\n`;
    message += `📈 Transactions: ${data.totalTransactions || 0}\n`;
    message += `👥 Customers: ${data.totalCustomers || 0}\n`;
    message += `📦 Products: ${data.totalProducts || 0}\n`;
    message += `💸 Net Cash Flow: $${data.netCashFlow || 0}\n`;
    message += `🚨 Alerts: ${data.alerts?.length || 0}`;
    
    return message;
  }
}

/**
 * Enhanced FormData parser that handles binary data properly
 */
function parseFormDataEnhanced(contents) {
  const data = {};
  
  console.log('=== Parsing FormData contents ===');
  console.log('Contents length:', contents.length);
  console.log('First 500 chars:', contents.substring(0, 500));
  
  // Find the boundary
  const boundaryMatch = contents.match(/boundary=([^\r\n]+)/);
  if (!boundaryMatch) {
    console.error('No boundary found in FormData');
    throw new Error('No boundary found in FormData');
  }
  
  const boundary = '--' + boundaryMatch[1];
  console.log('Boundary:', boundary);
  
  // Split by boundary
  const parts = contents.split(boundary);
  console.log('Number of parts:', parts.length);
  
  for (let i = 1; i < parts.length - 1; i++) { // Skip first and last parts
    const part = parts[i];
    console.log(`Processing part ${i}:`);
    console.log('Part length:', part.length);
    console.log('Part preview:', part.substring(0, 200));
    
    // Extract field name
    const nameMatch = part.match(/name="([^"]+)"/);
    if (!nameMatch) {
      console.log('No name found in part, skipping');
      continue;
    }
    
    const fieldName = nameMatch[1];
    console.log('Field name:', fieldName);
    
    // Check if this is a file field
    const filenameMatch = part.match(/filename="([^"]+)"/);
    const isFile = !!filenameMatch;
    
    if (isFile) {
      console.log('This is a file field, filename:', filenameMatch[1]);
      // For file fields, extract the binary data
      const dataStart = part.indexOf('\r\n\r\n');
      if (dataStart !== -1) {
        const fileData = part.substring(dataStart + 4);
        // Remove trailing \r\n if present
        const cleanData = fileData.replace(/\r\n$/, '');
        data[fieldName] = cleanData;
        console.log(`Saved file ${fieldName}, data length: ${cleanData.length}`);
      }
    } else {
      // For text fields, extract the value
      const dataStart = part.indexOf('\r\n\r\n');
      if (dataStart !== -1) {
        const fieldValue = part.substring(dataStart + 4);
        // Remove trailing \r\n if present
        const cleanValue = fieldValue.replace(/\r\n$/, '');
        data[fieldName] = cleanValue;
        console.log(`Saved text field ${fieldName}: ${cleanValue.substring(0, 50)}...`);
      }
    }
  }
  
  console.log('Final parsed fields:', Object.keys(data));
  return data;
}

/**
 * Alternative FormData parser for when the standard parsing fails
 */
function parseFormDataAlternative(contents) {
  const data = {};
  
  console.log('=== Using alternative FormData parser ===');
  console.log('Contents length:', contents.length);
  
  try {
    // Try to extract data using a simpler approach
    const lines = contents.split('\r\n');
    let currentField = null;
    let currentData = '';
    let inData = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for field name
      const nameMatch = line.match(/name="([^"]+)"/);
      if (nameMatch) {
        // Save previous field if exists
        if (currentField && currentData) {
          data[currentField] = currentData.trim();
          console.log(`Saved field ${currentField} with length: ${currentData.length}`);
        }
        
        currentField = nameMatch[1];
        currentData = '';
        inData = false;
        continue;
      }
      
      // Look for start of data (empty line after headers)
      if (line === '' && currentField && !inData) {
        inData = true;
        continue;
      }
      
      // Collect data
      if (inData && currentField) {
        currentData += line + '\r\n';
      }
    }
    
    // Save last field
    if (currentField && currentData) {
      data[currentField] = currentData.trim();
      console.log(`Saved final field ${currentField} with length: ${currentData.length}`);
    }
    
    console.log('Alternative parser found fields:', Object.keys(data));
    return data;
    
  } catch (error) {
    console.error('Alternative parser failed:', error);
    throw error;
  }
}

/**
 * Handle test connection requests
 */
function handleTestRequest(data) {
  try {
    console.log('Processing test request');
    
    const testResult = {
      success: true,
      message: 'Connection test successful',
      timestamp: new Date().toISOString(),
      data: data.data || {},
      folderId: data.driveFolderId || DEFAULT_DRIVE_FOLDER_ID,
      emailDestination: data.emailDestination || data.email || DEFAULT_EMAIL_DESTINATION
    };
    
    return createResponse(true, 'Connection test successful', testResult);
      
  } catch (error) {
    console.error('Test request failed:', error);
    return createResponse(false, 'Test failed: ' + error.message);
  }
}

/**
 * Handle backup upload requests
 */
function handleBackupUpload(data) {
  try {
    console.log('=== Processing backup upload ===');
    console.log('Upload data keys:', Object.keys(data));
    
    const results = [];
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Use the folder ID from the request or fall back to the configured one
    const folderId = data.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    console.log('Using folder ID:', folderId);
    
    // Get email destination
    const emailAddress = data.emailDestination || data.email || DEFAULT_EMAIL_DESTINATION;
    console.log('Using email address:', emailAddress);
    
    // Process readable backup ZIP
    if (data.zipFile) {
      try {
        console.log('Processing zipFile...');
        console.log('zipFile data length:', data.zipFile.length);
        console.log('zipFile data preview:', data.zipFile.substring(0, 100));
        
        // Validate base64 data
        if (!isValidBase64(data.zipFile)) {
          throw new Error('Invalid base64 data for zipFile');
        }
        
        // Create blob from the binary data
        const zipBytes = Utilities.base64Decode(data.zipFile);
        const zipBlob = Utilities.newBlob(zipBytes);
        zipBlob.setName('readable_backup.zip');
        zipBlob.setContentType('application/zip');
        
        const zipName = `readable_backup_${timestamp}.zip`;
        console.log('Creating file:', zipName);
        
        // Save to Google Drive
        const driveFile = DriveApp.createFile(zipBlob);
        driveFile.setName(zipName);
        
        // Move to specified folder
        if (folderId && folderId.trim() !== '') {
          try {
          const folder = DriveApp.getFolderById(folderId);
          folder.addFile(driveFile);
          DriveApp.getRootFolder().removeFile(driveFile);
          console.log(`Moved file to folder: ${folderId}`);
          } catch (error) {
            console.error(`Failed to move file to folder ${folderId}:`, error);
            console.log('File will remain in root folder');
          }
        } else {
          console.log('No folder ID specified, file will remain in root folder');
        }
        
        results.push({
          name: zipName,
          success: true,
          fileId: driveFile.getId(),
          fileUrl: driveFile.getUrl(),
          size: zipBlob.getBytes().length
        });
        
        console.log(`✅ Uploaded readable backup: ${zipName}`);
      } catch (error) {
        console.error(`❌ Upload failed for readable backup:`, error);
        results.push({ name: 'readable_backup.zip', success: false, error: error.message });
      }
    }
    
    // Process system backup ZIP
    if (data.sysZipFile) {
      try {
        console.log('Processing sysZipFile...');
        console.log('sysZipFile data length:', data.sysZipFile.length);
        console.log('sysZipFile data preview:', data.sysZipFile.substring(0, 100));
        
        // Validate base64 data
        if (!isValidBase64(data.sysZipFile)) {
          throw new Error('Invalid base64 data for sysZipFile');
        }
        
        // Create blob from the binary data
        const sysZipBytes = Utilities.base64Decode(data.sysZipFile);
        const sysZipBlob = Utilities.newBlob(sysZipBytes);
        sysZipBlob.setName('system_backup.zip');
        sysZipBlob.setContentType('application/zip');
        
        const sysZipName = `system_backup_${timestamp}.zip`;
        console.log('Creating file:', sysZipName);
        
        // Save to Google Drive
        const driveFile = DriveApp.createFile(sysZipBlob);
        driveFile.setName(sysZipName);
        
        // Move to specified folder
        if (folderId && folderId.trim() !== '') {
          try {
          const folder = DriveApp.getFolderById(folderId);
          folder.addFile(driveFile);
          DriveApp.getRootFolder().removeFile(driveFile);
          console.log(`Moved file to folder: ${folderId}`);
          } catch (error) {
            console.error(`Failed to move file to folder ${folderId}:`, error);
            console.log('File will remain in root folder');
          }
        } else {
          console.log('No folder ID specified, file will remain in root folder');
        }
        
        results.push({
          name: sysZipName,
          success: true,
          fileId: driveFile.getId(),
          fileUrl: driveFile.getUrl(),
          size: sysZipBlob.getBytes().length
        });
        
        console.log(`✅ Uploaded system backup: ${sysZipName}`);
      } catch (error) {
        console.error(`❌ Upload failed for system backup:`, error);
        results.push({ name: 'system_backup.zip', success: false, error: error.message });
      }
    }
    
    // Send email notification
    let emailSent = false;
    if (emailAddress) {
      try {
        console.log('Starting email notification process...');
        console.log(`Email address: ${emailAddress}`);
        
        const emailSubject = `Tech Plus POS Backup - ${timestamp}`;
        console.log(`Email subject: ${emailSubject}`);
        
        let emailBody = `Tech Plus POS Backup Report\n\n`;
        emailBody += `Date: ${new Date().toLocaleString()}\n\n`;
        emailBody += `Backup Files:\n`;
        
        const attachments = [];
        console.log(`Processing ${results.length} results for email...`);
        
        results.forEach((result, index) => {
          console.log(`Processing result ${index + 1}: ${result.name} - Success: ${result.success}`);
          
          if (result.success) {
            emailBody += `✅ ${result.name}\n`;
            emailBody += `   - File ID: ${result.fileId}\n`;
            emailBody += `   - URL: ${result.fileUrl}\n`;
            emailBody += `   - Size: ${(result.size / 1024).toFixed(2)} KB\n\n`;
            
            // Add file as attachment
            try {
              const file = DriveApp.getFileById(result.fileId);
              attachments.push(file.getBlob());
              console.log(`Added attachment: ${result.name}`);
            } catch (error) {
              console.error(`Failed to add attachment ${result.name}:`, error);
            }
          } else {
            emailBody += `❌ ${result.name}\n`;
            emailBody += `   - Error: ${result.error}\n\n`;
          }
        });
        
        emailBody += `\nBackup completed at: ${new Date().toLocaleString()}\n`;
        emailBody += `Total files processed: ${results.length}\n`;
        emailBody += `Successful uploads: ${results.filter(r => r.success).length}\n`;
        emailBody += `Failed uploads: ${results.filter(r => !r.success).length}\n`;
        
        // Send the email
        if (attachments.length > 0) {
          GmailApp.sendEmail(emailAddress, emailSubject, emailBody, {
            attachments: attachments
          });
        } else {
          GmailApp.sendEmail(emailAddress, emailSubject, emailBody);
        }
        
        emailSent = true;
        console.log('✅ Email notification sent successfully');
        
      } catch (emailError) {
        console.error('❌ Email notification failed:', emailError);
        emailSent = false;
      }
    } else {
      console.log('No email address provided, skipping email notification');
    }
    
    // Send SMS notification
    let smsSent = false;
    if (data.smsEnabled && data.smsPhoneNumber && data.smsProvider && data.smsApiKey) {
      try {
        console.log('Starting SMS notification process...');
        console.log(`SMS Provider: ${data.smsProvider}`);
        console.log(`Phone Number: ${data.smsPhoneNumber}`);
        
        // Prepare SMS configuration based on provider
        let smsConfig = {};
        switch (data.smsProvider.toLowerCase()) {
          case 'twilio':
            smsConfig = {
              accountSid: data.smsApiKey,
              authToken: data.smsApiSecret || data.smsApiKey,
              fromNumber: data.smsFromNumber || ''
            };
            break;
          case 'nexmo':
            smsConfig = {
              apiKey: data.smsApiKey,
              apiSecret: data.smsApiSecret || data.smsApiKey,
              fromNumber: data.smsFromNumber || ''
            };
            break;
          case 'aws-sns':
            smsConfig = {
              accessKeyId: data.smsApiKey,
              secretAccessKey: data.smsApiSecret || data.smsApiKey,
              region: data.smsRegion || 'us-east-1'
            };
            break;
          case 'custom':
            smsConfig = {
              apiKey: data.smsApiKey,
              apiUrl: data.smsApiUrl || ''
            };
            break;
        }
        
        // Generate SMS message
        const smsData = {
          success: results.some(r => r.success),
          results: results,
          message: `Successfully uploaded ${results.filter(r => r.success).length} file(s)`
        };
        
        const smsMessage = generateSMSMessage(smsData, data.smsFormat || 'summary');
        
        // Send SMS
        const smsResult = sendSMS(data.smsProvider, smsConfig, data.smsPhoneNumber, smsMessage);
        
        if (smsResult.success) {
          smsSent = true;
          console.log('✅ SMS notification sent successfully');
        } else {
          console.error('❌ SMS notification failed:', smsResult.error);
        }
        
      } catch (smsError) {
        console.error('❌ SMS notification failed:', smsError);
        smsSent = false;
      }
    } else {
      console.log('SMS notifications disabled or missing configuration');
    }
    
    // Check if any files were uploaded successfully
    const successfulUploads = results.filter(r => r.success);
    const failedUploads = results.filter(r => !r.success);
    
    if (successfulUploads.length > 0) {
      console.log(`✅ Backup upload completed successfully`);
      console.log(`   - Successful uploads: ${successfulUploads.length}`);
      console.log(`   - Failed uploads: ${failedUploads.length}`);
      console.log(`   - Email sent: ${emailSent}`);
      console.log(`   - SMS sent: ${smsSent}`);
      
      return createResponse(true, `Successfully uploaded ${successfulUploads.length} file(s)`, {
        timestamp: timestamp,
        results: results,
        emailSent: emailSent,
        smsSent: smsSent,
        successfulCount: successfulUploads.length,
        failedCount: failedUploads.length
      });
    } else {
      console.log(`❌ No files were uploaded successfully`);
      return createResponse(false, 'No files were uploaded successfully', {
        timestamp: timestamp,
        results: results,
        emailSent: emailSent,
        smsSent: smsSent,
        successfulCount: 0,
        failedCount: results.length
      });
    }
    
  } catch (error) {
    console.error('Backup upload processing failed:', error);
    return createResponse(false, 'Backup upload failed: ' + error.message);
  }
}

/**
 * Handle SMS test requests
 */
function handleSMSTest(data) {
  try {
    console.log('Processing SMS test request');
    
    const toNumber = data.toNumber || 'YOUR_PHONE_NUMBER'; // Replace with actual phone number
    const message = data.message || 'This is a test SMS message from Tech Plus POS Backup Handler.';
    
    const smsProvider = data.smsProvider || 'twilio'; // Default to Twilio
    const config = {
      accountSid: data.twilioAccountSid || '',
      authToken: data.twilioAuthToken || '',
      fromNumber: data.twilioFromNumber || '',
      apiKey: data.nexmoApiKey || '',
      apiSecret: data.nexmoApiSecret || '',
      region: data.awsRegion || 'us-east-1',
      baseUrl: data.customApiUrl || ''
    };
    
    const smsResult = sendSMS(smsProvider, config, toNumber, message);
    
    if (smsResult.success) {
      return createResponse(true, `SMS sent successfully via ${smsResult.provider} to ${toNumber}`, {
        provider: smsResult.provider,
        toNumber: toNumber,
        message: message,
        timestamp: new Date().toISOString()
      });
    } else {
      return createResponse(false, `SMS failed via ${smsResult.provider} to ${toNumber}: ${smsResult.error}`, {
        provider: smsResult.provider,
        toNumber: toNumber,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('SMS test failed:', error);
    return createResponse(false, 'SMS test failed: ' + error.message);
  }
}

/**
 * Validate base64 string
 */
function isValidBase64(str) {
  try {
    // Check if string is valid base64
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    // Base64 should only contain valid characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    // Try to decode a small portion to test
    const testBytes = Utilities.base64Decode(str.substring(0, 100));
    return testBytes.length > 0;
    
  } catch (error) {
    console.error('Base64 validation failed:', error);
    return false;
  }
}

/**
 * Create a JSON response
 */
function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  console.log('Creating response:', response);
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle GET requests (for testing and health checks)
 */
function doGet(e) {
  try {
    console.log('=== Received GET request ===');
    console.log('Query parameters:', e.parameter);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Tech Plus POS Backup Handler - GET request received',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        status: 'operational',
        features: ['backup-upload', 'email-notifications', 'sms-notifications']
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('GET request error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'GET request failed: ' + error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function for direct invocation
 */
function testDirect() {
  console.log('=== Testing Apps Script directly ===');
  
  const testData = {
    action: 'test',
    timestamp: new Date().toISOString(),
    message: 'Direct test successful'
  };
  
  const mockEvent = {
    postData: {
      type: 'application/json',
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Direct test result:', result.getContent());
  return result;
}

/**
 * Main function to handle POST requests
 */
function doPost(e) {
  try {
    console.log('=== Received POST request ===');
    console.log('Event object type:', typeof e);
    console.log('Event object keys:', Object.keys(e || {}));
    
    // Check if we have valid request data
    if (!e) {
      console.error('No event object received');
      return createResponse(false, 'No event object received');
    }
    
    if (!e.postData) {
      console.error('No postData in event object');
      console.log('Available properties:', Object.keys(e));
      console.log('Event object:', JSON.stringify(e, null, 2));
      return createResponse(false, 'No request data received - Check deployment settings');
    }
    
    console.log('Content-Type:', e.postData.type);
    console.log('Content length:', e.postData.contents.length);
    console.log('First 200 chars of content:', e.postData.contents.substring(0, 200));
    console.log('Last 200 chars of content:', e.postData.contents.substring(Math.max(0, e.postData.contents.length - 200)));
    
    // Check if content is empty
    if (!e.postData.contents || e.postData.contents.trim() === '') {
      console.error('Empty content received');
      return createResponse(false, 'Empty request content received - Check if data is being sent correctly');
    }
    
    // Parse the request data
    let data = {};
    
    try {
      if (e.postData.type && e.postData.type.includes('application/json')) {
        // JSON format
        console.log('Parsing as JSON');
        data = JSON.parse(e.postData.contents);
      } else {
        // FormData format - try enhanced parsing first, then fallback
        console.log('Parsing as FormData');
        try {
          data = parseFormDataEnhanced(e.postData.contents);
        } catch (enhancedError) {
          console.log('Enhanced parser failed, trying alternative parser:', enhancedError);
          data = parseFormDataAlternative(e.postData.contents);
        }
      }
    } catch (parseError) {
      console.error('Error parsing request data:', parseError);
      console.log('Raw content for debugging:', e.postData.contents.substring(0, 1000));
      return createResponse(false, 'Error parsing request data: ' + parseError.message);
    }
    
    console.log('Parsed data keys:', Object.keys(data));
    console.log('Action:', data.action);
    console.log('Has zipFile:', !!data.zipFile);
    console.log('Has sysZipFile:', !!data.sysZipFile);
    console.log('Has email:', !!data.email);
    console.log('Has driveFolderId:', !!data.driveFolderId);
    console.log('Has emailDestination:', !!data.emailDestination);
    console.log('Has SMS config:', !!data.smsProvider);

    // Validate required fields
    if (!data.action) {
      return createResponse(false, 'Missing required field: action');
    }

    if (data.action === 'test') {
      return handleTestRequest(data);
    } else if (data.action === 'upload') {
      return handleBackupUpload(data);
    } else if (data.action === 'sms-test') {
      return handleSMSTest(data);
    } else {
      return createResponse(false, 'Invalid action specified: ' + data.action);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse(false, 'Error: ' + error.message);
  }
}