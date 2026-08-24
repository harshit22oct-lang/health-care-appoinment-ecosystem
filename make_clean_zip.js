const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const tempDir = path.join(rootDir, 'temp_submission');
const zipFile = path.join(rootDir, 'Healthcare_Appointment_Ecosystem_SourceCode.zip');

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

function copyRecursive(src, dest, ignoreList) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    const base = path.basename(src);
    if (ignoreList.includes(base)) return;

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (ignoreList.includes(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry), ignoreList);
    }
  } else {
    const base = path.basename(src);
    if (ignoreList.includes(base) || base.endsWith('.log') || base === '.env') return;
    fs.copyFileSync(src, dest);
  }
}

const ignores = ['node_modules', 'dist', '.git', '.env', 'temp_submission', 'logs', 'Healthcare_Appointment_Ecosystem_SourceCode.zip'];

console.log('Copying clean source files...');
// Copy client
copyRecursive(path.join(rootDir, 'client'), path.join(tempDir, 'client'), ignores);
// Copy server
copyRecursive(path.join(rootDir, 'server'), path.join(tempDir, 'server'), ignores);

// Copy root files
const rootFiles = [
  '.env.example',
  '.gitignore',
  'README.md',
  'SYSTEM_DESIGN.md',
  'MASTER_BLUEPRINT_IMPLEMENTATION_PLAN.md',
  'render.yaml',
  'vercel.json'
];

for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(tempDir, file));
  }
}

console.log('Compressing to zip archive via PowerShell...');
const psCmd = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFile}' -Force"`;
execSync(psCmd);

// Cleanup temp
fs.rmSync(tempDir, { recursive: true, force: true });

const zipStats = fs.statSync(zipFile);
console.log(`✅ Success! Clean Source Code Zip created (${(zipStats.size / (1024 * 1024)).toFixed(2)} MB) at: ${zipFile}`);
