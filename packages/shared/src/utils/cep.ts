export interface EnderecoViaCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;        // Estado
  erro?: boolean;
}

/**
 * Consulta endereço completo a partir do CEP brasileiro via API pública ViaCEP.
 */
export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoViaCEP | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;

    const data = (await res.json()) as EnderecoViaCEP;
    if (data.erro) return null;

    return data;
  } catch {
    return null;
  }
}
