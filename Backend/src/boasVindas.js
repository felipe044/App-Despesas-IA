const db = require("./db");
const { normalizarTelefoneBr } = require("./telefoneUtil");
const { classificarAcessoPlataforma } = require("./usuarioGate");

function usuarioTpSituacaoAtivo(nrRaw) {
  return classificarAcessoPlataforma(nrRaw).ativo === true;
}

function jaRecebeuBoasVindas(nrRaw) {
  const nr = normalizarTelefoneBr(nrRaw);
  if (!nr) return true;
  const row = db.prepare("SELECT 1 FROM WHATSAPP_BOAS_VINDAS WHERE NR_TELEFONE = ?").get(nr);
  return Boolean(row);
}

function marcarBoasVindas(nrRaw) {
  const nr = normalizarTelefoneBr(nrRaw);
  if (!nr) return;
  db.prepare(
    "INSERT OR IGNORE INTO WHATSAPP_BOAS_VINDAS (NR_TELEFONE, DT_ENVIO) VALUES (?, datetime('now'))"
  ).run(nr);
}

/** Mensagem enviada *após* pagamento confirmado (webhook Hotmart) — marketing fica no Instagram. */
function textoBoasVindasAposPagamento() {
  const ig = (process.env.LINK_INSTAGRAM || "").trim();
  const blocoIg = ig
    ? `\n\n📸 Novidades e dicas: ${ig}`
    : "\n\n📸 Acompanhe novidades no nosso Instagram (link na bio).";
  return (
    "Pagamento confirmado! 🎉 *Bem-vindo(a)!*\n\n" +
    "Sou seu assistente de *finanças por aqui*, com IA: escreva como no dia a dia que eu entendo.\n\n" +
    "📌 *Como usar*\n" +
    "📝 *Gasto:* _gastei 45 no mercado_ · _100 luz_\n" +
    "📊 *Resumo:* _quanto gastei esse mês?_ · _quanto gastei esse ano?_\n" +
    "👤 *Nome (opcional):* _meu nome é Maria_\n" +
    "✨ *Vários de uma vez:* _50 padaria e 30 uber_\n\n" +
    "Pode mandar mensagem quando quiser — estou por aqui. 🚀" +
    blocoIg
  );
}

async function enviarBoasVindasAposPagamento(nrRaw) {
  const { enviarMensagem } = require("./whatsapp");
  const nr = normalizarTelefoneBr(nrRaw);
  if (!nr) {
    console.warn("[Boas-vindas] Telefone inválido após pagamento");
    return;
  }
  if (!usuarioTpSituacaoAtivo(nr)) {
    console.warn("[Boas-vindas] Ignorado: usuário não está ATIVO em USUARIO.TP_SITUACAO", nr);
    return;
  }
  if (jaRecebeuBoasVindas(nr)) {
    return;
  }
  const envio = await enviarMensagem(nr, textoBoasVindasAposPagamento());
  if (envio.ok) {
    marcarBoasVindas(nr);
    console.log("[Boas-vindas] Enviado para", nr, "(pós-pagamento Hotmart)");
  } else {
    console.error("[Boas-vindas] Falha WhatsApp:", envio.error);
  }
}

module.exports = {
  jaRecebeuBoasVindas,
  marcarBoasVindas,
  textoBoasVindasAposPagamento,
  enviarBoasVindasAposPagamento,
};
