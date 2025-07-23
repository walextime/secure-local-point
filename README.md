# Tech Plus POS - Secure Point of Sale Application

## 🖥️ Application Overview & Navigation

Tech Plus POS is a secure, modern point-of-sale (POS) system for small and medium businesses. It features robust inventory, customer, and sales management, with strong security and backup options. The app is designed for both web and desktop use, with optional mobile builds.

### Sidebar Navigation Breakdown

- **Point of Sale**: The main sales interface. Add products to cart, process sales, print receipts, and handle payments.
- **Pending Sales**: View and manage sales that are started but not yet completed (e.g., on hold or awaiting payment).
- **Printed Receipts**: Access a history of all printed receipts for reprinting or review.
- **Inventory Management**: Add, edit, and track products. Manage stock levels, product details, and categories.
- **Customer Management**: Add and edit customer profiles, view customer history, and manage customer credits.
- **Sales History**: Review all completed sales, filter by date or customer, and export sales data.
- **User Management**: Manage staff accounts, assign roles (Admin, Manager, Cashier), and reset passwords.
- **Backup Manager**: Create, restore, and manage backups. Configure automatic and manual backup options, including cloud sync and local Excel export.
- **Settings**: Configure store info, receipt layout, security options, backup/sync settings, and localization. (Login info is shown at the bottom.)

---

## ✨ What is Tech Plus POS?

Tech Plus POS is a full-featured, secure point-of-sale system with:
- Real-time inventory, customer, and sales management
- Role-based user access (Admin, Manager, Cashier)
- Encrypted local storage and backup (Excel, Google Sheets)
- Automatic and manual backup/restore
- Mobile-ready and desktop-ready builds
- Easy deployment as a web app, EXE, or desktop app

---

## 🛠️ How to Build as an EXE (Windows & Mac)

### 1. **Build the Production Web App**
```bash
npm run build
```
This creates a `dist/` folder with the production build.

### 2. **Package as an EXE (Windows)**
- Make sure `pkg` is installed (already in devDependencies).
- Run:
```bash
npm run build:exe
```
- This creates `POS.exe` in your project root.
- **When you launch POS.exe:**
  - The local server starts automatically.
  - The default browser opens a new tab at `http://localhost:8000`.

### 3. **Package as a Mac App (macOS)**
- Run:
```bash
npm run build:exe:all
```
- This creates executables for Windows, Mac, and Linux in your project root.
- On Mac, run the generated binary (e.g., `./POS-macos`) to start the server and open the browser.

#### **Auto-Open Browser on Launch**
- The launcher script (`server/launcher.js`) is responsible for starting the server and opening the browser automatically.
- You can customize the browser launch command in `server/launcher.js` if needed.

---

## 🖥️ How to Build as a Desktop App (All Servers Running)

### **Option 1: Electron (Recommended for Desktop Experience)**
1. **Install Electron:**
   ```bash
   npm install electron --save-dev
   ```
2. **Create an Electron main file (e.g., `electron-main.js`):**
   - This file should start your local server (proxy and Vite build), then open a browser window pointing to `http://localhost:8000`.
3. **Add a script to `package.json`:**
   ```json
   "desktop": "electron electron-main.js"
   ```
4. **Run:**
   ```bash
   npm run desktop
   ```
   - This will launch the app in a native window with all servers running in the background.

### **Option 2: Batch/PowerShell Script (Windows Only)**
- Use the provided `start-dev.bat` or `start-dev.ps1` to launch both servers, then open the browser manually or add a command to auto-open it.

---

## ⚡ Quick Start
- For web: `npm run dev` (development) or `npm run build` + serve `dist/`
- For EXE: `npm run build:exe` (Windows) or `npm run build:exe:all` (Mac/Win/Linux)
- For desktop: Use Electron as described above

---

## Project Overview

This is a secure point of sale application designed for small to medium businesses. The application offers:

- Inventory management
- Customer management
- Sales tracking and history
- User management with role-based access control
- Secure data storage with encryption
- Backup and export functionality
- **NEW: Local Excel storage with automatic backups**
- **NEW: Google Sheets synchronization**
- **NEW: Mobile application builds**

## 🔧 Prerequisites

- Node.js 16.x or later and npm
- A Google account with access to Google Sheets (for cloud sync)
- For Android builds: Android Studio and necessary SDKs installed

## 📥 Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd techplus-pos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For mobile development, initialize Capacitor:
   ```bash
   npx cap init
   npx cap add android
   npx cap add ios
   ```

## 🔐 Setting Up Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Library**
4. Search for "Google Sheets API" and enable it
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > OAuth client ID**
7. Configure the consent screen and create credentials
8. For web application, add your domain to authorized origins
9. Copy the Client ID and API Key

## ⚙️ Configuration

