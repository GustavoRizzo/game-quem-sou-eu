# Projeto: Quem sou eu?

## Objetivo

Criar um jogo web "Quem sou eu?" (estilo Charades / Guessly): a pessoa coloca o celular na testa, um nome aparece na tela e ela indica acerto ou erro através de um gesto com o aparelho (lido pelos sensores de movimento).

O desenvolvimento é **faseado**: cada fase estuda um ponto isolado antes de integrar tudo no jogo final.

## Fases

1. **Site local testável pelo celular** — ✅ concluída. Servidor HTTPS sem dependências (`npm run dev`) + port-proxy no Windows ([scripts/setup-port-forward.ps1](scripts/setup-port-forward.ps1)), pois o WSL2 fica em NAT. Detalhes em [docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).
2. **Página de teste dos sensores** — ✅ concluída e validada no aparelho. Módulo reutilizável [lib/motion-sensors.js](lib/motion-sensors.js) + página de teste [pages/sensor-test/](pages/sensor-test/). Resultados: **gamma é o eixo do gesto do jogo**; ~38 eventos/s de orientação e ~60/s de movimento. Detalhes em [docs/fase-2-sensores.md](docs/fase-2-sensores.md).
3. **Deploy no GitHub Pages.**
4. **Criação do jogo em si.**

## Estrutura de pastas

- Raiz: só o `index.html` (home/jogo) e arquivos de projeto.
- [pages/](pages/): uma subpasta por página, contendo `index.html` + `index.js` daquela página (ex.: [pages/sensor-test/](pages/sensor-test/)). O `index.html` dá URLs limpas: `/pages/sensor-test/`.
- [assets/](assets/): recursos estáticos compartilhados (estilos; futuramente imagens, fontes).
- [lib/](lib/): módulos JS próprios reutilizáveis entre páginas/jogo (ex.: `motion-sensors.js`).
- [scripts/](scripts/): ferramental de dev (dev server, port-forward) — nunca vai para o navegador.
- [docs/](docs/): documentação das fases. `tests/` fica reservada para futuros testes unitários (por isso páginas de teste/diagnóstico não usam esse nome).

O site é multi-página (sem SPA/roteamento de cliente), deployável no GitHub Pages direto da raiz, sem build.

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
