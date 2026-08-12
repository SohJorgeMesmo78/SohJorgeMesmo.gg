# SohJorgeMesmo.gg

Hub oficial do SohJorgeMesmo para reunir lives, vídeos e redes sociais em um só lugar — porque a próxima jogatina deve estar a um clique de distância.

Produção: [sohjorgemesmo.seteoito.dev](https://sohjorgemesmo.seteoito.dev)

## Sobre

O projeto substitui páginas genéricas de link-in-bio por uma experiência própria, mobile-first e conectada ao conteúdo real do canal. A página destaca a identidade do criador, informa o status das lives e apresenta o vídeo longo mais recente do YouTube.

## Funcionalidades

- Status online/offline da Twitch, com título, jogo e espectadores quando disponíveis.
- Área de status de Twitch e YouTube com horário habitual das lives.
- Último vídeo longo do YouTube, excluindo Shorts, lives e VODs.
- Nome do canal e quantidade de inscritos.
- Tratamento de “nova missão” para vídeos publicados há até 36 horas.
- Hub de links para YouTube, Twitch, Instagram, TikTok, X e LivePix.
- Identificador social rotativo no Hero.
- Microinterações, progresso de scroll e suporte a `prefers-reduced-motion`.
- Layout responsivo, SSR, hydration e prerender.

## Stack

- Angular 19.1 e Angular CLI 19.1.7
- TypeScript 5.7
- SCSS
- Angular SSR
- Node.js e Express 4.18
- Vercel Functions
- YouTube Data API
- Twitch API

## Rodando localmente

Instale as dependências:

```bash
npm install
```

Copie o arquivo de exemplo e preencha as credenciais locais:

```bash
cp .env.local.example .env.local
```

Além de `YOUTUBE_API_KEY`, adicione ao `.env.local` as duas variáveis da Twitch listadas abaixo. Depois, inicie todo o ambiente:

```bash
npm run dev
```

Esse comando inicia o frontend em `http://localhost:4200` e o backend local em `http://localhost:3000`, com logs separados. O Angular Dev Server encaminha `/api/*` para o backend através de `proxy.conf.json`.

## Variáveis de ambiente

```env
YOUTUBE_API_KEY=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

Use apenas valores locais em `.env.local`. Nunca envie esse arquivo ao repositório.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia frontend e backend local juntos. |
| `npm start` | Inicia somente o Angular Dev Server em `:4200`. |
| `npm run api:dev` | Inicia somente as APIs locais em `:3000`, com watch. |
| `npm run build` | Gera o build de produção, incluindo bundles browser e server. |
| `npm run vercel:dev` | Executa o ambiente local da Vercel. |
| `npm run serve:ssr:SohJorgeMesmo.gg` | Serve o bundle SSR já compilado. |

## Estrutura do projeto

- `src/app/` — componentes, serviços e configuração do frontend Angular.
- `src/server.ts` — entrada do servidor Angular SSR e rotas Express.
- `api/` — funções serverless de YouTube e Twitch usadas pela Vercel.
- `scripts/` — servidor auxiliar das APIs no desenvolvimento local.
- `proxy.conf.json` — proxy `/api/*` do Angular Dev Server.
- `public/` — arquivos estáticos.

## Deploy

O projeto é publicado na Vercel. Em produção, o frontend continua usando URLs relativas `/api/*`, resolvidas pelas funções serverless do mesmo repositório.

## Segurança

As credenciais de YouTube e Twitch ficam exclusivamente no backend. O navegador acessa as integrações por `/api/youtube` e `/api/twitch`; `.env.local` está no `.gitignore` e não deve ser commitado.
