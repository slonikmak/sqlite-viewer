import Database from 'better-sqlite3';

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface TableInfo {
  name: string;
  type: 'table' | 'view';
}

export class DBService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: false }); 
  }

  getTables(): TableInfo[] {
    const stmt = this.db.prepare(`
      SELECT name, type 
      FROM sqlite_master 
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    return stmt.all() as TableInfo[];
  }

  getTableSchema(tableName: string): ColumnInfo[] {
    const safeName = tableName.replace(/"/g, '""');
    const stmt = this.db.prepare(`PRAGMA table_info("${safeName}")`);
    return stmt.all() as ColumnInfo[];
  }

  getTableData(tableName: string, offset: number = 0, limit: number = 50): any[] {
    const safeName = tableName.replace(/"/g, '""');
    const stmt = this.db.prepare(`SELECT * FROM "${safeName}" LIMIT ? OFFSET ?`);
    return stmt.all(limit, offset);
  }

  getRowCount(tableName: string): number {
    const safeName = tableName.replace(/"/g, '""');
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${safeName}"`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  executeRaw(sql: string): { rows?: any[]; changes?: number; error?: string } {
    try {
      const trimmed = sql.trim().toUpperCase();
      // Basic heuristic to decide whether to use .all() or .run()
      if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('EXPLAIN')) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all();
        return { rows };
      } else {
        const stmt = this.db.prepare(sql);
        const info = stmt.run();
        return { changes: info.changes };
      }
    } catch (e: any) {
      return { error: e.message };
    }
  }
  
  close() {
    this.db.close();
  }
}
