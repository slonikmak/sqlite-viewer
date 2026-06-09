# SQLite TUI Viewer

A beautiful, brutalist, and hacker-style Terminal UI for viewing and editing SQLite databases, built with Node.js and Ink.

## Features

- 🟢 **Brutalist Matrix-Green UI**: Clean and minimal terminal grid design.
- ⌨️ **Keyboard Navigation**: Fast, vim-like `j/k` or `↑/↓` keybindings for navigating panes and data.
- ⚡ **Smart SQL Autocomplete**: Context-aware ghost text autocompletion (similar to fish/zsh) for columns, tables, and keywords.
- 📜 **SQL Query Editor**: Run arbitrary queries or modifications with full command history.
- 📊 **Dynamic Layouts**: Easily browse schemas, explore data, and view detailed row cards.

## Installation

You can run this utility directly from GitHub using `npx` without installing it globally:

```bash
npx github:your-username/sqlite-viewer path/to/database.sqlite
```

Or, install it globally via `npm`:

```bash
npm install -g github:your-username/sqlite-viewer
```

## Usage

Simply run the tool in a directory containing your SQLite database:

```bash
sqlite-viewer
```
*(If there is only one `.db`, `.sqlite`, or `.sqlite3` file in the folder, it will be automatically opened!)*

Or, manually specify the path to your database:

```bash
sqlite-viewer ./path/to/database.db
```

### Shortcuts
- `[Tab]` - Switch focus between Sidebar, Data Grid, and SQL Console.
- `[↑ / ↓]` or `[k / j]` - Navigate lists and data rows.
- `[Enter]` - Select a table to browse, or open a detailed card view for a specific row.
- `[Esc]` - Close detailed view, or reset a custom query to return to table browsing.
- `[→]` or `[Tab]` - Accept an autocomplete suggestion in the SQL console.
- `[Q]` - Quit the application.
