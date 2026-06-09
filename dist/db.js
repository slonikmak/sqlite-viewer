"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBService = void 0;
const node_sqlite_1 = require("node:sqlite");
class DBService {
    db;
    constructor(dbPath) {
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
    }
    getTables() {
        const stmt = this.db.prepare(`
      SELECT name, type
      FROM sqlite_master
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
        return stmt.all();
    }
    getTableSchema(tableName) {
        const safeName = tableName.replace(/"/g, '""');
        const stmt = this.db.prepare(`PRAGMA table_info("${safeName}")`);
        return stmt.all();
    }
    getTableData(tableName, offset = 0, limit = 50) {
        const safeName = tableName.replace(/"/g, '""');
        const stmt = this.db.prepare(`SELECT * FROM "${safeName}" LIMIT ? OFFSET ?`);
        return stmt.all(limit, offset);
    }
    getRowCount(tableName) {
        const safeName = tableName.replace(/"/g, '""');
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${safeName}"`);
        const result = stmt.get();
        return result.count;
    }
    executeRaw(sql) {
        try {
            const trimmed = sql.trim().toUpperCase();
            // Basic heuristic to decide whether to use .all() or .run()
            if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('EXPLAIN')) {
                const stmt = this.db.prepare(sql);
                const rows = stmt.all();
                return { rows };
            }
            else {
                const stmt = this.db.prepare(sql);
                const info = stmt.run();
                return { changes: Number(info.changes) };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
    close() {
        this.db.close();
    }
}
exports.DBService = DBService;
