# Fase 4 — O jogo (mecânica de gestos)

Fase em andamento. Começou pela **mecânica central**: detectar, com o celular na
testa, o gesto de "acerto" e o de "skip", isolado numa página de teste antes de
virar o jogo completo.

## Peças

- **[lib/game-config.js](../lib/game-config.js)** — configuração default do jogo (limiares, cooldown, neutro, tolerância de posição) em um só lugar, para um futuro menu de "configurações" do usuário poder sobrescrever.
- **[lib/forehead-tilt.js](../lib/forehead-tilt.js)** — converte o gamma cru (−90..90) numa **inclinação contínua** centrada no neutro da testa (~90), resolvendo a dobra do gamma no ±90 (ver abaixo). Coberta por [tests/forehead-tilt.test.mjs](../tests/forehead-tilt.test.mjs).
- **[lib/gesture-detector.js](../lib/gesture-detector.js)** — máquina de estados **pura** (sem DOM/sensores) que recebe amostras de **inclinação** e emite `hit` / `skip` / `reposition` / `positioned` / `armed`. Coberta por [tests/gesture-detector.test.mjs](../tests/gesture-detector.test.mjs).
- **[lib/gauge-geometry.js](../lib/gauge-geometry.js)** — geometria pura do medidor (valor → %), testável ([tests/gauge-geometry.test.mjs](../tests/gauge-geometry.test.mjs)).
- **[lib/value-gauge.js](../lib/value-gauge.js)** — `<value-gauge>`, **Web Component** (Custom Element + Shadow DOM, CSS encapsulado) que desenha o medidor consumindo a geometria pura. Reutilizável em outras telas; tematizável por custom properties (`--gauge-zone-color`, `--gauge-needle-color`).
- **[pages/gesture-counter/](../pages/gesture-counter/)** — página de teste: placar (+1 acerto / −1 skip), contadores, o **medidor `<value-gauge>`** (agulha da inclinação, faixa de posição válida, marcadores de acerto/skip e neutro), sliders de calibração, feedback (vibração/som/flash) e log.

## O jogo em si ([pages/game/](../pages/game/))

Página única com quatro telas (setup → contagem regressiva → jogando → resultados), em destaque na home. Fluxo: 3‑2‑1, depois 60s em que as palavras passam uma a uma; gesto marca acerto ou skip. Encerra no fim do tempo **ou** quando as palavras acabam. A palavra ainda na tela quando o tempo estoura **não** conta (só entram as resolvidas). Resultados: acertos em destaque, depois palavras exibidas / aproveitamento / acertos por segundo, e a lista de palavras (acertos em verde, skips em cinza).

A lógica fica em módulos **puros e testados** em `lib/`; a página só cuida do que é do browser (relógio, telas, sensores, feedback):

- **Listas de palavras**: dados em JSON ([assets/word-lists/](../assets/word-lists/), por ora só `animais.json`, formato `{ id, name, words }`). O registro de categorias ([lib/categories.js](../lib/categories.js)) guarda só os metadados (id + nome) — pensado para uma futura tela de "modo de jogo" listar/escolher categorias sem baixar todas as palavras. Adicionar lista = um JSON novo + uma entrada no registro.
- **[lib/deck.js](../lib/deck.js)** — monta a pilha de cartas (`{ word, listId }`) a partir das listas escolhidas, embaralhada (Fisher–Yates com RNG injetável → determinístico no teste). Sem repetição dentro da partida; cada carta carrega de qual lista veio (para estatística futura por palavra).
- **[lib/match.js](../lib/match.js)** — estado da partida: percorre o deck, registra cada carta como acerto/skip, sabe quando acabou e gera o registro persistível (`toRecord`).
- **[lib/match-stats.js](../lib/match-stats.js)** — deriva os números da tela de resultados a partir do registro (acertos, exibidas, aproveitamento, acertos/s).
- **[lib/match-repository.js](../lib/match-repository.js)** — persistência atrás de uma interface (`save`/`list`/`clear`/`export`/`import`). Hoje sobre **localStorage** (storage injetável → testável), com versionamento no payload para migração futura. Quando o volume/consulta exigir, troca-se por IndexedDB sem mexer no jogo.

Cobertos por [tests/deck.test.mjs](../tests/deck.test.mjs), [tests/match.test.mjs](../tests/match.test.mjs), [tests/match-stats.test.mjs](../tests/match-stats.test.mjs) e [tests/match-repository.test.mjs](../tests/match-repository.test.mjs).

## Como a detecção funciona

Tudo relativo a um **gamma neutro** (celular na testa):

1. **Acerto / skip**: ao cruzar o limiar (`triggerAngle`) para um lado conta acerto, para o outro conta skip. `invertDirection` troca os lados. Por decisão: gamma **diminuindo** = acerto (inclinar para baixo).
2. **Vai e volta sem contar o oposto**: após disparar, o detector **desarma** e só re-arma quando o gamma volta à **zona neutra** (`neutralBand`) **e** o **cooldown** expira. Isso impede que o retorno/overshoot de um gesto seja contado como o gesto contrário.
3. **Posição**: desvio grande e **sustentado** (além de `positionMaxDeviation`, por `positionDebounceMs`) significa que o celular saiu da testa. O **medidor** mostra o gamma ao vivo (agulha) contra a faixa de posição válida, para o usuário ver a variável e ajustar — em vez de um overlay opaco que escondia tudo. Um desvio breve (um gesto) não dispara o aviso, e um desvio acima da tolerância também **não conta como gesto** (é "saindo de posição").

## A dobra do gamma no ±90 (resolvida)

Com o celular na testa, o neutro do gamma fica em ~90 — bem na borda. Ao fazer o
gesto de **skip**, o gamma tenta passar de 90, satura e **salta para −90**,
subindo de volta. Resultado observado no aparelho: só um gesto funcionava (o que
faz o gamma *diminuir*); invertendo, o outro funcionava, nunca os dois.

Correção: [foreheadTilt()](../lib/forehead-tilt.js) desdobra o gamma — `tilt =
gamma >= 0 ? gamma : gamma + 180` — de modo que +90 e −90 viram o **mesmo centro
(90)**. Aí o acerto fica **abaixo** de 90 e o skip **acima**, e o detector volta
a ser um simples desvio do neutro. Bônus: estabiliza o tremor entre +89/−89 na
borda. O medidor da página mostra a inclinação desdobrada, com marcadores de
onde acerto/skip disparam. Velocidade (`rotationRate`) ficou de fora do v1.

## Próximos passos

- Calibrar os números no aparelho (neutro, limiar, cooldown).
- Tela de histórico de partidas (lendo `MatchRepository.list()`) + export/import do backup.
- Estatísticas por palavra (quais mais acertadas/erradas), agregando os `entries` das partidas.
- Tela de "modo de jogo" escolhendo as categorias; mais listas (países, personalidades, etc.).
- Eventualmente, tela de configurações sobrescrevendo `game-config.js`.
