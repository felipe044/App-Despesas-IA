export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formata número de WhatsApp BR conforme usuário digita.
 * Exemplo: (11) 99999-9999
 *
 * Observação: internamente o backend/front-end sempre envia números apenas com dígitos
 * (usando `onlyDigits`).
 */
export function formatWhatsAppBR(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return '';

  // Se o usuário colar com DDI (ex: 55 + DDD + número), remove "55" para formatar.
  if (digits.startsWith('55') && digits.length > 11) {
    return formatWhatsAppBR(digits.slice(2));
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) return `(${ddd}`;
  if (rest.length === 0) return `(${ddd})`;

  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;

  // Celular: 9 dígitos (ex: 99999-9999)
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

