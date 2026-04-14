const path = require("path");
const Database = require("better-sqlite3");

const sql = process.argv.slice(2).join(" ").trim();
if (!sql) {
  console.error("Uso: npm run db:sql -- \"SELECT * FROM USUARIO LIMIT 10\"");
  process.exit(1);
}

const dbPath = path.join(__dirname, "..", "despesas.db");
const db = new Database(dbPath);

try {
  const trimmed = sql.replace(/;\s*$/, "");
  const upper = trimmed.trimStart().toUpperCase();
  if (upper.startsWith("SELECT") || upper.startsWith("PRAGMA")) {
    const rows = db.prepare(trimmed).all();
    console.log(JSON.stringify(rows, null, 2));
    console.log(`(${rows.length} linha(s))`);
  } else {
    const info = db.prepare(trimmed).run();
    console.log({ changes: info.changes, lastInsertRowid: info.lastInsertRowid });
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
} finally {
  db.close();
}
