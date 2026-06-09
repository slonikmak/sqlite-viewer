const Database = require('better-sqlite3');
const db = new Database('test.db');
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, active BOOLEAN, long_text TEXT);
  INSERT INTO users (name, email, active, long_text) VALUES ('Alice', 'alice@example.com', 1, '{"role": "admin", "permissions": ["read", "write", "delete", "execute", "manage_users"]}');
  INSERT INTO users (name, email, active, long_text) VALUES ('Bob', 'bob@example.com', 0, '{"role": "user", "permissions": ["read"]}');
  INSERT INTO users (name, email, active, long_text) VALUES ('Charlie', 'charles@example.com', 1, 'This is a very long text string that should be truncated in the data grid so it does not destroy the layout.');
  
  CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, product TEXT, price REAL);
  INSERT INTO orders (user_id, product, price) VALUES (1, 'Laptop', 1200.50);
  INSERT INTO orders (user_id, product, price) VALUES (2, 'Mouse', 25.00);
  INSERT INTO orders (user_id, product, price) VALUES (1, 'Keyboard', 150.00);
`);

// Add some dummy rows to test scrolling
const stmt = db.prepare('INSERT INTO orders (user_id, product, price) VALUES (?, ?, ?)');
db.transaction(() => {
  for (let i = 0; i < 100; i++) {
    stmt.run(1, 'Dummy Item ' + i, Math.random() * 100);
  }
})();

db.close();
console.log('test.db created');
