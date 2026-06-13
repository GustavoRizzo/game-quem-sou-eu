# Fase 3 — Deploy no GitHub Pages

## Estratégia

Deploy via **GitHub Actions** ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)), e não pelo modo "deploy from a branch". Motivos:

- **Roda os testes antes de publicar**: o job `deploy` depende do job `test` (`npm test`); se algum dos testes falhar, nada vai para o ar.
- **Publica só o site**: um passo de _staging_ copia apenas `index.html`, `assets/`, `lib/` e `pages/` para `_site/`. Ferramental (`scripts/`, `tests/`, `docs/`) e arquivos de projeto não são publicados.
- **`.nojekyll`**: criado no staging para o GitHub Pages servir os arquivos como estão, sem processamento Jekyll.

O site não tem build: os arquivos vão para o ar como estão no repositório.

## Por que funciona sob subcaminho

Um _project site_ fica em `https://<usuario>.github.io/<repo>/`, ou seja, sob um subcaminho. Todos os links do projeto são **relativos** (`href="pages/..."`, `href="../../assets/..."`, imports `'../../lib/...'`), então funcionam tanto localmente quanto sob o subcaminho — sem necessidade de `<base>` ou de reescrever caminhos.

## Passos para colocar no ar (uma vez)

1. Criar o repositório no GitHub (ex.: `game-quem-sou-eu`) e adicionar como remote:
   ```bash
   git remote add origin git@github.com:<usuario>/game-quem-sou-eu.git
   git push -u origin main
   ```
2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O push para `main` dispara o workflow. Acompanhar em **Actions**. Ao terminar, a URL aparece no job `deploy` (e em Settings → Pages).

## Depois

Cada `git push` para `main` republica automaticamente (testes → deploy). Também é possível disparar manualmente em **Actions → Deploy to GitHub Pages → Run workflow**.

## Critério de aceite da fase

- Workflow verde (testes + deploy).
- Site acessível pela URL pública do Pages, com cadeado HTTPS válido (certificado real, sem aviso).
- No celular, a página de sensores funciona pela URL pública igual funcionava localmente.
