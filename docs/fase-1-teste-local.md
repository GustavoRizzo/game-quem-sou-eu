# Fase 1 — Site local testável pelo celular

## O que foi construído

- Home ([index.html](../index.html)) com links para as páginas de teste de cada fase; o jogo em si ocupará essa página na fase 4.
- Página de diagnóstico ([pages/connection-diagnostics/](../pages/connection-diagnostics/)) com um painel que mostra: URL acessada, se o contexto é seguro (HTTPS) e se as APIs de sensores de movimento existem no navegador. Serve para validar esta fase e já preparar a fase 2.
- Servidor de desenvolvimento HTTPS sem dependências ([scripts/dev-server.mjs](../scripts/dev-server.mjs)). Gera um certificado autoassinado em `.certs/` no primeiro uso (via openssl).
- Script de redirecionamento de porta no Windows ([scripts/setup-port-forward.ps1](../scripts/setup-port-forward.ps1)).

## Por que HTTPS já nesta fase?

As APIs de sensores (`DeviceOrientationEvent`, `DeviceMotionEvent`) só funcionam em **contexto seguro**. `localhost` conta como seguro, mas um IP de rede local não — por isso o servidor já nasce em HTTPS. O certificado é autoassinado: no celular o Chrome mostra um aviso; toque em **Avançado → Ir mesmo assim** (apenas uma vez por dispositivo). Mesmo com o aviso, o contexto é considerado seguro.

## O desafio do WSL2

O WSL2 roda em uma rede NAT interna: o Windows enxerga o WSL, mas **dispositivos na rede Wi-Fi não**. Topologia identificada nesta máquina:

| Quem | IP |
|---|---|
| Windows na LAN (o que o celular alcança) | `192.168.0.123` |
| WSL2 (rede interna, muda a cada boot) | `192.168.111.x` |

A solução é um *port proxy* no Windows: tudo que chegar na porta 8443 do Windows é repassado para o WSL.

## Como rodar

1. **No WSL** — subir o servidor:
   ```bash
   npm run dev
   ```
2. **No Windows** — uma vez por boot (o IP do WSL muda ao reiniciar), em PowerShell **como Administrador** (Win+X → "Terminal (Admin)"):
   ```powershell
   powershell -ExecutionPolicy Bypass -File "\\wsl.localhost\Ubuntu-22.04\home\grizzo\projetos\game-quem-sou-eu\scripts\setup-port-forward.ps1"
   ```
   O `-ExecutionPolicy Bypass` é necessário porque o Windows, por padrão, bloqueia a execução de arquivos `.ps1` (erro "a execução de scripts foi desabilitada neste sistema"). O bypass vale só para essa execução — não altera a política do sistema. Precisa mesmo ser Administrador: o `netsh portproxy` e a regra de firewall exigem elevação.
3. **No celular** (mesma rede Wi-Fi) — abrir `https://192.168.0.123:8443` e aceitar o aviso de certificado.

## Critério de aceite da fase

No celular, o painel de diagnóstico deve mostrar:
- Contexto seguro: **Sim**
- Sensores de movimento: **APIs presentes**

## Alternativas (se o port proxy incomodar)

- **WSL em modo mirrored** (Windows 11 22H2+): adicionar `networkingMode=mirrored` em `C:\Users\<user>\.wslconfig` e rodar `wsl --shutdown`. O WSL passa a compartilhar o IP do Windows e o port proxy deixa de ser necessário (a regra de firewall continua sendo).
- **Túnel público** (ex.: cloudflared quick tunnel): dá uma URL HTTPS real, funciona de qualquer rede, mas depende de internet e expõe o site temporariamente.
- **adb reverse** (cabo USB + depuração USB): o celular passa a enxergar `localhost` do PC, dispensando certificado.
