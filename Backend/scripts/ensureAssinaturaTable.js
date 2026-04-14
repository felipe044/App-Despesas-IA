const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "despesas.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS ASSINATURA_HOTMART (
    CD_SUBSCRICAO   TEXT PRIMARY KEY,
    NR_TELEFONE     TEXT NOT NULL,
    ST_ATIVA        INTEGER NOT NULL DEFAULT 1,
    DT_VALIDADE_ATE TEXT,
    DT_ATUALIZACAO  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_assinatura_hotmart_telefone ON ASSINATURA_HOTMART(NR_TELEFONE);
`);

const row = db.prepare("SELECT COUNT(*) AS c FROM ASSINATURA_HOTMART").get();
db.close();
console.log("Tabela ASSINATURA_HOTMART OK em", dbPath, "| linhas:", row.c);
