# Fase 2 — Sensores de movimento

## O que foi construído

- **Módulo reutilizável** [lib/motion-sensors.js](../lib/motion-sensors.js): encapsula `DeviceOrientationEvent` e `DeviceMotionEvent` atrás de uma classe `MotionSensors` (callbacks `onOrientation`/`onMotion`, `start()`/`stop()`). Não tem nada de UI — é este módulo que o jogo importará na fase 4; por isso vive em `lib/`.
- **Página de teste** [pages/sensor-test/](../pages/sensor-test/): mostra os valores ao vivo com rastreamento de mínimo/máximo e taxa de eventos por segundo. Acessível pela home.

## As duas APIs

| API | Evento | O que entrega |
|---|---|---|
| `DeviceOrientationEvent` | `deviceorientation` | **Posição** angular do aparelho em graus: `alpha` (eixo Z, 0–360), `beta` (eixo X, frente/trás, −180–180), `gamma` (eixo Y, esquerda/direita, −90–90) |
| `DeviceMotionEvent` | `devicemotion` | **Movimento**: aceleração (m/s², com e sem gravidade) e velocidade de rotação (°/s) |

Ambas exigem **contexto seguro** (HTTPS). No Android/Chrome não há prompt de permissão; no iOS Safari seria preciso `requestPermission()` em resposta a um toque — o módulo já trata os dois casos.

## O que observar para o jogo (fase 4)

Com o celular na testa, o gesto de acerto/erro (inclinar o aparelho para baixo/cima) deve aparecer principalmente em:

- **beta** se o aparelho estiver em pé (retrato);
- **gamma** se estiver deitado (paisagem — provável posição do jogo).

Os valores de mín/máx da página de teste servem para descobrir os **limiares do gesto** (ex.: "inclinou mais de 45° em menos de X ms"). A velocidade de rotação (`rotationRate`) pode diferenciar um gesto intencional de um movimento lento da cabeça.

## Resultados da validação (2026-06-12, Android/Chrome)

- ✅ **gamma é o eixo que reflete o gesto do jogo** (celular deitado/paisagem, inclinar para frente).
- Taxa de eventos medida: **orientação ~38/s**, **movimento ~60/s**.
- Implicação para a fase 4: a detecção de gesto pode usar `gamma` (posição) com `rotationRate` (velocidade, a 60 Hz) para distinguir o gesto intencional de movimentos lentos da cabeça.
