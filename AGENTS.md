# AGENTS.md

## Produto e direção

`SohJorgeMesmo.gg` é a landing page e o hub oficial do criador de conteúdo SohJorgeMesmo. É uma alternativa própria a serviços genéricos de link-in-bio, com identidade visual e conteúdo dinâmico de YouTube e Twitch.

O objetivo é que alguém vindo de Instagram, TikTok ou outra rede pense: “Quero ver esse cara jogando alguma coisa.” O produto não é portfólio de desenvolvedor, currículo, dashboard, landing page corporativa ou site SaaS. Essa distinção deve orientar decisões futuras de conteúdo, UX e UI.

## Identidade e linguagem

- Primary / Amarelo Jooj: `#FFAA00`
- Secondary: `#000066`
- Dark: `#121214`
- Light/Cream: `#F4EAD4`
- Montserrat: interface e textos gerais.
- Fonte medieval/fantasia: títulos e elementos especiais.

A estética usa referências sutis a RPG, guilda, taverna, aventura e videogames, mas o assunto é games em geral. Use essa camada como tempero; não transforme a interface em MMORPG ou site exclusivamente medieval.

A comunicação deve soar como criador de conteúdo/games. Conceitos existentes incluem `Taverna do Jooj`, `A Guilda`, `O que tá rolando`, `Nova missão disponível` e `Live às 19h`. Evite linguagem corporativa, SaaS, portfólio tech e marketing genérico.

## Arquitetura de informação

### Hero

Identidade do criador: foto, `Taverna do Jooj`, apresentação e identificador social rotativo. O identificador é interativo e leva para `A Guilda`.

### Status das lives

Responde “Tem live agora?” e “Quando costuma ter live?”. Twitch e YouTube devem manter linguagem visual consistente; o estado online recebe destaque. Esta área não deve virar outro menu de redes.

### O que tá rolando

Destaca o vídeo longo mais recente do YouTube. Não deve exibir Shorts, lives ou VODs de live. Conteúdo publicado há até 36 horas recebe o tratamento de conteúdo novo/“nova missão”.

### A Guilda

É o ponto principal de acesso às redes: YouTube, Twitch, Instagram, TikTok, X e LivePix. Evite duplicar esses links sem necessidade em outras áreas.

## Arquitetura técnica

- Angular 19, TypeScript e SCSS no frontend.
- Angular SSR, hydration e prerender; a entrada SSR é `src/server.ts`.
- Funções de produção em `api/`, publicadas pela Vercel.
- Servidor local das APIs em `scripts/local-api-server.cjs`.
- O frontend sempre consome URLs relativas `/api/*`.

### YouTube

- Secret: `YOUTUBE_API_KEY`.
- Endpoint: `/api/youtube`.
- Retorna dados do canal, inscritos e o vídeo longo mais recente, incluindo título, data, URL e thumbnail.
- A seleção exclui Shorts, lives e VODs. A prioridade de thumbnails é `maxres`, `standard`, `high`, `medium` e `default`.

Essa lógica existe por causa de casos reais já corrigidos. Não a simplifique nem reescreva sem entender toda a seleção e a associação entre `videoId` e metadados.

### Twitch

- Secrets: `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET`.
- Endpoint: `/api/twitch`.
- Retorna status real da live e, quando disponíveis, título, jogo e espectadores.

Todos os secrets devem permanecer server-side.

## Desenvolvimento local e deploy

`npm run dev` inicia:

- frontend Angular em `http://localhost:4200`;
- backend local em `http://localhost:3000`.

O proxy oficial do Angular CLI, definido em `proxy.conf.json`, encaminha `4200/api/*` para `3000/api/*`. Não substitua chamadas relativas por URLs hardcoded de localhost: o mesmo frontend deve funcionar localmente e em produção.

Os secrets locais ficam em `.env.local`, que é ignorado pelo Git e nunca deve ser commitado. Não coloque secrets em `src/environments`.

O deploy é feito na Vercel, com funções em `/api/*`. Produção: `https://sohjorgemesmo.seteoito.dev`. Não altere essa arquitetura sem necessidade clara.

## SSR, acessibilidade e movimento

- Evite acesso a `window`, `document` e outras APIs do navegador durante SSR; use lifecycle/browser guards adequados e considere hydration.
- Mantenha navegação por teclado, semântica, contraste, focus states, responsividade e abordagem mobile-first.
- Respeite `prefers-reduced-motion` sem remover funcionalidade essencial.
- O site deve parecer vivo durante interação ou mudança de estado, mas não inquieto quando está parado.
- Prefira CSS, `transform` e `opacity`; evite layout shift, animações contínuas espalhadas e bibliotecas pesadas.

## Princípios de implementação

- Prefira soluções simples e focadas.
- Evite dependências desnecessárias e abstrações prematuras.
- Preserve SSR, acessibilidade e responsividade.
- Não exponha secrets nem duplique lógica server-side.
- Evite URLs hardcoded e reutilize componentes quando fizer sentido.
- Não faça refatorações fora do escopo.

## Fluxo de trabalho para agentes

Antes de mudanças relevantes:

1. Inspecione a implementação existente e entenda por que ela existe.
2. Execute `git status` e revise o diff quando houver trabalho incompleto.
3. Preserve alterações válidas já presentes.
4. Faça mudanças focadas no pedido.

Depois das mudanças:

1. Revise o diff completo.
2. Execute `npx tsc --noEmit -p tsconfig.app.json`.
3. Execute `npm run build` e confirme a geração do bundle server/SSR.
4. Confira que nenhum secret entrou no diff.
5. Informe com clareza o que foi alterado e qualquer validação que não pôde ser executada.

Nunca declare algo como validado sem ter realmente executado ou verificado.
