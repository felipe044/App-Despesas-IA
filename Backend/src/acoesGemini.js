const db = require("./db");
const { classificarAcessoPlataforma, buscarUsuarioPorTelefone } = require("./usuarioGate");
const { buildMensagemBloqueioWhatsApp } = require("./assinaturaConfig");

function erroSeNaoAtivo(nrRaw) {
  const gate = classificarAcessoPlataforma(nrRaw);
  if (gate.ativo) return null;
  return buildMensagemBloqueioWhatsApp(gate.razao);
}

async function executarAcao(respostaIA, nr_telefone) {
  if (!respostaIA || !nr_telefone) {
    return { error: "Informe o número do telefone e a resposta da IA para prosseguir." };
  }

  const bloqueio = erroSeNaoAtivo(nr_telefone);
  if (bloqueio) return { error: bloqueio };

  const { nr: nrNorm, row: usuario } = buscarUsuarioPorTelefone(nr_telefone);
  const acao = respostaIA.acao || "DESCONHECIDO";
  if (!nrNorm) {
    return { error: buildMensagemBloqueioWhatsApp("SEM_TELEFONE") };
  }

  const listaDespesas = Array.isArray(respostaIA.despesas) ? respostaIA.despesas : [];
  if (listaDespesas.length > 0) {
    if (!usuario) {
      return { error: buildMensagemBloqueioWhatsApp("SEM_USUARIO") };
    }
    const hoje = new Date().toISOString().slice(0, 10);
    const inclusao = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO DESPESAS (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA, DT_INCLUSAO) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const criadas = [];
    for (const d of listaDespesas) {
      if (d.acao === "CRIAR_DESPESA" && d.valor) {
        const valor = Number(d.valor);
        const categoria = d.categoria || null;
        if (valor > 0) {
          stmt.run(usuario.ID_USUARIO, categoria, categoria, valor, hoje, inclusao);
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
    return { error: buildMensagemBloqueioWhatsApp("SEM_USUARIO") };
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
        const inclusao = new Date().toISOString();
        const stmt = db.prepare(
          `INSERT INTO DESPESAS (ID_USUARIO, TP_DESPESA, DS_DESPESA, VL_DESPESA, DT_DESPESA, DT_INCLUSAO) VALUES (?, ?, ?, ?, ?, ?)`
        );
        stmt.run(usuario.ID_USUARIO, categoria, categoria, valor, hoje, inclusao);
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
          return { error: buildMensagemBloqueioWhatsApp("SEM_USUARIO") };
        }
        if (nm_usuario) {
          db.prepare("UPDATE USUARIO SET NM_USUARIO = ? WHERE NR_TELEFONE = ?").run(nm_usuario, nrNorm);
        }
        return {
          acao: "CRIAR_USUARIO",
          resultado: { mensagem: nm_usuario ? `Nome atualizado para ${nm_usuario}.` : "Nome atualizado." },
        };
      }

      case "ATUALIZAR_RENDA_MENSAL": {
        const valor = Number(respostaIA.valor);
        if (!valor || valor <= 0) {
          return { error: "Não consegui identificar o valor da renda mensal." };
        }

        db.prepare("UPDATE USUARIO SET VL_RENDA_MENSAL = ? WHERE ID_USUARIO = ?").run(valor, usuario.ID_USUARIO);
        return {
          acao: "ATUALIZAR_RENDA_MENSAL",
          resultado: { mensagem: `Renda mensal atualizada para R$ ${valor}.` },
        };
      }

      case "ATUALIZAR_DIA_RECEBIMENTO": {
        const dia = Number(respostaIA.dia);
        if (!dia || dia < 1 || dia > 31) {
          return { error: "Não consegui identificar um dia de recebimento válido (1 a 31)." };
        }

        db.prepare("UPDATE USUARIO SET NR_DIA_RECEBIMENTO = ? WHERE ID_USUARIO = ?").run(dia, usuario.ID_USUARIO);
        return {
          acao: "ATUALIZAR_DIA_RECEBIMENTO",
          resultado: { mensagem: `Dia de recebimento atualizado para dia ${dia}.` },
        };
      }

      case "DESCONHECIDO":
      case "COMANDO_NAO_ENTENDIDO":
      default:
        return {
          acao: "DESCONHECIDO",
          resultado: {
            mensagem:
              "Não entendi. Tente: adicionar despesa (ex: 50 mercado), ver gastos (ex: quanto gastei esse mês) ou atualizar seu nome (ex: meu nome é Maria).",
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
