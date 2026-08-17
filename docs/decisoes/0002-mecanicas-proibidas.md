# 0002 — Mecânicas proibidas

Data: 2026-08-16
Situação: aceita

## Contexto

O mecanismo central deste app — medir o próprio corpo toda semana e ver a mudança num
gráfico — é o mesmo mecanismo descrito na literatura de dismorfia e de transtorno alimentar
como comparação e checagem corporal. Isso não inviabiliza o produto, mas define onde ele pode
quebrar.

O que me preocupa não é eu acordar um dia e decidir gamificar o app. É o caminho real: numa
sprint apertada, com retenção baixa, alguém propõe um contador de semanas seguidas. Ele resolve
um problema verdadeiro, custa dois dias, e todo concorrente tem. O PR parece inofensivo. É assim
que essas mecânicas entram em qualquer produto — não por decisão, por reflexo.

Enquanto a recusa for princípio escrito num documento, ela depende de eu lembrar dele no dia em
que estiver com pressa. Por isso ela vira gate que reprova o build.

## Decisão

As mecânicas abaixo não entram no Pienza. Para cada uma anoto por que ela é o reflexo da
categoria, por que recuso, e quanto o gate automático realmente cobre.

### 1. Streak, sequência, "N semanas seguidas", contador de continuidade

Reflexo porque é a mecânica de retenção mais barata que existe e funciona. Recuso porque um
contador de continuidade transforma um ato de medição em dívida: a pessoa não mede porque quer
saber, mede para não perder o número. E quem tem mais a perder quando o número zera é exatamente
quem eu menos quero pressionar.
`gate: total` — termo e padrão de contagem.

### 2. Badge, troféu, medalha, nível, XP

Reflexo porque é o vocabulário padrão de engajamento e parece neutro. Recuso porque recompensa
por frequência premia medir mais, e medir mais não é melhor. A frequência saudável de aferição
de um corpo é baixa; o app não tem por que empurrar para cima.
`gate: total` — vocabulário.

### 3. Notificação cobrando check-in atrasado ou lembrando de não quebrar sequência

Reflexo porque toda ferramenta de push traz agendamento pronto e a métrica de retorno sobe.
Recuso porque é o app pedindo que a pessoa olhe para o próprio corpo num momento que ela não
escolheu. Lembrete que a pessoa configurou é outra coisa e é permitido.
`gate: parcial` — pego as APIs de agendamento (`expo-notifications`, `notifee`, cron). Não
distingo lembrete pedido pelo usuário de cobrança do app. Isso é revisão humana.

### 4. Cadência de check-in imposta pelo app

Reflexo porque "semanal" simplifica o produto e o gráfico. Recuso porque cadência imposta cria
atraso, e atraso cria culpa. Quem define é o usuário, e mudar é sempre possível, sem fricção e
sem confirmação que soe como repreensão.
`gate: nenhum` — é desenho de fluxo. Revisão humana.

### 5. Ranking, comparação ou visibilidade entre usuários

Reflexo porque é o motor de crescimento óbvio e foi o que fez o Strava. Recuso porque a tese
deste app é você contra você. Comparação entre corpos é precisamente o mecanismo de comparação
ascendente que eu quero manter fora. O card compartilhável existe; o feed não.
`gate: total` — vocabulário (`leaderboard`, `ranking`, `seguidores`, `feed social`).

### 6. Linha de peso apresentada como progresso

Reflexo porque peso é o número que todo app de fitness coloca no topo com uma seta. Recuso
porque emoldurar peso como progresso é afirmar que uma direção é boa. Peso é um número entre
outros, exibido sem direção.
`gate: parcial` — pego "peso" e "progresso" próximos na mesma linha. Não pego a moldura feita
por layout, ordenação ou ícone.

### 7. Meta calórica, macro, déficit, qualquer alvo numérico de ingestão

Reflexo porque todo app de composição corporal termina virando contador de calorias. Recuso por
dois motivos independentes: prescrição dietética individualizada é privativa de nutricionista
registrado, e alvo numérico de ingestão é a mecânica mais diretamente ligada a restrição.
`gate: total` — vocabulário.

