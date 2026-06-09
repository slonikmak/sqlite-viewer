#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const App_js_1 = __importDefault(require("./App.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const args = process.argv.slice(2);
let dbPath = args[0];
if (!dbPath) {
    const files = fs_1.default.readdirSync(process.cwd());
    const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
    if (dbFiles.length === 1) {
        dbPath = dbFiles[0];
    }
    else if (dbFiles.length > 1) {
        console.error('Error: Multiple SQLite databases found in current directory.');
        console.error(`Please specify one: npx sqlite-viewer <${dbFiles.join(' | ')}>`);
        process.exit(1);
    }
    else {
        console.error('Error: No SQLite database found in the current directory.');
        console.error('Usage: npx sqlite-viewer <path-to-db>');
        process.exit(1);
    }
}
dbPath = path_1.default.resolve(process.cwd(), dbPath);
(0, ink_1.render)((0, jsx_runtime_1.jsx)(App_js_1.default, { dbPath: dbPath }));
