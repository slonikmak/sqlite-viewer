#!/usr/bin/env node
// Patch process.emitWarning BEFORE anything loads node:sqlite, then defer the
// real entrypoint via dynamic import so the suppressor is in place first.
import './suppress-experimental.js';
await import('./cli.js');