### 8. Imagem gerada do corpo futuro do usuário

Reflexo porque é a demo que vende, e a tecnologia está disponível. Recuso porque é simulação de
resultado apresentada como previsão, sem base e sem responsável. Vale para qualquer forma, e
"preview motivacional" não é exceção.
`gate: parcial` — pego "antes e depois", "corpo futuro". Não pego uma integração nova de geração
de imagem que não use nenhum desses termos.

### 9. Copy que atribua valor a uma direção de mudança corporal

Reflexo porque é a linguagem natural da categoria: "evoluiu", "melhorou", "faltam". Recuso
porque o hexágono mede equilíbrio, não valor, e a copy não pode reintroduzir o juízo que eu tirei
da matemática. Vale também para cor: **semáforo verde/vermelho é proibido** — codificar direção
por cor é a mesma afirmação, feita sem palavras.
`gate: nenhum` — uma frase pode violar isto sem conter nenhum termo de lista. Revisão humana,
sempre.

### 10. Foto de inspiração convertida em alvo numérico ou sobreposta ao hexágono

Reflexo porque, existindo a foto e existindo o gráfico, sobrepor os dois é a feature que se
sugere sozinha. Recuso porque transforma referência qualitativa e privada em distância medida
até outro corpo. A sobreposição do gráfico é sempre você hoje contra você antes.
`gate: parcial` — pego "inspiração" perto de "meta/alvo/target/score". Não pego a sobreposição
feita só em código de renderização.

### 11. Índice ou score de assimetria entre lados

**Escopo estreitado em 2026-08-16.** A versão anterior proibia exibir a diferença entre lados, e
isso era excesso: corpo assimétrico é fato, e saber disso é interesse legítimo de quem mede.
`D 38,2 · E 37,4 · dif 0,8` é permitido e desejado — número cru, sem cor, sem rótulo, sem
direção.

O que recuso é transformar a subtração em índice, score ou nota. Reflexo porque o dado já está no
banco e um subtrair é a coisa mais fácil de escrever no repositório inteiro. Recuso porque um
índice precisa de limiar — a partir de quanto a diferença "conta" — e esse limiar teria que
separar assimetria real de erro de fita, que na mão da própria pessoa frequentemente é maior.
Esse número eu teria que inventar. Somado a isso, assimetria tem causas que vão de dominância
manual a lesão, e qualquer rótulo seria afirmação clínica sem base. Ver ADR 0005.
`gate: parcial` — a regra é de proximidade, e pega "assimetria" perto de índice, score, ratio ou
nota. Não pego um índice construído sem nomear o que ele é.

## Consequências

Aceito que o app vai reter menos que os concorrentes no primeiro mês. As mecânicas acima existem
porque funcionam, e recusar todas ao mesmo tempo tem custo real de retenção. A aposta é que a
retenção que sobra é de quem volta porque a medição é útil, e que essa retenção dura mais.

Aceito também que o gate cobre vocabulário e chamada de API, não semântica. Quatro dos dez itens
são `parcial` ou `nenhum`. Isso está anotado item a item de propósito: um gate que se anuncia
como cobertura total é pior que gate nenhum, porque desliga a atenção de quem revisa. O gate pega
o caso preguiçoso — que é o caso comum. O resto é revisão.

## Implementação

- `scripts/gate-mecanicas-proibidas.mjs`, no `npm run check` e no CI
- Escape explícito por linha: `gate-mecanicas: permitido <motivo>`, com motivo obrigatório.
  Exceção sem justificativa escrita é dívida escondida

## O que descartei

**Regra de ESLint em vez de script.** ESLint só enxerga o que ele parseia; eu preciso pegar
também SQL, JSON de copy e arquivo de configuração. Um script que varre texto cobre a superfície
inteira.

**Deixar como checklist de PR apenas.** É o que eu já fazia, e o problema é que checklist depende
de atenção justamente no dia em que ela está curta.
