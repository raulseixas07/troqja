# Clone OLX - Plataforma Completa de Classificados (Web + Mobile + Supabase)

Monorepo contendo a solução full-stack para a plataforma de classificados estilo OLX, construída com **Next.js (App Router)**, **React Native com Expo**, **Supabase (PostgreSQL, Storage e Realtime)** e **Tailwind CSS**.

---

## 📁 Estrutura de Diretórios do Projeto

```text
MEU APP/
├── packages/
│   └── shared/                  # Pacote centralizado com TypeScript estrito
│       ├── src/
│       │   ├── types/           # Tipagem do Supabase (Database, Models, RLS)
│       │   ├── supabase/        # Factory do cliente Supabase e constantes
│       │   └── utils/           # Utilitários de conversão WebP e formatação BRL
│       ├── package.json
│       └── tsconfig.json
├── web/                         # Front-end Web (Next.js 15 App Router + Tailwind CSS)
│   ├── src/
│   │   ├── app/                 # Rotas (Home, Anunciar, Detalhes do Anúncio)
│   │   ├── components/          # Navbar, Card de Anúncio, ImageUploaderWebP
│   │   ├── lib/                 # Cliente Supabase para navegador
│   │   └── utils/               # Conversor de imagens via Canvas HTML5 para WebP
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
├── mobile/                      # App Mobile (React Native + Expo)
│   ├── src/
│   │   ├── components/          # AdCard, ImagePickerWebP com manipulação nativa
│   │   ├── screens/             # HomeScreen, CreateAdScreen, AdDetailScreen
│   │   ├── lib/                 # Cliente Supabase com AsyncStorage
│   │   └── services/            # Processamento de imagem via Expo ImageManipulator (WebP)
│   ├── App.tsx                  # Navegação e TabBar estilo OLX
│   ├── app.json
│   └── package.json
├── supabase/                    # Infraestrutura e Banco de Dados
│   ├── schema.sql               # Script SQL completo (tabelas, RLS, triggers, realtime e storage)
│   └── README.md                # Diagrama ERD e documentação técnica do banco
├── package.json                 # Configuração de workspaces npm
└── README.md                    # Este arquivo
```

---

## 🗄️ 1. Banco de Dados e Supabase

O arquivo [`supabase/schema.sql`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/supabase/schema.sql) implementa a estrutura com:
1. **`profiles`:** Conectada a `auth.users` via trigger automático de cadastro.
2. **`categorias`:** Categorias oficiais estilo OLX (Autos, Imóveis, Eletrônicos, etc.).
3. **`anuncios`:** Classificados com status (`ativo`, `pausado`, `vendido`, `excluido`), coordenadas/localização e índice GIN para busca textual.
4. **`fotos_anuncio`:** Registro das imagens convertidas em **WebP** e armazenadas no bucket.
5. **`conversas`:** Canais de negociação entre comprador e vendedor vinculados ao anúncio.
6. **`mensagens`:** Mensagens em tempo real com replicação Supabase Realtime habilitada.
7. **Storage Buckets:** Buckets `anuncios` e `avatars` com Row Level Security (RLS) configurado.

### Como aplicar o SQL:
1. Abra o painel do seu projeto no [Supabase](https://supabase.com).
2. Vá até o **SQL Editor**.
3. Copie o conteúdo de [`supabase/schema.sql`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/supabase/schema.sql) e clique em **Run**.

---

## 🖼️ 2. Sistema de Otimização e Upload de Fotos em WebP

Conforme a especificação, as imagens **nunca são enviadas no formato bruto original** para economizar banda e acelerar o carregamento dos cards:

- **Na Web (`/web`):**
  - Implementado em [`web/src/utils/imageWebP.ts`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/web/src/utils/imageWebP.ts) e [`ImageUploaderWebP.tsx`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/web/src/components/ImageUploaderWebP.tsx).
  - Utiliza a API HTML5 Canvas para redimensionamento mantendo aspect ratio e compressão direta com `canvas.toBlob(..., 'image/webp', 0.82)`. Reduções típicas chegam a **70% a 90%** do tamanho original.
- **No Mobile (`/mobile`):**
  - Implementado em [`mobile/src/services/imageService.ts`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/mobile/src/services/imageService.ts) e [`ImagePickerWebP.tsx`](file:///c:/Users/raul.melo/Downloads/MEU%20APP/mobile/src/components/ImagePickerWebP.tsx).
  - Utiliza a biblioteca nativa `expo-image-manipulator` com `SaveFormat.WEBP` para compressão via hardware no dispositivo antes de disparar o upload ao Supabase Storage.

---

## ⚡ 3. Como Rodar o Projeto Localmente

### Pré-requisitos:
- Node.js 18+ (recomendado Node 20+)
- npm 9+

### Passo 1: Instalação das Dependências
Na raiz do projeto:
```bash
npm install
```

### Passo 2: Configuração das Variáveis de Ambiente
Crie os arquivos `.env.local` na pasta `/web` e `.env` na pasta `/mobile`:

**No `web/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

**No `mobile/.env`:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Passo 3: Executar a Web (Next.js)
```bash
npm run dev:web
# Acesse no navegador: http://localhost:3000
```

### Passo 4: Executar o Mobile (Expo)
```bash
npm run dev:mobile
# Abra no Expo Go no seu celular lendo o QR Code ou aperte 'a' para Android emulator / 'w' para Web
```
