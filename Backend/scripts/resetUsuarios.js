/**
 * Apaga despesas, usuários e registros de boas-vindas (para testar de novo).
 * Uso: npm run reset:usuarios
 */
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "despesas.db");
const db = new Database(dbPath);

db.exec(`
  DELETE FROM DESPESAS;
  DELETE FROM WHATSAPP_BOAS_VINDAS;
  DELETE FROM ASSINATURA_HOTMART;
  DELETE FROM USUARIO;
`);
db.close();
console.log("OK: DESPESAS, ASSINATURA_HOTMART, USUARIO e WHATSAPP_BOAS_VINDAS limpos em", dbPath);
