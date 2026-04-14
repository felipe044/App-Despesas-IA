const db = require("./db");
const { normalizarTelefoneBr } = require("./telefoneUtil");
const { buscarUsuarioPorTelefone } = require("./usuarioGate");
const { enviarBoasVindasAposPagamento } = require("./boasVindas");

function msParaIsoUtc(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return null;
  return new Date(Number(ms)).toISOString();
}

function montarContexto(body) {
  const data = body.data != null && typeof body.data === "object" ? body.data : body;
  const purchase = data.purchase ?? body.purchase;
  const subscription = data.subscription ?? body.subscription ?? purchase?.subscription;
  const buyer = data.buyer ?? body.buyer;
  const subscriberTop = data.subscriber ?? body.subscriber;
  return { purchase, subscription, buyer, subscriberTop };
}

function codigoAssinatura(ctx) {
  const { purchase, subscription, subscriberTop } = ctx;
  const sub = subscription ?? purchase?.subscription;
  if (sub?.subscriber?.code != null && String(sub.subscriber.code).trim() !== "") {
    return String(sub.subscriber.code).trim();
  }
  if (subscriberTop?.code != null && String(subscriberTop.code).trim() !== "") {
    return String(subscriberTop.code).trim();
  }
  if (sub?.id != null) return `hotmart_sub:${sub.id}`;
  const pur = purchase;
  if (pur?.transaction != null && String(pur.transaction).trim() !== "") {
    return `hotmart_tx:${String(pur.transaction).trim()}`;
  }
  if (pur?.id != null) return `hotmart_purchase:${pur.id}`;
  if (pur?.purchaseId != null) return `hotmart_purchase:${pur.purchaseId}`;
  if (pur?.order?.orderId != null) return `hotmart_order:${pur.order.orderId}`;
  return null;
}

function normalizarCandidatoTelefone(v) {
  if (v == null) return null;
  if (typeof v === "object") {
    const ddd = v.dddCell ?? v.ddd ?? v.area_code ?? v.areaCode;
    const cell = v.cell ?? v.number ?? v.phone ?? v.value;
    if (ddd != null && cell != null) {
      const n = normalizarTelefoneBr(`${String(ddd).replace(/\D/g, "")}${String(cell).replace(/\D/g, "")}`);
      if (n) return n;
    }
    if (cell != null) return normalizarTelefoneBr(cell);
    return null;
  }
  return normalizarTelefoneBr(v);
}

function coletarCandidatosTelefone(ctx) {
  const { buyer, subscriberTop, subscription, purchase } = ctx;
  const out = [];
  const pSub = subscriberTop?.phone ?? subscription?.subscriber?.phone;
  if (pSub?.dddCell != null && pSub?.cell != null) {
    out.push(`${pSub.dddCell}${pSub.cell}`);
  }
  if (pSub?.cell) out.push(pSub.cell);
  out.push(normalizarCandidatoTelefone(pSub));

  const pushBuyer = (b) => {
    if (!b || typeof b !== "object") return;
    out.push(
      b.checkout_phone,
      b.phone,
      b.cellphone,
      b.mobile,
      b.contact_phone,
      b.cell,
      b.telephone
    );
    if (Array.isArray(b.phones)) {
      for (const p of b.phones) out.push(typeof p === "string" ? p : p?.phone ?? p?.number);
    }
    out.push(normalizarCandidatoTelefone(b.phone));
  };

  pushBuyer(buyer);
  pushBuyer(purchase?.buyer);

  return out;
}

function extrairTelefone(ctx) {
  for (const c of coletarCandidatosTelefone(ctx)) {
    if (c == null || c === "") continue;
    const n =
      typeof c === "string" || typeof c === "number"
        ? normalizarTelefoneBr(c)
        : typeof c === "object"
          ? normalizarCandidatoTelefone(c)
          : null;
    if (n) return n;
  }
  return null;
}

