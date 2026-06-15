# Projeto: Quem sou eu?

## Objetivo

Criar um jogo web "Quem sou eu?" (estilo Charades / Guessly): a pessoa coloca o celular na testa, um nome aparece na tela e ela indica acerto ou erro através de um gesto com o aparelho (lido pelos sensores de movimento).

O desenvolvimento é **faseado**: cada fase estuda um ponto isolado antes de integrar tudo no jogo final.

## Fases

1. **Site local testável pelo celular** — ✅ concluída. Servidor HTTPS sem dependências (`npm run dev`) + port-proxy no Windows ([scripts/setup-port-forward.ps1](scripts/setup-port-forward.ps1)), pois o WSL2 fica em NAT. Detalhes em [docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).
2. **Página de teste dos sensores** — ✅ concluída e validada no aparelho. Módulo reutilizável [lib/motion-sensors.js](lib/motion-sensors.js) + página de teste [pages/sensor-test/](pages/sensor-test/). Resultados: **gamma é o eixo do gesto do jogo**; ~38 eventos/s de orientação e ~60/s de movimento. Detalhes em [docs/fase-2-sensores.md](docs/fase-2-sensores.md).
3. **Deploy no GitHub Pages** — 🔄 workflow pronto, falta criar o repo e ativar o Pages. Deploy via GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): roda os testes e publica só o site (`index.html`, `assets/`, `lib/`, `pages/`). Detalhes em [docs/fase-3-deploy.md](docs/fase-3-deploy.md).
4. **Criação do jogo em si** — 🔄 em andamento, jogável. Mecânica isolada na página de teste [pages/gesture-counter/](pages/gesture-counter/) (config default em [lib/game-config.js](lib/game-config.js), detector puro em [lib/gesture-detector.js](lib/gesture-detector.js); acerto = inclinar para baixo / gamma diminui, skip = oposto). O **jogo** está em [pages/game/](pages/game/): 60s, palavras de listas JSON ([assets/word-lists/](assets/word-lists/)), gestos marcam acerto/skip, tela de resultados. Lógica pura/testada em `lib/` (deck, match, match-stats; estruturas com JSDoc `@typedef`) e **persistência das partidas** atrás de um repository sobre localStorage ([lib/match-repository.js](lib/match-repository.js)) — evoluível para IndexedDB sem mexer no jogo. Modo imersivo (fullscreen + paisagem + wake lock) na partida. Falta calibrar no aparelho. Detalhes em [docs/fase-4-jogo.md](docs/fase-4-jogo.md).

**PWA** (transversal, instalável como app) — 🔄 base feita: [manifest.webmanifest](manifest.webmanifest), ícones SVG (`any` + `maskable`), service worker mínimo ([sw.js](sw.js)) registrado por [lib/register-sw.js](lib/register-sw.js). Modo `standalone`, sem cache offline ainda. Detalhes em [docs/pwa.md](docs/pwa.md).

## Estrutura de pastas

- Raiz: só o `index.html` (home/jogo) e arquivos de projeto.
- [pages/](pages/): uma subpasta por página, contendo `index.html` + `index.js` daquela página (ex.: [pages/sensor-test/](pages/sensor-test/)). O `index.html` dá URLs limpas: `/pages/sensor-test/`.
- [assets/](assets/): recursos estáticos compartilhados (estilos; futuramente imagens, fontes).
- [lib/](lib/): módulos JS próprios reutilizáveis entre páginas/jogo (ex.: `motion-sensors.js`), incluindo componentes de UI como Web Components/Custom Elements (ex.: `<value-gauge>` em `value-gauge.js`, com a geometria pura separada em `gauge-geometry.js`).
- [scripts/](scripts/): ferramental de dev (dev server, port-forward) — nunca vai para o navegador.
- [tests/](tests/): testes unitários — um arquivo por assunto (`<modulo>.test.mjs`). Por isso páginas de teste/diagnóstico NÃO usam o nome "tests".
- [docs/](docs/): documentação das fases.

O site é multi-página (sem SPA/roteamento de cliente), deployável no GitHub Pages direto da raiz, sem build.

## Testes

- Rodar: `npm test` (runner nativo `node:test`, zero dependências).
- Novos módulos com lógica devem nascer com seu arquivo de teste em `tests/`.
- Código que depende de browser (DOM, `window`) mantém a lógica pura em módulos separados/testáveis (ex.: [pages/sensor-test/metric-row.js](pages/sensor-test/metric-row.js)); nos testes, `window` e elementos são simulados com stubs simples — sem jsdom.

## Critérios técnicos

- **Hospedagem**: web puro, deployável em hospedagem estática gratuita (GitHub Pages).
- **Teste local no celular**: deve ser possível testar no celular o código em desenvolvimento no PC, antes de qualquer deploy (rede local; atenção: APIs de sensores exigem contexto seguro/HTTPS).
- **PWA**: o site deve ter cara de app nativo no celular.
- **Plataforma-alvo**: Android com versões modernas do Chrome — pode-se usar recursos novos da web sem polyfills.
- **Arquitetura**: boas práticas, reuso de código e segregação de responsabilidades (ex.: módulo de sensores separado das regras do jogo; quebrar em mais contextos conforme necessário).
- **Estilo**: libs de estilização permitidas (ex.: Bootstrap).
- **Frameworks**: evitar frameworks complexos; para necessidades pontuais, preferir Alpine.js e HTMX.
- **Escopo atual**: sem autenticação e sem armazenamento de dados.

## Convenções de trabalho

- Comunicação com o usuário e documentos internos (este arquivo, planejamentos, memória): **português**.
- Código, identificadores e comentários no código: **inglês**.
- Arquivos internos do Claude devem ficar dentro do próprio projeto, versionados.
