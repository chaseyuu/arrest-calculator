const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'data', 'gtaw-data');
const destDir = path.resolve(__dirname, '..', 'public', 'data', 'gtaw-data');

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(srcDir, destDir, { recursive: true });
console.log(`Copied GTAW data to ${destDir}`);
