# Projeto: Quem sou eu?

## Objetivo

Criar um jogo web "Quem sou eu?" (estilo Charades / Guessly): a pessoa coloca o celular na testa, um nome aparece na tela e ela indica acerto ou erro através de um gesto com o aparelho (lido pelos sensores de movimento).

O desenvolvimento é **faseado**: cada fase estuda um ponto isolado antes de integrar tudo no jogo final.

## Fases

1. **Site local testável pelo celular** — ✅ concluída. Servidor HTTPS sem dependências (`npm run dev`) + port-proxy no Windows ([scripts/setup-port-forward.ps1](scripts/setup-port-forward.ps1)), pois o WSL2 fica em NAT. Detalhes em [docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).
2. **Página de teste dos sensores** — ✅ concluída e validada no aparelho. Módulo reutilizável [lib/motion-sensors.js](lib/motion-sensors.js) + página de teste [pages/sensor-test/](pages/sensor-test/). Resultados: **gamma é o eixo do gesto do jogo**; ~38 eventos/s de orientação e ~60/s de movimento. Detalhes em [docs/fase-2-sensores.md](docs/fase-2-sensores.md).
3. **Deploy no GitHub Pages** — ✅ concluída. Site publicado em [gustavorizzo.github.io/game-quem-sou-eu](https://gustavorizzo.github.io/game-quem-sou-eu). Deploy via GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): roda os testes, publica só os arquivos do site e injeta snippets de produção (service worker versionado, GA4). Detalhes em [docs/fase-3-deploy.md](docs/fase-3-deploy.md).
4. **Criação do jogo em si** — 🔄 em andamento, jogável. Mecânica isolada na página de teste [pages/gesture-counter/](pages/gesture-counter/) (config default em [lib/game-config.js](lib/game-config.js), detector puro em [lib/gesture-detector.js](lib/gesture-detector.js); acerto = inclinar para baixo / gamma diminui, skip = oposto). O **jogo** está em [pages/game/](pages/game/): 60s, palavras de listas JSON ([assets/word-lists/](assets/word-lists/)), gestos marcam acerto/skip, tela de resultados. Lógica pura/testada em `lib/` (deck, match, match-stats; estruturas com JSDoc `@typedef`) e **persistência das partidas** atrás de um repository sobre localStorage ([lib/match-repository.js](lib/match-repository.js)) — evoluível para IndexedDB sem mexer no jogo. **Configurações do usuário** (duração, categorias, sensibilidade) em [lib/settings-repository.js](lib/settings-repository.js) — mesma arquitetura de storage injetável do `match-repository`, testável em Node sem jsdom. Modo imersivo (fullscreen + paisagem + wake lock) na partida. Falta calibrar no aparelho. Detalhes em [docs/fase-4-jogo.md](docs/fase-4-jogo.md).

**PWA** (transversal, instalável como app) — 🔄 base feita: [manifest.webmanifest](manifest.webmanifest), ícones SVG (`any` + `maskable`), service worker com cache versionado por SHA do commit ([sw.js](sw.js)) registrado por [lib/register-sw.js](lib/register-sw.js). Modo `standalone`, sem cache offline ainda. Detalhes em [docs/pwa.md](docs/pwa.md).

**Analytics** (transversal, GA4) — ✅ instalado em produção. Módulo [lib/analytics.js](lib/analytics.js) carrega o `gtag.js` e expõe `track(name, params)` para eventos customizados. Usa placeholder `__GA_MEASUREMENT_ID__` substituído pelo deploy (variável `GA_MEASUREMENT_ID` no repositório GitHub); em dev o módulo detecta o placeholder e fica inerte — nenhuma visita de desenvolvimento é contada. A tag `<script>` é injetada em todos os HTMLs durante o deploy (nunca checada nos fontes), via `find`+`sed` no step "Stage site" do [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Eventos: `game_start`, `game_finish`, `play_again` ([pages/game/index.js](pages/game/index.js)) e `settings_saved` ([pages/settings/index.js](pages/settings/index.js)). ⚠️ Aviso de cookie/LGPD adiado — uso interno/protótipo; revisar antes de divulgar publicamente.

## Estrutura de pastas

- Raiz: só o `index.html` (home/jogo) e arquivos de projeto.
- [pages/](pages/): uma subpasta por página, contendo `index.html` + `index.js` daquela página (ex.: [pages/sensor-test/](pages/sensor-test/)). O `index.html` dá URLs limpas: `/pages/sensor-test/`.
- [assets/](assets/): recursos estáticos compartilhados (estilos; futuramente imagens, fontes).
- [lib/](lib/): módulos JS próprios reutilizáveis entre páginas/jogo, incluindo:
  - sensores: [motion-sensors.js](lib/motion-sensors.js), [forehead-tilt.js](lib/forehead-tilt.js)
  - jogo: [deck.js](lib/deck.js), [match.js](lib/match.js), [match-stats.js](lib/match-stats.js), [gesture-detector.js](lib/gesture-detector.js), [game-config.js](lib/game-config.js)
  - persistência: [match-repository.js](lib/match-repository.js), [settings-repository.js](lib/settings-repository.js) — storage injetável no construtor (testável em Node)
  - categorias: [categories.js](lib/categories.js) — registry de listas + loader via fetch
  - feedback sensorial: [feedback.js](lib/feedback.js) — beep/vibrate/flash compartilhados (extraído de game e gesture-counter para evitar duplicação)
  - analytics: [analytics.js](lib/analytics.js) — wrapper GA4 com placeholder para deploy; `track(name, params)` é no-op em dev e quando script bloqueado
  - UI: `<value-gauge>` em [value-gauge.js](lib/value-gauge.js) (Web Component/Custom Element), geometria pura em [gauge-geometry.js](lib/gauge-geometry.js)
  - PWA: [register-sw.js](lib/register-sw.js)
- [scripts/](scripts/): ferramental de dev (dev server, port-forward) — nunca vai para o navegador.
- [tests/](tests/): testes unitários — um arquivo por assunto (`<modulo>.test.mjs`). Por isso páginas de teste/diagnóstico NÃO usam o nome "tests".
- [docs/](docs/): documentação das fases.

O site é multi-página (sem SPA/roteamento de cliente), deployável no GitHub Pages direto da raiz, sem build.

## Testes

- Rodar: `npm test` (runner nativo `node:test`, zero dependências).
- Novos módulos com lógica devem nascer com seu arquivo de teste em `tests/`.
- Código que depende de browser (DOM, `window`) mantém a lógica pura em módulos separados/testáveis (ex.: [pages/sensor-test/metric-row.js](pages/sensor-test/metric-row.js)); nos testes, `window` e elementos são simulados com stubs simples — sem jsdom.
- Módulos browser-only **sem lógica testável** (efeitos colaterais puros como `register-sw.js`, `value-gauge.js`, `sw.js`) não têm teste unitário — aceitável por design.
- `fetch` global é substituído via `globalThis.fetch = ...` nos testes que precisam simular carregamento de recursos (ex.: [tests/categories.test.mjs](tests/categories.test.mjs)).

## Critérios técnicos

- **Hospedagem**: web puro, deployável em hospedagem estática gratuita (GitHub Pages).
- **Teste local no celular**: deve ser possível testar no celular o código em desenvolvimento no PC, antes de qualquer deploy (rede local; atenção: APIs de sensores exigem contexto seguro/HTTPS).
- **PWA**: o site deve ter cara de app nativo no celular.
- **Plataforma-alvo**: Android com versões modernas do Chrome — pode-se usar recursos novos da web sem polyfills.
- **Arquitetura**: boas práticas, reuso de código e segregação de responsabilidades (ex.: módulo de sensores separado das regras do jogo; quebrar em mais contextos conforme necessário).
- **Estilo**: libs de estilização permitidas (ex.: Bootstrap).
- **Frameworks**: evitar frameworks complexos; para necessidades pontuais, preferir Alpine.js e HTMX.
- **Escopo atual**: sem autenticação; dados apenas locais no dispositivo (localStorage via `match-repository` e `settings-repository`), salvo telemetria de uso via GA4 (apenas em produção, nunca em dev).

## Convenções de trabalho

- Comunicação com o usuário e documentos internos (este arquivo, planejamentos, memória): **português**.
- Código, identificadores e comentários no código: **inglês**.
- Arquivos internos do Claude devem ficar dentro do próprio projeto, versionados.
