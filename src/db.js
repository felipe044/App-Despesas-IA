const Database = require("better-sqlite3");

// Abre (ou cria) o arquivo de banco de dados
const db = new Database("despesas.db");

// Cria as tabelas se ainda não existirem, seguindo o modelo que você enviou
db.exec(`
  CREATE TABLE IF NOT EXISTS USUARIO (
    ID_USUARIO   INTEGER PRIMARY KEY AUTOINCREMENT,
    NR_TELEFONE  TEXT NOT NULL UNIQUE,
    NM_USUARIO   TEXT
  );

  CREATE TABLE IF NOT EXISTS DESPESAS (
    ID_DESPESA   INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_USUARIO   INTEGER NOT NULL,
    TP_DESPESA   TEXT,
    DS_DESPESA   TEXT,
    VL_DESPESA   REAL NOT NULL,
    DT_DESPESA   TEXT NOT NULL,
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO)
  );
`);

module.exports = db;

