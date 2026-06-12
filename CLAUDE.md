# Projeto: Quem sou eu?

## Objetivo

Criar um jogo web "Quem sou eu?" (estilo Charades / Guessly): a pessoa coloca o celular na testa, um nome aparece na tela e ela indica acerto ou erro através de um gesto com o aparelho (lido pelos sensores de movimento).

O desenvolvimento é **faseado**: cada fase estuda um ponto isolado antes de integrar tudo no jogo final.

## Fases

1. **Site local testável pelo celular** — ✅ concluída. Servidor HTTPS sem dependências (`npm run dev`) + port-proxy no Windows ([scripts/setup-port-forward.ps1](scripts/setup-port-forward.ps1)), pois o WSL2 fica em NAT. Detalhes em [docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).
2. **Página de teste dos sensores** — giroscópio e acelerômetro, principalmente rotação (`DeviceOrientationEvent` / `DeviceMotionEvent`).
3. **Deploy no GitHub Pages.**
4. **Criação do jogo em si.**

## Estrutura de pastas

Organização **por feature/contexto**: cada contexto agrupa seu próprio HTML+JS (ex.: [diagnostics/](diagnostics/)); [shared/](shared/) guarda o que é comum (estilos); a raiz tem o `index.html` (home/jogo). Ferramental fica fora das features: [scripts/](scripts/) (dev server, port-forward), [docs/](docs/) (documentação das fases) e, futuramente, `tests/` (testes unitários — por isso páginas de diagnóstico NÃO ficam em "tests"). O site é multi-página (sem SPA/roteamento de cliente), deployável no GitHub Pages direto da raiz, sem build.

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
