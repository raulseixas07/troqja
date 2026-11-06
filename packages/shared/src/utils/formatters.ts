/**
 * Formata um valor numérico para o padrão monetário brasileiro (R$ 1.250,00).
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const formatBRL = formatCurrencyBRL;

/**
 * Formata um número de telefone no padrão brasileiro (11) 98765-4321 ou (11) 3456-7890.
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Formata um CEP (12345-678).
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cep;
}

/**
 * Retorna uma string de tempo relativo amigável (ex: "Publicado hoje às 14:30", "Ontem", "12 de Out").
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (diffDays === 0) {
    return `Hoje às ${hours}:${minutes}`;
  }
  if (diffDays === 1) {
    return `Ontem às ${hours}:${minutes}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Calcula e formata a contagem regressiva para encerramento de um leilão estilo eBay.
 */
export function formatCountdown(isoDate?: string | null): {
  totalMs: number;
  isEncerrado: boolean;
  formatted: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  if (!isoDate) {
    return { totalMs: 0, isEncerrado: true, formatted: 'Sem prazo', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const end = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return { totalMs: 0, isEncerrado: true, formatted: 'Leilão encerrado', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h restantes`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m restantes`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s restantes`;
  } else {
    formatted = `${seconds}s restantes`;
  }

  return { totalMs: diff, isEncerrado: false, formatted, days, hours, minutes, seconds };
}
