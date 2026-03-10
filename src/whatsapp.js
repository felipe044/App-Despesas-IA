async function enviarMensagem(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID não configurados.");
    return { ok: false, error: "Credenciais não configuradas" };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { body: text },
  };

  const TIMEOUT_MS = 30000;
  const MAX_TENTATIVAS = 2;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(id);

      const data = await res.json();
      if (!res.ok) {
        console.error("Erro ao enviar WhatsApp:", data);
        return { ok: false, error: data.error?.message || "Erro desconhecido" };
      }
      if (data.messages?.[0]?.id) {
        console.log("[WhatsApp API] Mensagem aceita, id:", data.messages[0].id);
      }
      return { ok: true };
    } catch (err) {
      const ehTimeout = err.name === "AbortError" || err.cause?.code === "UND_ERR_CONNECT_TIMEOUT";
      const podeRetentar = ehTimeout && tentativa < MAX_TENTATIVAS;
      console.error(`Erro ao enviar WhatsApp (tentativa ${tentativa}/${MAX_TENTATIVAS}):`, err.message);
      if (podeRetentar) {
        console.log("Aguardando 3s antes de reenviar...");
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { enviarMensagem };