### Google Sheets Setup

1. Create a new Google Sheet
2. Copy the Sheet ID from the URL (between /d/ and /edit)
3. In the application, go to Settings > Sync
4. Enter your Google Sheets credentials:
   - Spreadsheet ID
   - OAuth Client ID
   - API Key
5. Test the connection and authorize access

### Local Excel Storage

- Data is automatically saved to Excel format every 5 minutes
- Previous session data is loaded when the application starts
- Excel files are also downloaded for manual backup

## 🛠 Building the Application

### Web Application
```bash
npm run dev          # Development server
npm run build        # Production build
```

### Android APK
```bash
npm run build        # Build the web app first
npx cap sync         # Sync with Capacitor
npx cap run android  # Run on connected device/emulator
```

### iOS (macOS required)
```bash
npm run build        # Build the web app first
npx cap sync         # Sync with Capacitor
npx cap run ios      # Run on iOS simulator/device
```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Mobile Application
After building, install the `.apk` on your Android device or use Xcode for iOS

## 📱 Mobile Features

- Full offline functionality
- Local Excel data storage
- Automatic sync when online
- Touch-optimized interface
- Native file system access

## ☁️ Synchronization Features

### Automatic Excel Backup
- Local data saved every 5 minutes
- Previous session restored on startup
- Manual backup downloads available

### Google Sheets Integration
- Real-time cloud synchronization
- Automatic sync when online
- Manual sync option
- Separate sheets for sales, customers, and inventory

### Offline Support
- Full functionality without internet
- Data queued for sync when connection returns
- Local Excel backup ensures no data loss

## 🔒 Security Features

### Encrypted Data Storage
All sensitive data is encrypted using AES-256 encryption:
- Local database content is encrypted
- Exported files (receipts, invoices, reports) are password-protected
- Backup files are encrypted with your master password

### Secure Authentication
- Google OAuth for Sheets access
- Master password for local encryption
- Role-based access control

## 👥 User Roles and Permissions

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| POS / Sales | ✓ | ✓ | ✓ |
| Inventory Management | ✓ | ✓ | ✗ |
| Customer Management | ✓ | ✓ | ✓ (view only) |
| Sales History | ✓ | ✓ (view only) | ✗ |
| User Management | ✓ | ✗ | ✗ |
| Settings & Sync | ✓ | ✗ | ✗ |
| Export/Backup | ✓ | ✗ | ✗ |

## 🔄 Data Flow

1. **Local Operations**: All data stored in encrypted IndexedDB
2. **Excel Backup**: Automatic conversion to Excel format every 5 minutes
3. **Cloud Sync**: Push to Google Sheets when online (configurable interval)
4. **Session Recovery**: Load from Excel backup on application start

## 🛠️ Troubleshooting

### Google Sheets Issues
- Ensure API is enabled in Google Cloud Console
- Check OAuth client ID is correct for your domain
- Verify sheet permissions allow editing

### Mobile Build Issues
- Run `npx cap sync` after code changes
- Ensure Android Studio is properly installed
- Check Capacitor configuration in `capacitor.config.ts`

### Sync Issues
- Check internet connection
- Verify Google Sheets credentials
- Check browser console for error messages

## 📊 Performance

- **Startup**: Previous session loads in < 2 seconds
- **Sync**: Google Sheets sync completes in < 10 seconds for typical datasets
- **Storage**: Local Excel files are compressed and optimized

## 🔄 Development Workflow

1. Make changes to the React application
2. Test in web browser (`npm run dev`)
3. Sync and test mobile version (`npx cap sync && npx cap run android`)
4. Build for production

## 📚 API Documentation

### Local Storage API
- `ExcelStorageService.saveDataToExcel()`: Manual Excel save
- `ExcelStorageService.loadDataFromExcel()`: Load previous session

### Sync API
- `SyncManager.performFullSync()`: Manual sync with all services
- `GoogleSheetsService.syncData()`: Sync with Google Sheets only

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   IndexedDB      │    │  Excel Storage  │
│                 │◄──►│   (Encrypted)    │◄──►│   (Local)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               │
┌─────────────────┐                                     │
│ Google Sheets   │◄────────────────────────────────────┘
│    (Cloud)      │
└─────────────────┘
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (web, mobile)
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review console logs for error messages
- Ensure all prerequisites are installed
- Verify API credentials are correct

## Custom Local Domain: techplus.pos

To use `http://techplus.pos:888` as your local app URL, you must add an entry to your Windows hosts file:

1. Open Notepad as Administrator.
2. Open the file: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line at the end:
   
   ```
   127.0.0.1 techplus.pos
   ```
4. Save the file.

Now, when you run the EXE, your browser will open to `http://techplus.pos:888` and the app will work as intended.
