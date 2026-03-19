const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

async function interpretarMensagem(mensagem) {
  const prompt = `
Você é um assistente que interpreta comandos financeiros enviados por WhatsApp.

Sua tarefa é converter a mensagem em JSON.

Ações possíveis:
- CRIAR_DESPESA
- LISTAR_DESPESAS_MES
- LISTAR_DESPESAS_ANO
- CRIAR_USUARIO
- ATUALIZAR_RENDA_MENSAL
- ATUALIZAR_DIA_RECEBIMENTO

Retorne SOMENTE JSON, sem texto adicional.

Exemplos:

Mensagem: "gastei 50 reais com mercado"
Resposta:
{"acao":"CRIAR_DESPESA","valor":50,"categoria":"mercado"}

Mensagem: "100 mercado"
Resposta:
{"acao":"CRIAR_DESPESA","valor":100,"categoria":"mercado"}

Mensagem: "quanto gastei esse mes"
Resposta:
{"acao":"LISTAR_DESPESAS_MES"}

Mensagem: "quanto gastei esse ano"
Resposta:
{"acao":"LISTAR_DESPESAS_ANO"}

Mensagem: "meu nome é João"
Resposta:
{"acao":"CRIAR_USUARIO","nome":"João"}

Mensagem: "200 luz e 100 agua"
Resposta:
{"despesas":[{"acao":"CRIAR_DESPESA","valor":200,"categoria":"luz"},{"acao":"CRIAR_DESPESA","valor":100,"categoria":"agua"}]}

Mensagem: "gastei 50 mercado e 30 padaria"
Resposta:
{"despesas":[{"acao":"CRIAR_DESPESA","valor":50,"categoria":"mercado"},{"acao":"CRIAR_DESPESA","valor":30,"categoria":"padaria"}]}

Mensagem do usuário:
"${mensagem}"
`;

  try {
    const result = await model.generateContent(prompt);
    const texto = result.response.text();
    const limpo = texto.replace(/```json|```/g, "").trim();
    return JSON.parse(limpo);
  } catch (err) {
    console.error("[Gemini] Erro ao interpretar:", err);
    return interpretarFallback(mensagem);
  }
}

/** Fallback quando cota do Gemini esgota (429) ou outro erro */
function interpretarFallback(mensagem) {
  const m = mensagem.trim().toLowerCase();

  if (/meu nome (e|é) (.+)/i.test(mensagem)) {
    const nome = mensagem.replace(/meu nome (e|é) /i, "").trim();
    return { acao: "CRIAR_USUARIO", nome };
  }

  if (/(liste|listar|mostre|quanto gastei|despesas? (do |desse )?mes|gastos (do )?mes)/i.test(m)) {
    return { acao: "LISTAR_DESPESAS_MES" };
  }
  if (/(despesas? (do |desse )?ano|gastos (do )?ano|quanto gastei (esse |no )?ano)/i.test(m)) {
    return { acao: "LISTAR_DESPESAS_ANO" };
  }

  const valorVirgula = mensagem.match(/(\d{1,6})[,\.](\d{1,2})\b/);
  const valorInteiro = mensagem.match(/\b(\d{1,6})\s+(reais?|r\$)?/i) || mensagem.match(/(\d{1,6})\s*$/);
  const valorMatch = valorVirgula || valorInteiro;

  // Ex: "meu salário é 1550" / "renda mensal 1200"
  if (valorMatch && /(sal[aá]rio|renda mensal|renda)/i.test(m)) {
    const valor = valorVirgula
      ? parseFloat(valorVirgula[1] + "." + valorVirgula[2])
      : parseInt(valorMatch[1], 10);

    if (valor > 0) return { acao: "ATUALIZAR_RENDA_MENSAL", valor };
  }

  // Ex: "recebo dia 20"
  const diaMatch = m.match(/dia\s*(\d{1,2})/i);
  if (diaMatch && /(recebo|sal[aá]rio|pagamento)/i.test(m)) {
    const dia = Number(diaMatch[1]);
    if (Number.isFinite(dia) && dia >= 1 && dia <= 31) return { acao: "ATUALIZAR_DIA_RECEBIMENTO", dia };
  }

  if (valorMatch) {
    let valor = valorVirgula
      ? parseFloat(valorVirgula[1] + "." + valorVirgula[2])
      : parseInt(valorMatch[1], 10);
    let categoria = mensagem
      .replace(/(\d{1,6})[,\.]?\d{0,2}\s*(reais?|r\$)?/gi, "")
      .replace(/\b(gastei|paguei|comprei)\s+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return { acao: "CRIAR_DESPESA", valor, categoria: categoria || "outros" };
  }

  return { acao: "DESCONHECIDO" };
}

module.exports = { interpretarMensagem };
