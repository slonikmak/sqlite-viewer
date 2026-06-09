# SQLite TUI Viewer

A beautiful, brutalist, and hacker-style Terminal UI for viewing and editing SQLite databases, built with Node.js and Ink.

## Features

- 🟢 **Brutalist Matrix-Green UI**: Clean and minimal terminal grid design.
- ⌨️ **Keyboard Navigation**: Fast, vim-like `j/k` or `↑/↓` keybindings for navigating panes and data.
- ⚡ **Smart SQL Autocomplete**: Context-aware ghost text autocompletion (similar to fish/zsh) for columns, tables, and keywords.
- 📜 **SQL Query Editor**: Run arbitrary queries or modifications with full command history.
- 📊 **Dynamic Layouts**: Easily browse schemas, explore data, and view detailed row cards.

## Installation

> Requires **Node.js ≥ 22.5** — the viewer uses Node's built-in `node:sqlite`, so there is **no native module to compile** and nothing to build on install.

Install it globally from GitHub:

```bash
npm install -g "https://github.com/slonikmak/sqlite-viewer/archive/refs/heads/main.tar.gz"
```

Then run `sqlite-viewer` in any directory containing a database (see [Usage](#usage)).

> **Why the tarball URL and not `github:slonikmak/sqlite-viewer`?**
> On some Windows / npm setups the `github:` shorthand performs a `git clone`
> install that leaves the global package as a broken symlink into npm's cache
> (so the `dist/` files appear "missing" and the command won't run). Installing
> from the `…/archive/…tar.gz` URL extracts a normal package and works reliably.

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
