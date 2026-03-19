require("dotenv").config();
const express = require("express");
const db = require("./db");
const { interpretarMensagem } = require("./geminiService");
const { executarAcao } = require("./acoesGemini");
const { formatarResposta } = require("./formatarResposta");
const { enviarMensagem } = require("./whatsapp");

const app = express();
app.use(express.json());

// Rota simples de saúde da API
app.get("/", (req, res) => {
  res.send("API de despesas rodando.");
});

// ---------------------- USUÁRIOS ----------------------

// Cria usuário (NR_TELEFONE é o identificador principal vindo do WhatsApp)
app.post("/usuarios", (req, res) => {
  const { nr_telefone, nm_usuario, vl_renda_mensal, nr_dia_recebimento, ds_objetivo } = req.body;

  if (!nr_telefone) {
    return res.status(400).json({ error: "número do telefone é obrigatório." });
  }

  const vlRendaMensalParsed =
    vl_renda_mensal == null || vl_renda_mensal === ''
      ? null
      : Number(vl_renda_mensal);
  const vlRendaMensal = Number.isFinite(vlRendaMensalParsed) ? vlRendaMensalParsed : null;

  const nrDiaRecebimentoParsed =
    nr_dia_recebimento == null || nr_dia_recebimento === ''
      ? null
      : Number(nr_dia_recebimento);
  const nrDiaRecebimento = Number.isFinite(nrDiaRecebimentoParsed) ? nrDiaRecebimentoParsed : null;

  const dsObjetivoParsed =
    typeof ds_objetivo === "string" && ds_objetivo.trim()
      ? ds_objetivo.trim()
      : null;

  try {
    const stmt = db.prepare(
      "INSERT INTO USUARIO (NR_TELEFONE, NM_USUARIO, VL_RENDA_MENSAL, NR_DIA_RECEBIMENTO, DS_OBJETIVO) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      nr_telefone,
      nm_usuario || null,
      vlRendaMensal,
      nrDiaRecebimento,
      dsObjetivoParsed
    );

    res.status(201).json({
      id_usuario: result.lastInsertRowid,
      nr_telefone,
      nm_usuario: nm_usuario || null,
      vl_renda_mensal: vlRendaMensal,
      nr_dia_recebimento: nrDiaRecebimento,
      ds_objetivo: dsObjetivoParsed,
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      // Se já existir, atualiza os dados (em vez de forçar o client a lidar com 409).
      const updated = db
        .prepare(
          `UPDATE USUARIO
           SET NM_USUARIO = COALESCE(?, NM_USUARIO),
               VL_RENDA_MENSAL = COALESCE(?, VL_RENDA_MENSAL),
               NR_DIA_RECEBIMENTO = COALESCE(?, NR_DIA_RECEBIMENTO),
               DS_OBJETIVO = COALESCE(?, DS_OBJETIVO)
           WHERE NR_TELEFONE = ?`
        )
        .run(nm_usuario || null, vlRendaMensal, nrDiaRecebimento, dsObjetivoParsed, nr_telefone);

      const row = db.prepare("SELECT * FROM USUARIO WHERE NR_TELEFONE = ?").get(nr_telefone);
      if (!row) {
        return res.status(500).json({ error: "Falha ao recuperar usuário existente após update." });
      }

      return res.status(200).json({
        id_usuario: row.ID_USUARIO,
        nr_telefone: row.NR_TELEFONE,
        nm_usuario: row.NM_USUARIO,
        vl_renda_mensal: row.VL_RENDA_MENSAL,
        nr_dia_recebimento: row.NR_DIA_RECEBIMENTO,
        ds_objetivo: row.DS_OBJETIVO,
      });
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

// Busca usuário por ID (usado pelo Dashboard web)
app.get("/usuarios/:id_usuario", (req, res) => {
  const { id_usuario } = req.params;
  try {
    const row = db.prepare("SELECT * FROM USUARIO WHERE ID_USUARIO = ?").get(id_usuario);
    if (!row) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário." });
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
       (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA, DT_INCLUSAO)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const dtInclusao = new Date().toISOString();
    const result = stmt.run(
      id_usuario,
      tp_despesa || null,
      ds_despesa || null,
      vl_despesa,
      dt_despesa,
      dtInclusao
    );

    res.status(201).json({
      id_despesa: result.lastInsertRowid,
      id_usuario,
      tp_despesa: tp_despesa || null,
      ds_despesa: ds_despesa || null,
      vl_despesa,
      dt_despesa,
      dt_inclusao: dtInclusao,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar despesa." });
  }
});

// Lista despesas de um usuário, com filtro opcional de mês/ano ou só ano
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
    } else if (ano) {
      sql += " AND strftime('%Y', DT_DESPESA) = ?";
      params.push(String(ano));
    }

    const despesas = db.prepare(sql).all(...params);
    res.json(despesas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar despesas." });
  }
});

// Lista despesas por intervalo (período baseado no dia de recebimento)
app.get("/despesas/periodo", (req, res) => {
  const { id_usuario, inicio, fim } = req.query;

  if (!id_usuario || !inicio || !fim) {
    return res.status(400).json({ error: "id_usuario, inicio e fim são obrigatórios." });
  }

  try {
    const stmt = db.prepare(
      `SELECT *
       FROM DESPESAS
       WHERE ID_USUARIO = ?
         AND DT_INCLUSAO >= ?
         AND DT_INCLUSAO <= ?
       ORDER BY DT_INCLUSAO DESC`
    );
    const despesas = stmt.all(id_usuario, inicio, fim);
    res.json(despesas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar despesas por período." });
  }
});

// Remove uma despesa por ID
app.delete("/despesas/:id", (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare("DELETE FROM DESPESAS WHERE ID_DESPESA = ?");
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Despesa não encontrada." });
    }

    res.json({ mensagem: "Despesa removida com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover despesa." });
  }
});

// ---------------------- WEBHOOK WHATSAPP ----------------------
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "despesas-verify-token";

// Resposta rápida para o Meta validar (evita timeouts)
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    res.type("text/plain").status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

app.post("/webhook/whatsapp", async (req, res) => {
  res.status(200).send("OK");
  const body = req.body;
  if (body.object !== "whatsapp_business_account") return;
  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value;
        for (const msg of value.messages || []) {
          if (msg.type !== "text") continue;
          const nr_telefone = msg.from;
          const mensagemUsuario = msg.text?.body || "";
          console.log("[WhatsApp] Mensagem recebida de", nr_telefone, ":", mensagemUsuario);

          const respostaIA = await interpretarMensagem(mensagemUsuario);
          console.log("[WhatsApp] Interpretação Gemini:", respostaIA);

          const resultado = await executarAcao(respostaIA, nr_telefone);

          if (resultado.error) {
            console.log("[WhatsApp] Enviando resposta (erro):", resultado.error);
            const envio = await enviarMensagem(nr_telefone, resultado.error);
            if (!envio.ok) console.error("[WhatsApp] Falha ao enviar:", envio.error);
            else console.log("[WhatsApp] Resposta enviada com sucesso.");
            continue;
          }
          const texto = formatarResposta(resultado.acao, resultado.resultado);
          console.log("[WhatsApp] Enviando resposta:", texto?.slice(0, 80) + (texto?.length > 80 ? "..." : ""));
          const envio = await enviarMensagem(nr_telefone, texto);
          if (!envio.ok) console.error("[WhatsApp] Falha ao enviar:", envio.error);
          else console.log("[WhatsApp] Resposta enviada com sucesso.");
        }
      }
    }
  } catch (err) {
    console.error("Erro no webhook WhatsApp:", err);
  }
});

// ---------------------- PROCESSAMENTO ----------------------
// Recebe mensagem + nr_telefone, interpreta via Gemini, executa ação e retorna resultado
app.post("/processar", async (req, res) => {
  const { mensagem, nr_telefone } = req.body;

  if (!mensagem || !nr_telefone) {
    return res.status(400).json({
      error: "Informe o número de telefone e a mensagem para prosseguir.",
    });
  }

  const respostaIA = await interpretarMensagem(mensagem);
  const resultado = await executarAcao(respostaIA, nr_telefone);

  if (resultado.error) {
    return res.status(400).json({ error: resultado.error });
  }

  res.json({ acao: resultado.acao, resultado: resultado.resultado });
});


// ---------------------- INTERPRETAÇÃO DE MENSAGENS (GEMINI) ----------------------
app.post("/interpretar", async (req, res) => {
  const { mensagem } = req.body;

  if (!mensagem) {
    return res.status(400).json({ error: "Envie uma mensagem válida para que eu possa interpretar." });
  }

  try {
    const resultado = await interpretarMensagem(mensagem);
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ acao: "DESCONHECIDO" });
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