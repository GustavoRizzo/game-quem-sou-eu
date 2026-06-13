# Quem sou eu?

Jogo web estilo "Quem sou eu?" (Charades): a pessoa coloca o celular na testa,
um nome aparece na tela e ela indica acerto ou erro com um gesto do aparelho,
lido pelos sensores de movimento.

Web puro (sem framework, sem build), pensado para Android/Chrome e publicado no
GitHub Pages. Desenvolvido em fases — veja [docs/](docs/).

## Desenvolvimento

```bash
npm run dev    # servidor HTTPS local (https://localhost:8443)
npm test       # testes unitários (runner nativo do Node)
```

Para testar no celular pela rede local, veja [docs/fase-1-teste-local.md](docs/fase-1-teste-local.md).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `index.html` | Home / jogo |
| `pages/` | Uma subpasta por página (`index.html` + `index.js`) |
| `assets/` | Recursos estáticos compartilhados (estilos) |
| `lib/` | Módulos JS reutilizáveis (ex.: sensores de movimento) |
| `scripts/` | Ferramental de dev (dev server, port-forward) |
| `tests/` | Testes unitários |
| `docs/` | Documentação das fases |
