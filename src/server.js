const express = require("express");
const db = require("./db");

const app = express();
app.use(express.json());

// Rota simples de saúde da API
app.get("/", (req, res) => {
  res.send("API de despesas rodando.");
});

// ---------------------- USUÁRIOS ----------------------

// Cria usuário (NR_TELEFONE é o identificador principal vindo do WhatsApp)
app.post("/usuarios", (req, res) => {
  const { nr_telefone, nm_usuario } = req.body;

  if (!nr_telefone) {
    return res.status(400).json({ error: "número do telefone é obrigatório." });
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO USUARIO (NR_TELEFONE, NM_USUARIO) VALUES (?, ?)"
    );
    const result = stmt.run(nr_telefone, nm_usuario || null);

    res.status(201).json({
      id_usuario: result.lastInsertRowid,
      nr_telefone,
      nm_usuario: nm_usuario || null,
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: "Já existe um usuário com esse telefone." });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

// Lista todos os usuários (temporário para teste)
app.get("/usuarios", (req, res) => {
  try {
    const usuarios = db.prepare("SELECT * FROM USUARIO").all();
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

// ---------------------- DESPESAS ----------------------

// Cria uma despesa para um usuário
app.post("/despesas", (req, res) => {
  const { id_usuario, tp_despesa, ds_despesa, vl_despesa, dt_despesa } =
    req.body;

  if (!id_usuario || !vl_despesa || !dt_despesa) {
    return res.status(400).json({
      error: "id_usuario, vl_despesa e dt_despesa são obrigatórios.",
    });
  }

  try {
    const stmt = db.prepare(
      `INSERT INTO DESPESAS
       (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA)
       VALUES (?, ?, ?, ?, ?)`
    );

    const result = stmt.run(
      id_usuario,
      tp_despesa || null,
      ds_despesa || null,
      vl_despesa,
      dt_despesa
    );

    res.status(201).json({
      id_despesa: result.lastInsertRowid,
      id_usuario,
      tp_despesa: tp_despesa || null,
      ds_despesa: ds_despesa || null,
      vl_despesa,
      dt_despesa,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar despesa." });
  }
});

// Lista despesas de um usuário, com filtro opcional de mês/ano
app.get("/despesas", (req, res) => {
  const { id_usuario, mes, ano } = req.query;

  if (!id_usuario) {
    return res.status(400).json({ error: "id_usuario é obrigatório." });
  }

  try {
    let sql = "SELECT * FROM DESPESAS WHERE ID_USUARIO = ?";
    const params = [id_usuario];

    if (mes && ano) {
      sql +=
        " AND strftime('%m', DT_DESPESA) = ? AND strftime('%Y', DT_DESPESA) = ?";

      const mesFormatado = String(mes).padStart(2, "0");
      params.push(mesFormatado, String(ano));
    }

    const despesas = db.prepare(sql).all(...params);
    res.json(despesas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar despesas." });
  }
});

// Retorna o total gasto em um mês/ano por usuário
app.get("/despesas/total", (req, res) => {
  const { id_usuario, mes, ano } = req.query;

  if (!id_usuario || !mes || !ano) {
    return res
      .status(400)
      .json({ error: "id_usuario, mes e ano são obrigatórios." });
  }

  try {
    const stmt = db.prepare(
      `SELECT SUM(VL_DESPESA) as total
       FROM DESPESAS
       WHERE ID_USUARIO = ?
         AND strftime('%m', DT_DESPESA) = ?
         AND strftime('%Y', DT_DESPESA) = ?`
    );

    const mesFormatado = String(mes).padStart(2, "0");
    const row = stmt.get(id_usuario, mesFormatado, String(ano));

    res.json({ total: row.total || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular total de despesas." });
  }
});

// ------------------------------------------------------

app.listen(3000, () => {
  console.log("🚀 Servidor rodando na porta 3000");
});