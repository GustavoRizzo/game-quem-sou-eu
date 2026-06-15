# PWA — instalável como app no celular

O site é um **PWA** (Progressive Web App): pode ser instalado no celular e abrir
como um aplicativo, sem a barra do navegador. Isso atende ao critério de "cara de
app nativo".

## Peças

| Arquivo | Papel |
|---|---|
| [manifest.webmanifest](../manifest.webmanifest) | Identidade do app: nome, ícones, cores, modo de exibição |
| [assets/favicon.svg](../assets/favicon.svg) | Ícone padrão (`purpose: any`) |
| [assets/icon-maskable.svg](../assets/icon-maskable.svg) | Ícone adaptativo do Android (`purpose: maskable`), com margem de segurança |
| [sw.js](../sw.js) | Service worker (raiz do site, para controlar todo o escopo) |
| [lib/register-sw.js](../lib/register-sw.js) | Registra o service worker |

O `<link rel="manifest">` está em todas as páginas; o registro do service worker
é feito só na home (ponto de entrada do app / `start_url`).

## Decisões

- **Modo de exibição**: `standalone` — sem barra de URL, mantém a barra de status do Android.
- **Ícones em SVG** (não PNG): o Chrome moderno do Android — nosso alvo — aceita ícones SVG no manifest. Mantém o projeto sem build e sem binários. Se algum aparelho não renderizar bem, o plano B é gerar PNGs 192/512 a partir do SVG.
- **Cache versionado por deploy (cache-first)**: o service worker serve os arquivos de um cache nomeado com a versão do build, e apaga os caches antigos ao ativar. Cada deploy é um snapshot atômico — some o problema de "HTML novo + CSS velho" causado pelo cache HTTP do GitHub Pages (`max-age=600` em tudo). Como efeito colateral, páginas já visitadas funcionam offline (não era o objetivo, mas vem de graça).
- **Versão = SHA do commit, injetada no deploy**: o `sw.js` traz o placeholder `__BUILD_VERSION__`; o workflow ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)) troca pelo `GITHUB_SHA` ao publicar. O navegador detecta atualização comparando o `sw.js` byte a byte (ele busca o sw.js furando o cache HTTP), então qualquer mudança de versão dispara `install`/`activate`. Em dev local/LAN o placeholder fica intacto → `IS_PRODUCTION` é falso → o worker é pass-through (network-only), garantindo arquivos sempre frescos durante o desenvolvimento.
- **Orientação não travada**: o menu é retrato e o jogo será paisagem; a decisão de travar fica para a fase 4, por tela.

## Por que os caminhos são relativos

`start_url`, `scope` e `src` dos ícones no manifest são relativos (`.`,
`assets/...`); o registro usa `new URL('../sw.js', import.meta.url)`. Assim tudo
funciona tanto localmente (raiz `/`) quanto no GitHub Pages (sob `/<repo>/`), sem
hardcode de caminho.

## Como instalar no celular (Android/Chrome)

1. Abrir `https://gustavorizzo.github.io/game-quem-sou-eu/` no Chrome.
2. Menu **⋮ → Instalar app** (ou **Adicionar à tela inicial**); pode aparecer também um banner automático.
3. O ícone surge na gaveta de apps. Ao abrir, roda em tela cheia, sem barra de URL.

> Para desinstalar: pressionar e segurar o ícone → Desinstalar (ou em
> Configurações do Android → Apps).

## Como verificar que está válido

No Chrome desktop, abrir o site → DevTools → **Application → Manifest** (mostra
ícones e campos) e **Service Workers** (mostra o worker ativo). O Lighthouse
(aba **Lighthouse → PWA**) aponta se algo falta para a instalabilidade.
