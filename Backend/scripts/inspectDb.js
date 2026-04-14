const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "despesas.db");
const db = new Database(dbPath);

console.log("Arquivo:", dbPath, "\n");

console.log("=== TABELAS (CREATE) ===\n");
const tables = db
  .prepare(
    `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  )
  .all();
for (const r of tables) {
  console.log("--", r.name);
  console.log(r.sql || "(sem sql)");
  console.log("");
}

const names = tables.map((t) => t.name);
console.log("=== CONTAGENS ===");
for (const t of names) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c;
  console.log(`${t}: ${n} linha(s)`);
}

console.log("\n=== Consultas ===");
console.log('npm run db:sql -- "SELECT * FROM USUARIO"');
console.log('npm run db:sql -- "SELECT * FROM ASSINATURA_HOTMART"');

db.close();
