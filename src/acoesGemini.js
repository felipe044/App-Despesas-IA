const db = require("./db");

async function executarAcao(respostaIA, nr_telefone) {
  if (!respostaIA || !nr_telefone) {
    return { error: "Informe o número do telefone e a resposta da IA para prosseguir." };
  }

  const acao = respostaIA.acao || "DESCONHECIDO";
  let usuario = db.prepare("SELECT * FROM USUARIO WHERE NR_TELEFONE = ?").get(nr_telefone);

  const listaDespesas = Array.isArray(respostaIA.despesas) ? respostaIA.despesas : [];
  if (listaDespesas.length > 0) {
    if (!usuario) {
      return {
        error: "Olá! Para começar, me diga como posso te chamar. Exemplo: Meu nome é João",
      };
    }
    const hoje = new Date().toISOString().slice(0, 10);
    const stmt = db.prepare(
      `INSERT INTO DESPESAS (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA) VALUES (?, ?, ?, ?, ?)`
    );
    const criadas = [];
    for (const d of listaDespesas) {
      if (d.acao === "CRIAR_DESPESA" && d.valor) {
        const valor = Number(d.valor);
        const categoria = d.categoria || null;
        if (valor > 0) {
          stmt.run(usuario.ID_USUARIO, categoria, categoria, valor, hoje);
          criadas.push(`R$ ${valor} (${categoria || "geral"})`);
        }
      }
    }
    const msg = criadas.length > 0
      ? `Despesas salvas: ${criadas.join(", ")}`
      : "Nenhuma despesa válida encontrada.";
    return {
      acao: "CRIAR_DESPESA",
      resultado: { mensagem: msg },
    };
  }

  if (!usuario && acao !== "CRIAR_USUARIO") {
    return {
      error: "Olá! Para começar, me diga como posso te chamar. Exemplo: Meu nome é João",
    };
  }

  try {
    switch (acao) {
      case "CRIAR_DESPESA": {
        const valor = Number(respostaIA.valor);
        const categoria = respostaIA.categoria || null;
        if (!valor || valor <= 0) {
          return { error: "Não consegui identificar o valor. Ex: 50 mercado" };
        }
        const hoje = new Date().toISOString().slice(0, 10);
        const stmt = db.prepare(
          `INSERT INTO DESPESAS (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA) VALUES (?, ?, ?, ?, ?)`
        );
        stmt.run(usuario.ID_USUARIO, categoria, categoria, valor, hoje);
        return {
          acao: "CRIAR_DESPESA",
          resultado: { mensagem: `Despesa de R$ ${valor} (${categoria || "geral"}) salva com sucesso.` },
        };
      }

      case "LISTAR_DESPESAS_MES": {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = String(hoje.getFullYear());
        const despesas = db
          .prepare(
            `SELECT * FROM DESPESAS WHERE ID_USUARIO = ? AND strftime('%m', DT_DESPESA) = ? AND strftime('%Y', DT_DESPESA) = ?`
          )
          .all(usuario.ID_USUARIO, mes, ano);
        const total = despesas.reduce((s, d) => s + d.VL_DESPESA, 0);
        return {
          acao: "LISTAR_MENSAL",
          resultado: { despesas, total, mes, ano },
        };
      }

      case "LISTAR_DESPESAS_ANO": {
        const ano = String(new Date().getFullYear());
        const despesas = db
          .prepare(`SELECT * FROM DESPESAS WHERE ID_USUARIO = ? AND strftime('%Y', DT_DESPESA) = ?`)
          .all(usuario.ID_USUARIO, ano);
        const total = despesas.reduce((s, d) => s + d.VL_DESPESA, 0);
        return {
          acao: "LISTAR_ANUAL",
          resultado: { despesas, total, ano },
        };
      }

      case "CRIAR_USUARIO": {
        const nm_usuario = respostaIA.nome || null;
        if (!usuario) {
          const stmt = db.prepare("INSERT INTO USUARIO (NR_TELEFONE, NM_USUARIO) VALUES (?, ?)");
          stmt.run(nr_telefone, nm_usuario);
          return {
            acao: "CRIAR_USUARIO",
            resultado: { mensagem: nm_usuario ? `Olá, ${nm_usuario}! Usuário criado com sucesso.` : "Usuário criado com sucesso." },
          };
        }
        if (nm_usuario) {
          db.prepare("UPDATE USUARIO SET NM_USUARIO = ? WHERE NR_TELEFONE = ?").run(nm_usuario, nr_telefone);
        }
        return {
          acao: "CRIAR_USUARIO",
          resultado: { mensagem: nm_usuario ? `Nome atualizado para ${nm_usuario}.` : "Nome atualizado." },
        };
      }

      case "DESCONHECIDO":
      case "COMANDO_NAO_ENTENDIDO":
      default:
        return {
          acao: "DESCONHECIDO",
          resultado: {
            mensagem: "Não entendi. Tente: adicionar despesa (ex: 50 mercado), ver gastos (ex: quanto gastei esse mês), ou dizer seu nome (ex: meu nome é Maria).",
          },
        };
    }
  } catch (err) {
    console.error("[acoesGemini] Erro:", err);
    return {
      error: "Erro ao processar. Tente novamente.",
    };
  }
}

module.exports = { executarAcao };
