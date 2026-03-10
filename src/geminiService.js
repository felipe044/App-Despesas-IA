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
    return { acao: "DESCONHECIDO" };
  }
}

module.exports = { interpretarMensagem };
