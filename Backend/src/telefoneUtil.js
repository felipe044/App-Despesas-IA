function normalizarTelefoneBr(v) {
  if (v == null) return null;
  const d = String(v).replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 11 && !d.startsWith("55")) return `55${d}`;
  return d;
}

/**
 * Variações BR (com/sem 9 móvel após o DDD) para bater NR_TELEFONE no SQLite.
 * - 13 dígitos (55+DD+9+8): gera também 12 dígitos sem o 9 móvel (formato que o WhatsApp costuma enviar).
 * - 12 dígitos (55+DD+8): gera também 13 inserindo o 9 após o DDD. Os 8 locais podem começar com 9
 *   (ex.: 97681958) — é o caso típico em que o Meta manda 554497681958 e a base tem 5544997681958.
 */
function variacoesChaveBrasil(nrDigits) {
  const s = String(nrDigits || "").replace(/\D/g, "");
  const out = new Set();
  if (s) out.add(s);
  if (s.length === 13 && s.startsWith("55")) {
    const ddd = s.slice(2, 4);
    const rest = s.slice(4);
    if (rest.length === 9 && rest[0] === "9") {
      out.add(`55${ddd}${rest.slice(1)}`);
    }
  }
  if (s.length === 12 && s.startsWith("55")) {
    const ddd = s.slice(2, 4);
    const rest = s.slice(4);
    if (rest.length === 8) {
      out.add(`55${ddd}9${rest}`);
    }
  }
  return [...out];
}

module.exports = { normalizarTelefoneBr, variacoesChaveBrasil };
