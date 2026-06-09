#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App.js';
import path from 'path';

import fs from 'fs';

const args = process.argv.slice(2);
let dbPath = args[0];

if (!dbPath) {
  const files = fs.readdirSync(process.cwd());
  const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
  
  if (dbFiles.length === 1) {
    dbPath = dbFiles[0];
  } else if (dbFiles.length > 1) {
    console.error('Error: Multiple SQLite databases found in current directory.');
    console.error(`Please specify one: npx sqlite-viewer <${dbFiles.join(' | ')}>`);
    process.exit(1);
  } else {
    console.error('Error: No SQLite database found in the current directory.');
    console.error('Usage: npx sqlite-viewer <path-to-db>');
    process.exit(1);
  }
}

dbPath = path.resolve(process.cwd(), dbPath);

render(<App dbPath={dbPath} />);