function extrairNomeComprador(ctx) {
  const pick = (b) => {
    if (!b || typeof b !== "object") return null;
    const n = b.name ?? b.first_name ?? b.full_name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  };
  return pick(ctx.buyer) || pick(ctx.purchase?.buyer);
}

/** Garante linha em USUARIO com TP_SITUACAO = ATIVO (usa as mesmas variações de número do gate). */
function garantirUsuarioAtivoPorTelefone(tel, nomeOpcional) {
  const chave = normalizarTelefoneBr(tel);
  if (!chave) return;
  const { row } = buscarUsuarioPorTelefone(tel);
  if (row) {
    db.prepare(
      `UPDATE USUARIO SET TP_SITUACAO = 'ATIVO', NM_USUARIO = COALESCE(?, NM_USUARIO) WHERE ID_USUARIO = ?`
    ).run(nomeOpcional || null, row.ID_USUARIO);
  } else {
    db.prepare(`INSERT INTO USUARIO (NR_TELEFONE, NM_USUARIO, TP_SITUACAO) VALUES (?, ?, 'ATIVO')`).run(
      chave,
      nomeOpcional || null
    );
  }
}

function definirUsuarioInativoPorTelefone(tel) {
  const { row } = buscarUsuarioPorTelefone(tel);
  if (!row) return;
  db.prepare(`UPDATE USUARIO SET TP_SITUACAO = 'INATIVO' WHERE ID_USUARIO = ?`).run(row.ID_USUARIO);
}

function desativarAssinatura(codigo, tel) {
  let phoneParaUsuario = tel ? normalizarTelefoneBr(tel) : null;
  if (codigo) {
    const antes = db.prepare("SELECT NR_TELEFONE FROM ASSINATURA_HOTMART WHERE CD_SUBSCRICAO = ?").get(codigo);
    if (antes?.NR_TELEFONE) phoneParaUsuario = normalizarTelefoneBr(antes.NR_TELEFONE);
    db.prepare(
      `UPDATE ASSINATURA_HOTMART SET ST_ATIVA = 0, DT_ATUALIZACAO = datetime('now') WHERE CD_SUBSCRICAO = ?`
    ).run(codigo);
  } else if (tel) {
    db.prepare(
      `UPDATE ASSINATURA_HOTMART SET ST_ATIVA = 0, DT_ATUALIZACAO = datetime('now') WHERE NR_TELEFONE = ? AND ST_ATIVA = 1`
    ).run(tel);
  }
  if (phoneParaUsuario) definirUsuarioInativoPorTelefone(phoneParaUsuario);
}

function upsertAssinaturaAtiva(codigo, tel, dtValidadeIso) {
  db.prepare(
    `INSERT INTO ASSINATURA_HOTMART (CD_SUBSCRICAO, NR_TELEFONE, ST_ATIVA, DT_VALIDADE_ATE, DT_ATUALIZACAO)
     VALUES (?, ?, 1, ?, datetime('now'))
     ON CONFLICT(CD_SUBSCRICAO) DO UPDATE SET
       NR_TELEFONE = excluded.NR_TELEFONE,
       ST_ATIVA = 1,
       DT_VALIDADE_ATE = COALESCE(excluded.DT_VALIDADE_ATE, ASSINATURA_HOTMART.DT_VALIDADE_ATE),
       DT_ATUALIZACAO = datetime('now')`
  ).run(codigo, tel, dtValidadeIso);
}

const EVENTOS_ATIVAR = new Set([
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_BILLET_PAYED",
  "PURCHASE_ORDER_APPROVED",
]);

const EVENTOS_DESATIVAR = new Set([
  "PURCHASE_CANCELED",
  "PURCHASE_CANCELLED",
  "SUBSCRIPTION_CANCELLATION",
  "PURCHASE_EXPIRED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_DELAYED",
]);

const EVENTOS_ATUALIZAR_DATA = new Set([
  "SUBSCRIPTION_RENEWAL_DATE_UPDATE",
  "SUBSCRIPTION_BILLING_DATE_CHANGE",
  "SUBSCRIPTION_PLAN_CHANGE",
]);

