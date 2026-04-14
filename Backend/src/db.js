const path = require("path");
const Database = require("better-sqlite3");

// Sempre o mesmo ficheiro (pasta Backend), independentemente do cwd do `node`
const dbPath = path.join(__dirname, "..", "despesas.db");
const db = new Database(dbPath);

// Cria as tabelas se ainda não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS USUARIO (
    ID_USUARIO   INTEGER PRIMARY KEY AUTOINCREMENT,
    NR_TELEFONE  TEXT NOT NULL UNIQUE,
    NM_USUARIO   TEXT,
    TP_SITUACAO  TEXT NOT NULL DEFAULT 'INATIVO',
    VL_RENDA_MENSAL REAL,
    NR_DIA_RECEBIMENTO INTEGER,
    DS_OBJETIVO TEXT
  );

  CREATE TABLE IF NOT EXISTS DESPESAS (
    ID_DESPESA   INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_USUARIO   INTEGER NOT NULL,
    TP_DESPESA   TEXT,
    DS_DESPESA   TEXT,
    VL_DESPESA   REAL NOT NULL,
    DT_DESPESA   TEXT NOT NULL,
    DT_INCLUSAO  TEXT NOT NULL,
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO)
  );

  CREATE TABLE IF NOT EXISTS ASSINATURA_HOTMART (
    CD_SUBSCRICAO   TEXT PRIMARY KEY,
    NR_TELEFONE     TEXT NOT NULL,
    ST_ATIVA        INTEGER NOT NULL DEFAULT 1,
    DT_VALIDADE_ATE TEXT,
    DT_ATUALIZACAO  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_assinatura_hotmart_telefone ON ASSINATURA_HOTMART(NR_TELEFONE);

  CREATE TABLE IF NOT EXISTS WHATSAPP_BOAS_VINDAS (
    NR_TELEFONE TEXT PRIMARY KEY,
    DT_ENVIO    TEXT NOT NULL
  );
`);

// Migra colunas caso o banco já exista com um schema antigo.
// (SQLite não adiciona automaticamente colunas em CREATE TABLE IF NOT EXISTS)
const usuarioColumns = db.prepare("PRAGMA table_info(USUARIO)").all().map((r) => r.name);
const ensureColumn = (columnName, ddl) => {
  if (usuarioColumns.includes(columnName)) return;
  db.exec(`ALTER TABLE USUARIO ADD COLUMN ${ddl};`);
};

ensureColumn("VL_RENDA_MENSAL", "VL_RENDA_MENSAL REAL");
ensureColumn("NR_DIA_RECEBIMENTO", "NR_DIA_RECEBIMENTO INTEGER");
ensureColumn("DS_OBJETIVO", "DS_OBJETIVO TEXT");
ensureColumn("TP_SITUACAO", "TP_SITUACAO TEXT NOT NULL DEFAULT 'INATIVO'");

// Migração: situação passa a refletir assinatura Hotmart já gravada
try {
  db.exec(`
    UPDATE USUARIO SET TP_SITUACAO = 'ATIVO'
    WHERE UPPER(TRIM(COALESCE(TP_SITUACAO, ''))) != 'ATIVO'
      AND NR_TELEFONE IN (
        SELECT NR_TELEFONE FROM ASSINATURA_HOTMART
        WHERE ST_ATIVA = 1
          AND (DT_VALIDADE_ATE IS NULL OR datetime(DT_VALIDADE_ATE) >= datetime('now'))
      );
  `);
} catch (_) {
  /* ASSINATURA_HOTMART pode não existir em bases muito antigas */
}

const despesaColumns = db.prepare("PRAGMA table_info(DESPESAS)").all().map((r) => r.name);
if (!despesaColumns.includes("DT_INCLUSAO")) {
  db.exec("ALTER TABLE DESPESAS ADD COLUMN DT_INCLUSAO TEXT;");
  // Preenche para registros antigos (usa a própria DT_DESPESA como fallback)
  db.exec("UPDATE DESPESAS SET DT_INCLUSAO = COALESCE(DT_INCLUSAO, DT_DESPESA) WHERE DT_INCLUSAO IS NULL;");
}

module.exports = db;

