/** Lê EXIGIR_ASSINATURA_HOTMART de forma tolerante (1, true, yes, sim, on). */
function exigirAssinaturaHotmart() {
  const v = String(process.env.EXIGIR_ASSINATURA_HOTMART ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "sim" || v === "on";
}

/**
 * Quem não pagou: sem cadastro, sem IA — só este texto (prioriza checkout Hotmart).
 */
function buildMensagemPrecisaAssinar() {
  const pag = (process.env.LINK_COMPRA_ASSINATURA || "").trim();
  const ig = (process.env.LINK_INSTAGRAM || "").trim();

  let msg =
    "Você *não é um usuário cadastrado ativo* neste assistente (número sem assinatura confirmada).\n\n" +
    "📸 *Conheça o serviço e faça seu cadastro pelo Instagram* — use o *mesmo número* deste WhatsApp no pagamento.\n\n";

  if (pag) {
    msg +=
      "👉 *Página de pagamento (Hotmart):*\n" +
      pag;
    if (ig) msg += "\n\n📸 *Instagram:* " + ig;
    return msg;
  }

  if (ig) {
    msg += "👉 Acesse nosso Instagram:\n" + ig;
    return msg;
  }

  return (
    msg +
    "Configure no servidor a variável *LINK_COMPRA_ASSINATURA* com o link da página de pagamento da Hotmart."
  );
}

/** Usuário cadastrado com TP_SITUACAO INATIVO (ex.: assinatura expirou ou cancelada). */
function buildMensagemAssinaturaExpirada() {
  const pag = (process.env.LINK_COMPRA_ASSINATURA || "").trim();
  const ig = (process.env.LINK_INSTAGRAM || "").trim();

  let msg =
    "Sua *assinatura não está ativa*. A assinatura expirou ou foi encerrada — *não é possível usar o assistente* até renovar o plano.\n\n";

  if (pag) {
    msg += "👉 *Renove aqui* (use o *mesmo número* deste WhatsApp no checkout):\n" + pag;
    if (ig) msg += "\n\n📸 Dúvidas: " + ig;
    return msg;
  }
  if (ig) {
    msg += "👉 Para renovar, use o link do Instagram:\n" + ig;
    return msg;
  }
  return (
    msg +
    "Configure no servidor *LINK_COMPRA_ASSINATURA* com o link da página de pagamento."
  );
}

/**
 * Mensagem única quando o WhatsApp bloqueia: sem usuário, inativo ou telefone inválido.
 * Sempre prioriza LINK_INSTAGRAM; opcionalmente checkout Hotmart.
 */
function buildMensagemBloqueioWhatsApp(razao) {
  const ig = (process.env.LINK_INSTAGRAM || "").trim();
  const pag = (process.env.LINK_COMPRA_ASSINATURA || "").trim();

  let corpo;
  if (razao === "INATIVO") {
    corpo =
      "Seu número *está cadastrado*, mas a situação está *inativa* (assinatura não ativa). " +
      "Não é possível usar o assistente até regularizar.\n\n";
  } else if (razao === "SEM_TELEFONE") {
    corpo = "Não foi possível identificar seu número corretamente.\n\n";
  } else {
    corpo =
      "Este número *não possui cadastro ativo* no assistente (não encontrado na base ou sem pagamento confirmado).\n\n";
  }

  corpo += "📸 *Acesse nosso Instagram* para conhecer o serviço, assinar e ativar com o *mesmo número* deste WhatsApp:\n";
  if (ig) {
    corpo += ig;
  } else {
    corpo += "(Configure *LINK_INSTAGRAM* no servidor.)";
  }

  if (pag) {
    corpo += "\n\n👉 *Página de pagamento (Hotmart):*\n" + pag;
  }

  return corpo;
}

module.exports = {
  exigirAssinaturaHotmart,
  buildMensagemPrecisaAssinar,
  buildMensagemAssinaturaExpirada,
  buildMensagemBloqueioWhatsApp,
};
