# 🧠 Quem sou eu?

Jogo web estilo "Quem sou eu?" (Charades): a pessoa coloca o celular na testa,
um nome aparece na tela e ela indica acerto ou erro com um **gesto do aparelho**,
lido pelos sensores de movimento.

Web puro (sem framework, sem build), pensado para Android/Chrome e publicado no
GitHub Pages.

### 🎮 Jogar agora: **[gustavorizzo.github.io/game-quem-sou-eu](https://gustavorizzo.github.io/game-quem-sou-eu/)**

---

## 📑 Sumário

- [✨ Sobre o projeto](#-sobre-o-projeto)
- [🗂️ Estrutura de pastas](#️-estrutura-de-pastas)
- [💻 Como testar localmente](#-como-testar-localmente)
  - [No computador](#no-computador)
  - [No celular (mesma rede Wi-Fi)](#no-celular-mesma-rede-wi-fi)
- [🧪 Testes automatizados](#-testes-automatizados)
- [🚀 Deploy](#-deploy)
- [📚 Documentação das fases](#-documentação-das-fases)

---

## ✨ Sobre o projeto

Desenvolvido em **fases**, cada uma estudando um ponto isolado antes de integrar
tudo no jogo final:

1. ✅ Site local testável pelo celular
2. ✅ Página de teste dos sensores de movimento
3. ✅ Deploy no GitHub Pages
4. 🔜 O jogo em si

Detalhes de cada fase em [docs/](docs/).

---

## 🗂️ Estrutura de pastas

| Pasta | Conteúdo |
|---|---|
| `index.html` | Home / jogo |
| `pages/` | Uma subpasta por página (`index.html` + `index.js`) |
| `assets/` | Recursos estáticos compartilhados (estilos, favicon) |
| `lib/` | Módulos JS reutilizáveis (ex.: sensores de movimento) |
| `scripts/` | Ferramental de dev (dev server, port-forward) |
| `tests/` | Testes unitários |
| `docs/` | Documentação das fases |

---

## 💻 Como testar localmente

Pré-requisitos: **Node.js 20+** e **openssl** (para o certificado HTTPS local).
Não há dependências a instalar — o dev server usa só a biblioteca padrão do Node.

### No computador

```bash
npm run dev
```

Depois abra **`https://localhost:8443`** no navegador. Como o certificado é
autoassinado, o navegador mostra um aviso de segurança na primeira vez — clique
em **Avançado → Ir mesmo assim**. A conexão continua sendo um contexto seguro
(necessário para os sensores).

> 💡 Por que HTTPS já no ambiente local? As APIs de sensores
> (`DeviceOrientationEvent` / `DeviceMotionEvent`) só funcionam em contexto
> seguro. `localhost` conta como seguro mesmo com certificado autoassinado.

### No celular (mesma rede Wi-Fi)

Para abrir no celular o código que roda no PC (sensores precisam de HTTPS):

1. **No PC** — suba o servidor:
   ```bash
   npm run dev
   ```
2. **No celular** (mesma rede Wi-Fi) — abra `https://<IP-DO-PC>:8443` e aceite o
   aviso de certificado.

⚠️ **Usando WSL2?** O WSL fica em uma rede NAT e o celular não o alcança
diretamente — é preciso um *port proxy* no Windows. O passo a passo completo
(com o script pronto e alternativas) está em
[docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).

---

## 🧪 Testes automatizados

```bash
npm test
```

Usa o runner nativo do Node (`node:test`), sem dependências. Um arquivo por
assunto em [tests/](tests/). Os testes também rodam no CI antes de cada deploy.

---

## 🚀 Deploy

Automático a cada `git push` na branch `main`, via GitHub Actions
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): o workflow roda
os testes e, se passarem, publica somente os arquivos do site no GitHub Pages.

---

## 📚 Documentação das fases

- [Fase 1 — Site local testável pelo celular](docs/fase-1-teste-local.md)
- [Fase 2 — Sensores de movimento](docs/fase-2-sensores.md)
- [Fase 3 — Deploy no GitHub Pages](docs/fase-3-deploy.md)
