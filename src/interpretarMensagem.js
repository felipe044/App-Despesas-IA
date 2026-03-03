/**
 * Módulo de interpretação de mensagens em português.
 * Simula integração com LLM (sem chave real) usando análise de padrões.
 */

const MESES = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03",
  abril: "04", maio: "05", junho: "06", julho: "07",
  agosto: "08", setembro: "09", outubro: "10",
  novembro: "11", dezembro: "12"
};

/**
 * Interpreta uma mensagem de texto em português e retorna JSON estruturado.
 * @param {string} mensagem - Texto enviado pelo usuário (ex: via WhatsApp)
 * @returns {{ acao: string, dados: { descricao: string|null, valor: number|null, data: string|null, tipo: string|null } }}
 */
function interpretar(mensagem) {
  if (!mensagem || typeof mensagem !== "string") {
    return respostaPadrao("DESCONHECIDO", null, null, null, null);
  }

  const texto = mensagem.trim().toLowerCase();

  // --- CRIAR_USUARIO: "Meu nome é Felipe", "Meu nome e Felipe", "Sou o João"
  if (
    /meu nome [eé]\s+(.+)/i.test(mensagem) ||
    /^sou (?:o|a)\s+(.+)/i.test(mensagem) ||
    /me chamo\s+(.+)/i.test(mensagem) ||
    /pode me chamar de\s+(.+)/i.test(mensagem)
  ) {
    let nome = null;
    const m1 = mensagem.match(/meu nome [eé]\s+(.+)/i);
    const m2 = mensagem.match(/^sou (?:o|a)\s+(.+)/i);
    const m3 = mensagem.match(/me chamo\s+(.+)/i);
    const m4 = mensagem.match(/pode me chamar de\s+(.+)/i);
    nome = (m1?.[1] || m2?.[1] || m3?.[1] || m4?.[1] || "").trim();
    return respostaPadrao("CRIAR_USUARIO", nome, null, null, null);
  }

  // --- CRIAR_DESPESA: "Gastei 50 reais com mercado hoje", "Adiciona despesa de 120 reais de internet"
  const padraoValor = /(\d+(?:[.,]\d+)?)\s*reais?/i;
  const valorMatch = mensagem.match(padraoValor);
  if (valorMatch) {
    const valor = parseFloat(valorMatch[1].replace(",", "."));
    let descricao = null;
    let data = hojeISO();
    let tipo = null;

    // Descrição: após "reais" -> "com X", "de X", "em X", "no X", "na X"
    const descMatch = mensagem.match(/reais?\s+(?:com|de|em|no|na)\s+([^0-9,]+?)(?:\s+hoje|\s+ontem|$|\.)/i);
    if (descMatch) {
      descricao = descMatch[1].trim();
      tipo = descricao.charAt(0).toUpperCase() + descricao.slice(1).toLowerCase();
    }

    // "hoje", "ontem", datas explícitas
    if (/\bhoje\b/i.test(mensagem)) data = hojeISO();
    else if (/\bontem\b/i.test(mensagem)) data = ontemISO();
    else if (/\bamanhã\b/i.test(mensagem) || /\bamanha\b/i.test(mensagem)) data = amanhaISO();

    return respostaPadrao("CRIAR_DESPESA", descricao, valor, data, tipo);
  }

  // --- CRIAR_DESPESA: "100 padaria", "200 mecanico", "50,50 posto"
  const padraoValorTipo = /^(\d+(?:[.,]\d+)?)\s+([a-zA-Záàâãéêíóôõúç\s]+)$/;
  const valorTipoMatch = mensagem.trim().match(padraoValorTipo);
  if (valorTipoMatch) {
    const valor = parseFloat(valorTipoMatch[1].replace(",", "."));
    const descricao = valorTipoMatch[2].trim();
    const tipo = descricao.charAt(0).toUpperCase() + descricao.slice(1).toLowerCase();
    return respostaPadrao("CRIAR_DESPESA", descricao, valor, hojeISO(), tipo);
  }

  // --- LISTAR_MENSAL: "Liste minhas despesas desse mês", "gastos desse mes", "despesas do mês"
  if (
    (texto.includes("despesa") || texto.includes("gasto")) &&
    /(desse|deste|do|esse|este)\s+m[eê]s/i.test(mensagem)
  ) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    return respostaPadrao("LISTAR_MENSAL", null, null, `${ano}-${mes}`, null);
  }

  // --- LISTAR_MENSAL: "Quero ver meus gastos de fevereiro", "gastos de março", "despesas de janeiro"
  for (const [nomeMes, numMes] of Object.entries(MESES)) {
    if (texto.includes(nomeMes) && (texto.includes("gasto") || texto.includes("despesa") || texto.includes("ver"))) {
      const ano = new Date().getFullYear();
      const data = `${ano}-${numMes}`;
      return respostaPadrao("LISTAR_MENSAL", null, null, data, null);
    }
  }

  // --- LISTAR_ANUAL: "Mostra meus gastos do ano", "resumo do ano"
  if (
    /gastos?\s+do\s+ano/i.test(mensagem) ||
    /mostra\s+meus\s+gastos/i.test(mensagem) && /ano/i.test(mensagem) ||
    /resumo\s+do\s+ano/i.test(mensagem) ||
    /despesas?\s+do\s+ano/i.test(mensagem)
  ) {
    const ano = new Date().getFullYear().toString();
    return respostaPadrao("LISTAR_ANUAL", null, null, ano, null);
  }

  // --- REMOVER_DESPESA: "Remove a despesa de mercado", "Excluir despesa X" (opcional, menos comum)
  if (/remov(?:er|a)|exclu(?:ir|a)|delet(?:ar|a)/i.test(mensagem) && /despesa/i.test(mensagem)) {
    const descMatch = mensagem.match(/despesa\s+(?:de\s+)?(.+?)$/i) || mensagem.match(/(.+?)\s+(?:despesa|gasto)/i);
    const descricao = descMatch ? descMatch[1].trim() : null;
    return respostaPadrao("REMOVER_DESPESA", descricao, null, null, null);
  }

  return respostaPadrao("DESCONHECIDO", null, null, null, null);
}

function respostaPadrao(acao, descricao, valor, data, tipo) {
  return {
    acao,
    dados: {
      descricao: descricao ?? null,
      valor: valor ?? null,
      data: data ?? null,
      tipo: tipo ?? null,
    },
  };
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function ontemISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function amanhaISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

module.exports = { interpretar };
