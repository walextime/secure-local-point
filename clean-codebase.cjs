const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

const exts = ['.js', '.jsx', '.ts', '.tsx'];

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const clean = strip(code);
  fs.writeFileSync(filePath, clean, 'utf8');
}

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (exts.includes(path.extname(fullPath))) {
      processFile(fullPath);
    }
  });
}

walk(path.join(__dirname, 'src'));
console.log('All comments removed from src/.'); 