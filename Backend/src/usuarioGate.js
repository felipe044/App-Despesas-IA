/**
 * Regra de acesso ao bot (WhatsApp /processar / executarAcao):
 *
 * 1) SELECT na tabela USUARIO pelo NR_TELEFONE normalizado (55 + DDD + número).
 * 2) Sem linha → não cadastrado → bloquear.
 * 3) Linha com TP_SITUACAO ≠ 'ATIVO' → inativo → bloquear.
 * 4) TP_SITUACAO = 'ATIVO' → seguir fluxo (Gemini, comandos).
 *
 * O webhook da Hotmart atualiza USUARIO.TP_SITUACAO ao confirmar/cancelar pagamento.
 */

const db = require("./db");
const { normalizarTelefoneBr, variacoesChaveBrasil } = require("./telefoneUtil");

const stmtUsuario = db.prepare(`SELECT * FROM USUARIO WHERE NR_TELEFONE = ?`);

/** Uma linha de USUARIO ou undefined (tenta variações BR do mesmo número). */
function buscarUsuarioPorTelefone(nrRaw) {
  const nr = normalizarTelefoneBr(nrRaw);
  if (!nr) return { nr: null, row: undefined };
  const chaves = variacoesChaveBrasil(nr);
  let row;
  let usado = nr;
  for (const k of chaves) {
    row = stmtUsuario.get(k);
    if (row) {
      usado = row.NR_TELEFONE;
      break;
    }
  }
  return { nr: usado, row };
}

/**
 * Resultado do “existe? está ativo?” usado no webhook WhatsApp e em executarAcao.
 *
 * @returns {{ ativo: true } | { ativo: false, razao: 'SEM_TELEFONE' | 'SEM_USUARIO' | 'INATIVO' }}
 */
function classificarAcessoPlataforma(nrRaw) {
  const { nr, row } = buscarUsuarioPorTelefone(nrRaw);
  if (!nr) return { ativo: false, razao: "SEM_TELEFONE" };
  if (!row) return { ativo: false, razao: "SEM_USUARIO" };
  const sit = String(row.TP_SITUACAO || "").trim().toUpperCase();
  if (sit === "ATIVO") return { ativo: true };
  return { ativo: false, razao: "INATIVO" };
}

function assinaturaAtivaParaTelefone(nrRaw) {
  return classificarAcessoPlataforma(nrRaw).ativo === true;
}

module.exports = {
  buscarUsuarioPorTelefone,
  classificarAcessoPlataforma,
  assinaturaAtivaParaTelefone,
};
