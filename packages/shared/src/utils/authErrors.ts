/**
 * Mapeia mensagens e códigos de erro do Supabase Auth para mensagens amigáveis em português.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado.';

  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Já existe uma conta cadastrada com este e-mail. Tente fazer login.';
  }

  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.';
  }

  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Por favor, insira um endereço de e-mail válido.';
  }

  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return 'Falha na conexão de rede. Verifique sua conexão com a internet.';
  }

  if (lower.includes('signup requires a valid password')) {
    return 'Por favor, forneça uma senha válida para o cadastro.';
  }

  return message || 'Não foi possível completar a operação. Tente novamente.';
}
