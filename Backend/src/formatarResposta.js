function formatarResposta(acao, resultado) {
  if (!resultado) return "Ocorreu um erro.";

  switch (acao) {
    case "CRIAR_USUARIO":
      return resultado.mensagem;

    case "CRIAR_DESPESA":
      return resultado.mensagem;

    case "ATUALIZAR_RENDA_MENSAL":
      return resultado.mensagem;

    case "ATUALIZAR_DIA_RECEBIMENTO":
      return resultado.mensagem;

    case "LISTAR_MENSAL": {
      const { despesas, total, mes, ano } = resultado;
      if (!despesas || despesas.length === 0) {
        return `Nenhuma despesa em ${mes}/${ano}. Total: R$ 0`;
      }
      const linhas = despesas.map(
        (d) => `• ${d.DS_DESPESA || d.TP_DESPESA || "Sem descrição"}: R$ ${d.VL_DESPESA}`
      );
      return `📋 *Despesas ${mes}/${ano}*\n\n${linhas.join("\n")}\n\n💰 *Total: R$ ${total.toFixed(2)}*`;
    }

    case "LISTAR_ANUAL": {
      const { despesas, total, ano } = resultado;
      if (!despesas || despesas.length === 0) {
        return `Nenhuma despesa em ${ano}. Total: R$ 0`;
      }
      const linhas = despesas.slice(0, 15).map(
        (d) => `• ${d.DS_DESPESA || d.TP_DESPESA || "Sem descrição"}: R$ ${d.VL_DESPESA} (${d.DT_DESPESA})`
      );
      const mais = despesas.length > 15 ? `\n... e mais ${despesas.length - 15} despesas` : "";
      return `📋 *Despesas ${ano}*\n\n${linhas.join("\n")}${mais}\n\n💰 *Total: R$ ${total.toFixed(2)}*`;
    }

    case "DESCONHECIDO":
    default:
      return resultado.mensagem || "Não entendi. Tente: adicionar despesa, ver gastos do mês/ano ou informar seu nome.";
  }
}

module.exports = { formatarResposta };
