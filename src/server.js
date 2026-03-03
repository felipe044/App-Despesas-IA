const express = require("express");
const db = require("./db");
const { interpretar } = require("./interpretarMensagem");

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

// ---------------------- PROCESSAMENTO (WEBHOOK) ----------------------
// Recebe mensagem + nr_telefone, interpreta, executa ação e retorna resultado
app.post("/processar", (req, res) => {
  const { mensagem, nr_telefone } = req.body;

  if (!mensagem || !nr_telefone) {
    return res.status(400).json({
      error: "Informe o número de telefone e a mensagem para prosseguir.",
    });
  }

  try {
    const { acao, dados } = interpretar(mensagem);

    // Busca ou cria usuário pelo telefone
    let usuario = db.prepare("SELECT * FROM USUARIO WHERE NR_TELEFONE = ?").get(nr_telefone);

    if (!usuario && acao !== "CRIAR_USUARIO") {
      return res.status(404).json({
        error: "Usuário não encontrado. Qual nome voce quer ser chamado? (ex: Meu nome é João).",
      });
    }

    let resultado = null;

    switch (acao) {
      case "CRIAR_USUARIO": {
        const nm_usuario = dados.descricao || null;
        if (!usuario) {
          const stmt = db.prepare(
            "INSERT INTO USUARIO (NR_TELEFONE, NM_USUARIO) VALUES (?, ?)"
          );
          const r = stmt.run(nr_telefone, nm_usuario);
          usuario = {
            ID_USUARIO: r.lastInsertRowid,
            NR_TELEFONE: nr_telefone,
            NM_USUARIO: nm_usuario,
          };
          resultado = { usuario, mensagem: "Usuário criado com sucesso." };
        } else {
          if (nm_usuario) {
            db.prepare("UPDATE USUARIO SET NM_USUARIO = ? WHERE NR_TELEFONE = ?").run(nm_usuario, nr_telefone);
            usuario.NM_USUARIO = nm_usuario;
          }
          resultado = { usuario, mensagem: "Nome atualizado com sucesso." };
        }
        break;
      }

      case "CRIAR_DESPESA": {
        if (!dados.valor || !dados.data) {
          return res.status(400).json({ error: "Não foi possível extrair valor ou data da mensagem." });
        }
        const stmt = db.prepare(
          `INSERT INTO DESPESAS
           (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA)
           VALUES (?, ?, ?, ?, ?)`
        );
        const r = stmt.run(
          usuario.ID_USUARIO,
          dados.tipo || null,
          dados.descricao || null,
          dados.valor,
          dados.data
        );
        resultado = {
          id_despesa: r.lastInsertRowid,
          despesa: {
            ds_despesa: dados.descricao,
            vl_despesa: dados.valor,
            dt_despesa: dados.data,
            tp_despesa: dados.tipo,
          },
          mensagem: `Despesa de R$ ${dados.valor} salva com sucesso.`,
        };
        break;
      }

      case "LISTAR_MENSAL": {
        const [ano, mes] = dados.data ? dados.data.split("-") : [null, null];
        if (!mes || !ano) {
          return res.status(400).json({ error: "Não foi possível identificar mês/ano na mensagem." });
        }
        const despesas = db
          .prepare(
            `SELECT * FROM DESPESAS
             WHERE ID_USUARIO = ? AND strftime('%m', DT_DESPESA) = ? AND strftime('%Y', DT_DESPESA) = ?`
          )
          .all(usuario.ID_USUARIO, String(mes).padStart(2, "0"), String(ano));
        const total = despesas.reduce((s, d) => s + d.VL_DESPESA, 0);
        resultado = { despesas, total, mes, ano };
        break;
      }

      case "LISTAR_ANUAL": {
        const ano = dados.data || new Date().getFullYear().toString();
        const despesas = db
          .prepare(
            `SELECT * FROM DESPESAS
             WHERE ID_USUARIO = ? AND strftime('%Y', DT_DESPESA) = ?`
          )
          .all(usuario.ID_USUARIO, String(ano));
        const total = despesas.reduce((s, d) => s + d.VL_DESPESA, 0);
        resultado = { despesas, total, ano };
        break;
      }

      case "REMOVER_DESPESA": {
        const descricao = dados.descricao;
        if (!descricao) {
          return res.status(400).json({ error: "Não foi possível identificar qual despesa remover." });
        }
        const despesa = db
          .prepare(
            `SELECT * FROM DESPESAS
             WHERE ID_USUARIO = ? AND (DS_DESPESA = ? OR DS_DESPESA LIKE ?)
             ORDER BY DT_DESPESA DESC LIMIT 1`
          )
          .get(usuario.ID_USUARIO, descricao, `%${descricao}%`);
        if (!despesa) {
          return res.status(404).json({ error: `Nenhuma despesa encontrada com a descrição "${descricao}".` });
        }
        db.prepare("DELETE FROM DESPESAS WHERE ID_DESPESA = ?").run(despesa.ID_DESPESA);
        resultado = { mensagem: "Despesa removida com sucesso.", despesa_removida: despesa };
        break;
      }

      case "DESCONHECIDO":
      default:
        resultado = {
          mensagem: "Não entendi sua mensagem. Tente: adicionar despesa, ver gastos do mês/ano ou informar seu nome.",
        };
        break;
    }

    res.json({ acao, resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Erro ao processar mensagem.",
      detalhe: err.message,
    });
  }
});

// ---------------------- INTERPRETAÇÃO DE MENSAGENS ----------------------
// Recebe mensagem (ex: do WhatsApp), simula LLM e retorna acao + dados (sem executar)
app.post("/interpretar", (req, res) => {
  const { mensagem } = req.body;

  if (!mensagem) {
    return res.status(400).json({ error: "Envie uma mensagem válida para que eu possa interpretar." });
  }

  try {
    const resultado = interpretar(mensagem);
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      acao: "DESCONHECIDO",
      dados: { descricao: null, valor: null, data: null, tipo: null },
    });
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