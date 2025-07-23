const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Building Electron app with CommonJS package.json...');

// Backup original package.json
const originalPackageJson = fs.readFileSync('package.json', 'utf8');
const electronPackageJson = fs.readFileSync('electron-package.json', 'utf8');

try {
  // Replace package.json with electron version
  fs.writeFileSync('package.json', electronPackageJson);
  console.log('✅ Replaced package.json with electron version');

  // Build the electron app
  console.log('🚀 Building Electron app...');
  execSync('npm run dist-electron', { stdio: 'inherit' });
  console.log('✅ Electron app built successfully!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
} finally {
  // Restore original package.json
  fs.writeFileSync('package.json', originalPackageJson);
  console.log('✅ Restored original package.json');
}

console.log('🎉 Build process completed!'); 