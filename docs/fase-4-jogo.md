# Fase 4 — O jogo (mecânica de gestos)

Fase em andamento. Começou pela **mecânica central**: detectar, com o celular na
testa, o gesto de "acerto" e o de "skip", isolado numa página de teste antes de
virar o jogo completo.

## Peças

- **[lib/game-config.js](../lib/game-config.js)** — configuração default do jogo (limiares, cooldown, neutro, tolerância de posição) em um só lugar, para um futuro menu de "configurações" do usuário poder sobrescrever.
- **[lib/forehead-tilt.js](../lib/forehead-tilt.js)** — converte o gamma cru (−90..90) numa **inclinação contínua** centrada no neutro da testa (~90), resolvendo a dobra do gamma no ±90 (ver abaixo). Coberta por [tests/forehead-tilt.test.mjs](../tests/forehead-tilt.test.mjs).
- **[lib/gesture-detector.js](../lib/gesture-detector.js)** — máquina de estados **pura** (sem DOM/sensores) que recebe amostras de **inclinação** e emite `hit` / `skip` / `reposition` / `positioned` / `armed`. Coberta por [tests/gesture-detector.test.mjs](../tests/gesture-detector.test.mjs).
- **[pages/gesture-counter/](../pages/gesture-counter/)** — página de teste: placar (+1 acerto / −1 skip), contadores, **medidor (agulha) do gamma** com a faixa de posição válida e o neutro marcados, sliders de calibração, feedback (vibração/som/flash) e log.

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
- Definir de onde vêm os nomes/cartas e o fluxo de uma partida (timer, resultado).
- Eventualmente, tela de configurações sobrescrevendo `game-config.js`.
