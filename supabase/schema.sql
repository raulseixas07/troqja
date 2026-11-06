-- ==============================================================================
-- PROJETO CLONE OLX - SCRIPT DE ESTRUTURA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Este script configura o schema completo: tabelas, constraints, índices de alta performance,
-- triggers automáticos, Row Level Security (RLS), buckets de storage e seed inicial.

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TIPOS E ENUMS
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE status_anuncio AS ENUM ('ativo', 'pausado', 'vendido', 'excluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABELA: profiles (Perfis de Usuários conectados ao auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    bio TEXT,
    cidade TEXT,
    estado VARCHAR(2),
    cep VARCHAR(9),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Perfis públicos e dados complementares dos usuários autenticados.';

-- ==============================================================================
-- 3. TABELA: categorias (Categorias dos Anúncios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icone TEXT, -- Nome do ícone (Lucide Icons / Feather) ou URL do ícone
    ordem INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.categorias IS 'Categorias organizacionais dos anúncios (Ex: Autos, Imóveis, Eletrônicos).';

-- ==============================================================================
-- 4. TABELA: anuncios (Classificados principais)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.anuncios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (preco >= 0),
    modalidade TEXT NOT NULL DEFAULT 'venda' CHECK (modalidade IN ('venda', 'leilao', 'troca')),
    aceita_troca BOOLEAN NOT NULL DEFAULT false,
    itens_troca TEXT,
    lance_inicial NUMERIC(12, 2) CHECK (lance_inicial >= 0),
    lance_atual NUMERIC(12, 2) CHECK (lance_atual >= 0),
    incremento_minimo NUMERIC(12, 2) NOT NULL DEFAULT 10.00 CHECK (incremento_minimo > 0),
    leilao_encerramento TIMESTAMPTZ,
    status status_anuncio NOT NULL DEFAULT 'ativo',
    visualizacoes INTEGER NOT NULL DEFAULT 0 CHECK (visualizacoes >= 0),
    cep VARCHAR(9),
    cidade TEXT NOT NULL,
    estado VARCHAR(2) NOT NULL,
    bairro TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.anuncios IS 'Anúncios cadastrados pelos usuários na plataforma.';

-- ==============================================================================
-- 5. TABELA: fotos_anuncio (Galeria de Imagens dos Anúncios em WebP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fotos_anuncio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Caminho relativo no bucket 'anuncios' (ex: 123/foto.webp)
    url TEXT NOT NULL,          -- URL pública completa ou assinada
    ordem INTEGER NOT NULL DEFAULT 0,
    is_principal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.fotos_anuncio IS 'Fotos do anúncio armazenadas no Supabase Storage em formato WebP.';

-- ==============================================================================
-- 6. TABELA: conversas (Canais de Chat entre Comprador e Vendedor por Anúncio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    comprador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT uq_anuncio_comprador UNIQUE (anuncio_id, comprador_id),
    CONSTRAINT chk_diferente_usuario CHECK (comprador_id <> vendedor_id)
);

COMMENT ON TABLE public.conversas IS 'Conversas iniciadas por compradores sobre um anúncio específico.';

-- ==============================================================================
-- 7. TABELA: mensagens (Mensagens de texto trocadas no chat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.mensagens IS 'Histórico de mensagens dentro de cada conversa.';

-- ==============================================================================
-- 8. TABELA: lances (Histórico de Lances em Modo Leilão em Tempo Real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.lances IS 'Histórico de lances dados por usuários em anúncios no modo leilão.';

-- ==============================================================================
-- 9. TABELA: avaliacoes (Feedback Stars Estilo eBay)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID REFERENCES public.anuncios(id) ON DELETE SET NULL,
    avaliador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    avaliado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT chk_diferente_usuario_avaliacao CHECK (avaliador_id <> avaliado_id)
);

COMMENT ON TABLE public.avaliacoes IS 'Avaliações e reputação de usuários (1 a 5 estrelas) após negociações.';

-- View para consulta consolidada de reputação
CREATE OR REPLACE VIEW public.reputacao_usuarios AS
SELECT 
    p.id AS user_id,
    COALESCE(ROUND(AVG(a.nota)::numeric, 1), 5.0) AS media_estrelas,
    COUNT(a.id)::INTEGER AS total_avaliacoes
FROM public.profiles p
LEFT JOIN public.avaliacoes a ON a.avaliado_id = p.id
GROUP BY p.id;

-- ==============================================================================
-- 8. ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_anuncios_user_id ON public.anuncios(user_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_categoria_id ON public.anuncios(categoria_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_status ON public.anuncios(status);
CREATE INDEX IF NOT EXISTS idx_anuncios_cidade_estado ON public.anuncios(estado, cidade);
CREATE INDEX IF NOT EXISTS idx_anuncios_created_at ON public.anuncios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anuncios_modalidade ON public.anuncios(modalidade);
CREATE INDEX IF NOT EXISTS idx_anuncios_aceita_troca ON public.anuncios(aceita_troca);
CREATE INDEX IF NOT EXISTS idx_anuncios_leilao_encerramento ON public.anuncios(leilao_encerramento);
CREATE INDEX IF NOT EXISTS idx_lances_anuncio_id ON public.lances(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_lances_usuario_id ON public.lances(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lances_created_at ON public.lances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado_id ON public.avaliacoes(avaliado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador_id ON public.avaliacoes(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_anuncio_id ON public.avaliacoes(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_fotos_anuncio_id ON public.fotos_anuncio(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_conversas_comprador ON public.conversas(comprador_id);
CREATE INDEX IF NOT EXISTS idx_conversas_vendedor ON public.conversas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_id ON public.mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON public.mensagens(created_at ASC);

-- Índice GIN para busca textual por título e descrição
CREATE INDEX IF NOT EXISTS idx_anuncios_busca_textual ON public.anuncios 
USING gin(to_tsvector('portuguese', titulo || ' ' || descricao));

-- ==============================================================================
-- 9. TRIGGERS E FUNÇÕES AUXILIARES
-- ==============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_anuncios_updated_at ON public.anuncios;
CREATE TRIGGER trigger_anuncios_updated_at
    BEFORE UPDATE ON public.anuncios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_conversas_updated_at ON public.conversas;
CREATE TRIGGER trigger_conversas_updated_at
    BEFORE UPDATE ON public.conversas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar timestamp da conversa quando receber nova mensagem
CREATE OR REPLACE FUNCTION public.handle_nova_mensagem()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversas
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nova_mensagem ON public.mensagens;
CREATE TRIGGER trigger_nova_mensagem
    AFTER INSERT ON public.mensagens
    FOR EACH ROW EXECUTE FUNCTION public.handle_nova_mensagem();

-- Função e trigger para criar profile automaticamente quando o usuário faz signup no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, telefone, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'telefone', NEW.raw_user_meta_data->>'phone'),
        NEW.raw_user_meta_data->>'avatar_url',
        TIMEZONE('utc'::TEXT, NOW()),
        TIMEZONE('utc'::TEXT, NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função segura para incrementar contador de visualizações de anúncio
CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    UPDATE public.anuncios
    SET visualizacoes = COALESCE(visualizacoes, 0) + 1
    WHERE id = p_anuncio_id
    RETURNING visualizacoes INTO v_total;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(UUID) TO anon, authenticated, service_role;

-- Função segura para marcar mensagens de uma conversa como lidas
CREATE OR REPLACE FUNCTION public.marcar_mensagens_como_lidas(p_conversa_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_afetadas INTEGER;
BEGIN
    UPDATE public.mensagens
    SET lida = true
    WHERE conversa_id = p_conversa_id
      AND sender_id <> p_user_id
      AND lida = false;

    GET DIAGNOSTICS v_afetadas = ROW_COUNT;
    RETURN COALESCE(v_afetadas, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_mensagens_como_lidas(UUID, UUID) TO anon, authenticated, service_role;

-- Função segura para obter contagem total de mensagens não lidas de um usuário
CREATE OR REPLACE FUNCTION public.obter_total_mensagens_nao_lidas(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.mensagens m
    JOIN public.conversas c ON c.id = m.conversa_id
    WHERE (c.comprador_id = p_user_id OR c.vendedor_id = p_user_id)
      AND m.sender_id <> p_user_id
      AND m.lida = false;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_total_mensagens_nao_lidas(UUID) TO anon, authenticated, service_role;

-- Função atômica e segura para registrar novo lance em leilão
CREATE OR REPLACE FUNCTION public.registrar_lance(
    p_anuncio_id UUID,
    p_valor NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_anuncio RECORD;
    v_minimo_necessario NUMERIC;
    v_novo_lance RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado. Faça login para dar lances.';
    END IF;

    SELECT * INTO v_anuncio
    FROM public.anuncios
    WHERE id = p_anuncio_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anúncio não encontrado.';
    END IF;

    IF v_anuncio.modalidade <> 'leilao' THEN
        RAISE EXCEPTION 'Este anúncio não está configurado na modalidade leilão.';
    END IF;

    IF v_anuncio.status <> 'ativo' THEN
        RAISE EXCEPTION 'Este leilão não está ativo para receber lances.';
    END IF;

    IF v_anuncio.user_id = v_user_id THEN
        RAISE EXCEPTION 'Você é o proprietário deste anúncio e não pode dar lances nele.';
    END IF;

    IF v_anuncio.leilao_encerramento IS NOT NULL AND NOW() >= v_anuncio.leilao_encerramento THEN
        RAISE EXCEPTION 'Este leilão já encerrou o período de lances.';
    END IF;

    IF v_anuncio.lance_atual IS NOT NULL AND v_anuncio.lance_atual > 0 THEN
        v_minimo_necessario := v_anuncio.lance_atual + COALESCE(v_anuncio.incremento_minimo, 10.00);
    ELSE
        v_minimo_necessario := COALESCE(v_anuncio.lance_inicial, 1.00);
    END IF;

    IF p_valor < v_minimo_necessario THEN
        RAISE EXCEPTION 'O valor do lance (R$ %) é inferior ao mínimo obrigatório (R$ %).', p_valor, v_minimo_necessario;
    END IF;

    INSERT INTO public.lances (anuncio_id, usuario_id, valor, created_at)
    VALUES (p_anuncio_id, v_user_id, p_valor, TIMEZONE('utc'::TEXT, NOW()))
    RETURNING * INTO v_novo_lance;

    UPDATE public.anuncios
    SET lance_atual = p_valor,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_anuncio_id;

    RETURN jsonb_build_object(
        'success', true,
        'lance_id', v_novo_lance.id,
        'anuncio_id', p_anuncio_id,
        'valor', p_valor,
        'created_at', v_novo_lance.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_lance(UUID, NUMERIC) TO authenticated, service_role;

-- Função segura para obter reputação por estrelas do usuário
CREATE OR REPLACE FUNCTION public.obter_reputacao_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_media NUMERIC(3, 1);
    v_total INTEGER;
BEGIN
    SELECT 
        COALESCE(ROUND(AVG(nota)::numeric, 1), 5.0),
        COUNT(*)::INTEGER
    INTO v_media, v_total
    FROM public.avaliacoes
    WHERE avaliado_id = p_user_id;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'media_estrelas', COALESCE(v_media, 5.0),
        'total_avaliacoes', COALESCE(v_total, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_reputacao_usuario(UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_anuncio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- 10.1 Policies para 'profiles'
CREATE POLICY "Perfis são visíveis publicamente"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 10.2 Policies para 'categorias'
CREATE POLICY "Categorias são públicas para leitura"
    ON public.categorias FOR SELECT
    USING (true);

-- 10.3 Policies para 'anuncios'
CREATE POLICY "Anúncios ativos são visíveis publicamente"
    ON public.anuncios FOR SELECT
    USING (status = 'ativo' OR auth.uid() = user_id);

CREATE POLICY "Usuários autenticados podem criar anúncios"
    ON public.anuncios FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios anúncios"
    ON public.anuncios FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios anúncios"
    ON public.anuncios FOR DELETE
    USING (auth.uid() = user_id);

-- 10.4 Policies para 'fotos_anuncio'
CREATE POLICY "Fotos de anúncios visíveis são públicas para leitura"
    ON public.fotos_anuncio FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.anuncios
            WHERE anuncios.id = fotos_anuncio.anuncio_id
            AND (anuncios.status = 'ativo' OR anuncios.user_id = auth.uid())
        )
    );

CREATE POLICY "Dono do anúncio pode gerenciar fotos"
    ON public.fotos_anuncio FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.anuncios
            WHERE anuncios.id = fotos_anuncio.anuncio_id
            AND anuncios.user_id = auth.uid()
        )
    );

-- 10.5 Policies para 'conversas'
CREATE POLICY "Participantes podem visualizar suas conversas"
    ON public.conversas FOR SELECT
    USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

CREATE POLICY "Compradores podem iniciar conversas"
    ON public.conversas FOR INSERT
    WITH CHECK (auth.uid() = comprador_id AND auth.uid() <> vendedor_id);

-- 10.6 Policies para 'mensagens'
CREATE POLICY "Participantes da conversa podem ver as mensagens"
    ON public.mensagens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversas
            WHERE conversas.id = mensagens.conversa_id
            AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
        )
    );

CREATE POLICY "Participantes podem enviar mensagens"
    ON public.mensagens FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversas
            WHERE conversas.id = mensagens.conversa_id
            AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
        )
    );

CREATE POLICY "Destinatários podem marcar mensagens como lidas"
    ON public.mensagens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversas
            WHERE conversas.id = mensagens.conversa_id
            AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
        )
        AND sender_id <> auth.uid()
    );

-- 10.7 Policies para 'lances'
CREATE POLICY "Lances são visíveis publicamente"
    ON public.lances FOR SELECT
    USING (true);

CREATE POLICY "Usuários autenticados podem inserir lances"
    ON public.lances FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- 10.8 Policies para 'avaliacoes'
CREATE POLICY "Avaliações são públicas para leitura"
    ON public.avaliacoes FOR SELECT
    USING (true);

CREATE POLICY "Usuários autenticados podem criar avaliações"
    ON public.avaliacoes FOR INSERT
    WITH CHECK (auth.uid() = avaliador_id AND auth.uid() <> avaliado_id);

-- ==============================================================================
-- 11. SUPABASE REALTIME
-- ==============================================================================
-- Habilitar replicação em tempo real para chat, anúncios, lances e avaliações
ALTER PUBLICATION supabase_realtime ADD TABLE public.anuncios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes;

-- ==============================================================================
-- 12. STORAGE BUCKET E REGRAS (anuncios)
-- ==============================================================================
-- Criação do Bucket para imagens de anúncios (se o bucket storage existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'anuncios',
    'anuncios',
    true,
    5242880, -- Limite de 5MB por foto (mais que suficiente para WebP otimizado)
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- Bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- Limite de 2MB
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- Políticas RLS para Storage de Anúncios
CREATE POLICY "Imagens de anúncios são públicas para visualização"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'anuncios');

CREATE POLICY "Usuários autenticados podem enviar imagens para anúncios"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'anuncios'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Dono pode deletar suas imagens de anúncios"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'anuncios'
        AND auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- ==============================================================================
-- 13. SEED INICIAL: Categorias Estilo OLX
-- ==============================================================================
INSERT INTO public.categorias (nome, slug, icone, ordem) VALUES
    ('Autos e peças', 'autos-e-pecas', 'Car', 1),
    ('Imóveis', 'imoveis', 'Home', 2),
    ('Eletrônicos e celulares', 'eletronicos-e-celulares', 'Smartphone', 3),
    ('Para a sua casa', 'para-a-sua-casa', 'Sofa', 4),
    ('Moda e beleza', 'moda-e-beleza', 'Shirt', 5),
    ('Música e hobbies', 'musica-e-hobbies', 'Guitar', 6),
    ('Esportes e lazer', 'esportes-e-lazer', 'Bike', 7),
    ('Vagas de emprego', 'vagas-de-emprego', 'Briefcase', 8),
    ('Serviços e outros', 'servicos-e-outros', 'Wrench', 9)
ON CONFLICT (slug) DO NOTHING;


-- ==============================================================================
-- 14. TROQJÁ - MODALIDADE "TROCA-TROCA", LISTA DE DESEJOS E DUPLA MONETIZAÇÃO
-- ==============================================================================

-- Novos campos em profiles para controle das assinaturas de R$ 1,99/mês
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assinante_comprador_desejos BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assinante_anunciante_impulso BOOLEAN NOT NULL DEFAULT false;

-- Novos campos em anuncios para Troca-Troca e Impulso
ALTER TABLE public.anuncios ADD COLUMN IF NOT EXISTS condicao_troca TEXT CHECK (condicao_troca IN ('pau_a_pau', 'aceita_volta', 'da_volta', 'qualquer'));
ALTER TABLE public.anuncios ADD COLUMN IF NOT EXISTS impulso_desejos BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_anuncios_condicao_troca ON public.anuncios(condicao_troca);
CREATE INDEX IF NOT EXISTS idx_anuncios_impulso_desejos ON public.anuncios(impulso_desejos);

-- Tabela lista_desejos
CREATE TABLE IF NOT EXISTS public.lista_desejos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    termo_desejo TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    valor_maximo NUMERIC(12, 2) CHECK (valor_maximo IS NULL OR valor_maximo >= 0),
    alerta_vip_ativo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lista_desejos_usuario_id ON public.lista_desejos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lista_desejos_categoria_id ON public.lista_desejos(categoria_id);

-- Tabela notificacoes_desejos
CREATE TABLE IF NOT EXISTS public.notificacoes_desejos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    desejo_id UUID REFERENCES public.lista_desejos(id) ON DELETE SET NULL,
    tipo_match TEXT NOT NULL CHECK (tipo_match IN ('radar_vip', 'impulso_vendedor', 'padrao')),
    prioritario BOOLEAN NOT NULL DEFAULT false,
    bloqueada_monetizacao BOOLEAN NOT NULL DEFAULT false,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_usuario_id ON public.notificacoes_desejos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_anuncio_id ON public.notificacoes_desejos(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_lida ON public.notificacoes_desejos(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_created_at ON public.notificacoes_desejos(created_at DESC);

-- RPC contar_interessados_desejo
CREATE OR REPLACE FUNCTION public.contar_interessados_desejo(
    p_titulo TEXT,
    p_categoria_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER := 0;
    v_clean_titulo TEXT;
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    v_clean_titulo := TRIM(COALESCE(p_titulo, ''));

    IF LENGTH(v_clean_titulo) >= 2 OR p_categoria_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT ld.usuario_id)
        INTO v_total
        FROM public.lista_desejos ld
        WHERE (v_current_user_id IS NULL OR ld.usuario_id <> v_current_user_id)
          AND (
            (LENGTH(v_clean_titulo) >= 2 AND (
                v_clean_titulo ILIKE '%' || ld.termo_desejo || '%'
                OR ld.termo_desejo ILIKE '%' || v_clean_titulo || '%'
            ))
            OR (p_categoria_id IS NOT NULL AND ld.categoria_id = p_categoria_id)
          );
    END IF;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.contar_interessados_desejo(TEXT, UUID) TO anon, authenticated, service_role;

-- RPCs de ativação de assinatura
CREATE OR REPLACE FUNCTION public.ativar_assinatura_comprador(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        v_current_user_id := p_user_id;
    END IF;

    UPDATE public.profiles
    SET assinante_comprador_desejos = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = v_current_user_id;

    UPDATE public.lista_desejos
    SET alerta_vip_ativo = true
    WHERE usuario_id = v_current_user_id;

    UPDATE public.notificacoes_desejos
    SET bloqueada_monetizacao = false
    WHERE usuario_id = v_current_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'plano', 'radar_vip_comprador',
        'valor_mensal', 1.99,
        'message', 'Assinatura Radar VIP ativada com sucesso!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ativar_assinatura_comprador(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ativar_assinatura_anunciante(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        v_current_user_id := p_user_id;
    END IF;

    UPDATE public.profiles
    SET assinante_anunciante_impulso = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = v_current_user_id;

    UPDATE public.anuncios
    SET impulso_desejos = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE user_id = v_current_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'plano', 'impulso_anunciante',
        'valor_mensal', 1.99,
        'message', 'Assinatura Impulso de Desejos ativada com sucesso!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ativar_assinatura_anunciante(UUID) TO authenticated, service_role;

-- Trigger para verificar match com a lista de desejos
CREATE OR REPLACE FUNCTION public.fn_verificar_match_lista_desejos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vendedor_tem_impulso BOOLEAN := false;
    r_desejo RECORD;
    v_tipo_match TEXT;
    v_prioritario BOOLEAN;
    v_bloqueada BOOLEAN;
BEGIN
    IF NEW.impulso_desejos = true THEN
        v_vendedor_tem_impulso := true;
    ELSE
        SELECT assinante_anunciante_impulso
        INTO v_vendedor_tem_impulso
        FROM public.profiles
        WHERE id = NEW.user_id;
        v_vendedor_tem_impulso := COALESCE(v_vendedor_tem_impulso, false);
    END IF;

    FOR r_desejo IN
        SELECT DISTINCT ON (ld.usuario_id, ld.id)
            ld.id AS desejo_id,
            ld.usuario_id,
            ld.termo_desejo,
            ld.alerta_vip_ativo,
            p.assinante_comprador_desejos
        FROM public.lista_desejos ld
        JOIN public.profiles p ON p.id = ld.usuario_id
        WHERE ld.usuario_id <> NEW.user_id
          AND (
            NEW.titulo ILIKE '%' || ld.termo_desejo || '%'
            OR ld.termo_desejo ILIKE '%' || NEW.titulo || '%'
            OR (ld.categoria_id IS NOT NULL AND ld.categoria_id = NEW.categoria_id)
          )
    LOOP
        IF v_vendedor_tem_impulso THEN
            v_tipo_match := 'impulso_vendedor';
            v_prioritario := true;
            v_bloqueada := false;
        ELSE
            IF r_desejo.assinante_comprador_desejos = true OR r_desejo.alerta_vip_ativo = true THEN
                v_tipo_match := 'radar_vip';
                v_prioritario := false;
                v_bloqueada := false;
            ELSE
                v_tipo_match := 'padrao';
                v_prioritario := false;
                v_bloqueada := true;
            END IF;
        END IF;

        INSERT INTO public.notificacoes_desejos (
            usuario_id,
            anuncio_id,
            desejo_id,
            tipo_match,
            prioritario,
            bloqueada_monetizacao,
            lida,
            created_at
        ) VALUES (
            r_desejo.usuario_id,
            NEW.id,
            r_desejo.desejo_id,
            v_tipo_match,
            v_prioritario,
            v_bloqueada,
            false,
            TIMEZONE('utc'::TEXT, NOW())
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verificar_match_lista_desejos ON public.anuncios;
CREATE TRIGGER trg_verificar_match_lista_desejos
    AFTER INSERT ON public.anuncios
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_verificar_match_lista_desejos();

-- RLS
ALTER TABLE public.lista_desejos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_desejos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam sua própria lista de desejos" ON public.lista_desejos;
CREATE POLICY "Usuários gerenciam sua própria lista de desejos"
    ON public.lista_desejos FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuários visualizam e gerenciam suas próprias notificações de desejos" ON public.notificacoes_desejos;
CREATE POLICY "Usuários visualizam e gerenciam suas próprias notificações de desejos"
    ON public.notificacoes_desejos FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lista_desejos;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_desejos;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
