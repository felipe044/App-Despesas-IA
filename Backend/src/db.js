const Database = require("better-sqlite3");

// Abre (ou cria) o arquivo de banco de dados
const db = new Database("despesas.db");

// Cria as tabelas se ainda não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS USUARIO (
    ID_USUARIO   INTEGER PRIMARY KEY AUTOINCREMENT,
    NR_TELEFONE  TEXT NOT NULL UNIQUE,
    NM_USUARIO   TEXT,
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

const despesaColumns = db.prepare("PRAGMA table_info(DESPESAS)").all().map((r) => r.name);
if (!despesaColumns.includes("DT_INCLUSAO")) {
  db.exec("ALTER TABLE DESPESAS ADD COLUMN DT_INCLUSAO TEXT;");
  // Preenche para registros antigos (usa a própria DT_DESPESA como fallback)
  db.exec("UPDATE DESPESAS SET DT_INCLUSAO = COALESCE(DT_INCLUSAO, DT_DESPESA) WHERE DT_INCLUSAO IS NULL;");
}

module.exports = db;

