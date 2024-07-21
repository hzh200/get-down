const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');
const shell = require('shelljs');

// Electron release relative addresses.
'https://github.com/electron/electron/releases'
'https://github.com/electron/electron/releases/tag/v19.0.0-beta.8'
'https://github.com/electron/electron/releases/download/v19.0.0-beta.8/electron-v19.0.0-beta.8-win32-x64.zip'

// rcedit.exe github address.
'https://github.com/electron/rcedit'

// Constants.
const projectName = 'http-downloader';
const buildBasePath = path.resolve('..');
const buildPath = path.resolve('build', `${projectName}`);
const appPath = path.resolve('build', 'app');
const windowsZipFilePath = path.resolve('build', `${projectName}.zip`);
const releaseFilePath = path.resolve('resources', 'electron-v19.0.0-beta.8-win32-x64.zip');
const rceditPath = path.resolve('resources', 'rcedit-x64.exe');
const faviconPath = path.resolve('resources', 'favicon.ico');

console.log('=== Building source code. ===')
execSync('yarn run make-main-prod && yarn run make-renderer-prod', {encoding: 'utf8'});

console.log('=== Writing package.json file to app. ===');
const package = require('../package.json');
const targetPackage = {...package};
targetPackage['main'] = 'main/main.js';
delete targetPackage.devDependencies;
fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(targetPackage));

console.log('=== Installing app dependencies. ===');
process.chdir(appPath);
execSync('npm install', {encoding: 'utf8'});
process.chdir(buildBasePath);

console.log('=== Decompressing electron release file. ===');
new AdmZip(releaseFilePath).extractAllTo(buildPath);

console.log('=== Moving app to electron binary. ===');
fs.rmSync(path.join(buildPath, 'resources', 'default_app.asar'));
shell.mv(appPath, path.join(buildPath, 'resources'));

console.log('=== Rebranding electron binary. ===');
execSync(`"${rceditPath}" "${path.resolve(buildPath, 'electron.exe')}" --set-icon "${faviconPath}"`);
shell.mv(path.resolve(buildPath, 'electron.exe'), path.resolve(buildPath, `${projectName}.exe`));

console.log('=== Compressing http-downloader release file. ===');
const zip = new AdmZip();
zip.addLocalFolder(buildPath);
zip.writeZip(windowsZipFilePath);
shell.rm('-rf', buildPath);

console.log('=== Building done. ===');