const STATUS_COMPRA_BLOQUEIA = new Set([
  "CANCELLED",
  "REFUNDED",
  "CHARGEBACK",
  "EXPIRED",
  "OVERDUE",
  "BLOCKED",
]);

const STATUS_ASSINATURA_BLOQUEIA = new Set([
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_SELLER",
  "CANCELLED_BY_ADMIN",
  "INACTIVE",
]);

async function processarWebhookHotmart(body) {
  const event = body?.event;
  if (!event) {
    console.warn("[Hotmart] Payload sem campo event");
    return;
  }

  const ctx = montarContexto(body);
  const codigo = codigoAssinatura(ctx);
  const tel = extrairTelefone(ctx);
  const nome = extrairNomeComprador(ctx);
  const purchase = ctx.purchase;
  const subscription = ctx.subscription;
  const purchaseStatus = purchase?.status;
  const subStatus = subscription?.status;

  console.log(
    "[Hotmart] recebido:",
    event,
    "| tel:",
    tel ?? "sem",
    "| codigo:",
    codigo ?? "sem"
  );

  if (EVENTOS_DESATIVAR.has(event)) {
    desativarAssinatura(codigo, tel);
    console.log("[Hotmart]", event, "assinatura desativada", { codigo, tel });
    return;
  }

  if (EVENTOS_ATIVAR.has(event)) {
    if (purchaseStatus && STATUS_COMPRA_BLOQUEIA.has(purchaseStatus)) {
      desativarAssinatura(codigo, tel);
      console.log("[Hotmart]", event, "ignorado (status compra):", purchaseStatus);
      return;
    }
    if (subStatus && STATUS_ASSINATURA_BLOQUEIA.has(subStatus)) {
      desativarAssinatura(codigo, tel);
      console.log("[Hotmart]", event, "ignorado (status assinatura):", subStatus);
      return;
    }
    if (!tel) {
      console.warn(
        "[Hotmart] Ativação ignorada: telefone não veio no payload — confira se o checkout coleta celular e se o produto envia buyer no webhook.",
        { event, codigo }
      );
      return;
    }
    const codigoFinal = codigo || `hotmart_phone:${tel}`;
    const dtMs = purchase?.date_next_charge ?? subscription?.date_next_charge;
    upsertAssinaturaAtiva(codigoFinal, tel, msParaIsoUtc(dtMs));
    garantirUsuarioAtivoPorTelefone(tel, nome);
    console.log("[Hotmart]", event, "assinatura ativa / usuário ATIVO", { codigo: codigoFinal, tel });
    await enviarBoasVindasAposPagamento(tel);
    return;
  }

  if (EVENTOS_ATUALIZAR_DATA.has(event) && codigo) {
    const dtMs = purchase?.date_next_charge ?? subscription?.date_next_charge;
    const iso = msParaIsoUtc(dtMs);
    db.prepare(
      `UPDATE ASSINATURA_HOTMART SET DT_VALIDADE_ATE = COALESCE(?, DT_VALIDADE_ATE), DT_ATUALIZACAO = datetime('now') WHERE CD_SUBSCRICAO = ?`
    ).run(iso, codigo);
    if (tel) garantirUsuarioAtivoPorTelefone(tel, nome);
    console.log("[Hotmart]", event, "data atualizada", { codigo });
    return;
  }

  console.log("[Hotmart] Evento recebido (sem ação específica):", event);
}

function verificarHottok(req) {
  const esperado = process.env.HOTMART_HOTTOK;
  if (!esperado || !String(esperado).trim()) return true;
  const e = String(esperado).trim();
  // Hotmart oficial: X-HOTMART-HOTTOK. Postman/docs às vezes usam só HOTMART_HOTTOK.
  const recebido =
    req.get("X-HOTMART-HOTTOK") || req.get("HOTMART_HOTTOK") || "";
  return String(recebido).trim() === e;
}

module.exports = {
  processarWebhookHotmart,
  verificarHottok,
  normalizarTelefoneBr,
};
