#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App.js';
import path from 'path';

const args = process.argv.slice(2);
let dbPath = args[0];

if (!dbPath) {
  console.error('Error: Please provide a path to a SQLite database.');
  console.error('Usage: npx sqlite-viewer <path-to-db>');
  process.exit(1);
}

dbPath = path.resolve(process.cwd(), dbPath);

render(<App dbPath={dbPath} />);
