# Fase 0 — Schema revisado

Status: **aguardando aval**. Nenhuma migration escrita.
Substitui a seção 1 de `fase-0-proposta.md`. Os conflitos e o desenho de RLS daquele documento
continuam válidos, exceto onde este contradiz.

---

## 1. O que mudou

| Mudança                                                                        | Origem                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `reference_models`, `reference_targets`, `reference_axis_map` **fora da Fase 0** | Corte de escopo — modo de referência foi para a Fase 3                |
| `risk_screenings` **fora da Fase 0**                                            | Mesma regra: triagem em reconsideração, tabela sem escritor            |
| `proportion_ratios` ganha `denominator_kind` e `baseline_checkin_id`            | Baseline próprio virou o denominador padrão                           |
| Nova tabela `baselines`                                                         | Baseline é redefinível pelo usuário; a redefinição precisa de história |
| Nova tabela `age_verification_events`                                           | Autodeclaração de idade deixou de ser suficiente                      |
| Chaves `head` e `knee` no vocabulário de medidas                                | Exigidas pelo sistema Reeves na Fase 3                                 |
| `proportion_axes` perde `lower_is_better`                                       | Ver seção 4 — direção é apresentação, não dado                        |
| `proportion_axes` ganha `measurement_key`                                       | O mapeamento eixo→medida era do `reference_axis_map`, que foi cortado |

Permanecem como estavam: formato longo em `measurement_values`, FK composta, `FORCE RLS`, o
`CHECK` amarrando `storage_path` ao dono, consentimento append-only, a constraint de entrega em
`plans` e a suíte pgTAP em CI.

Sobre manter `plans`/`professionals` na Fase 0 enquanto `reference_models` foi cortada: a
assimetria se justifica porque as duas coisas são de natureza diferente. `reference_models`
habilita uma feature — é peso morto até ser usada. A constraint de `plans` é uma **trava**: o
valor dela é justamente existir antes da feature, para que a feature não possa nascer errada.

---

## 2. Schema

### 2.1 Identidade e idade

```sql
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  birth_date     date,
  biological_sex text check (biological_sex in ('male','female','intersex','undisclosed')),
  unit_system    text not null default 'metric' check (unit_system in ('metric','imperial')),
  locale         text not null default 'pt-BR',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table age_verification_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  method      text not null,          -- 'self_declared','document','provider:<nome>',...
  outcome     text not null check (outcome in ('passed','failed','inconclusive')),
  verified_at timestamptz not null default now(),
  evidence_ref text,                  -- ponteiro opaco; nunca o documento em si
  created_at  timestamptz not null default now()
);
create index on age_verification_events (user_id, verified_at desc);
```

`age_gate_passed_at` saiu de `profiles`: virou uma coluna que só comportava um método. `method`
é texto livre e não enum de propósito — o método será decidido com advogado e o schema não pode
travar a escolha. `evidence_ref` é ponteiro para um comprovante mantido pelo verificador; o
documento não entra no banco em nenhuma hipótese.

Sem `age_gate_passed_at`, "usuário está liberado" passa a ser derivado do último evento com
`outcome = 'passed'`. Fica em função `SECURITY DEFINER`, não em coluna denormalizada que pode
divergir.

### 2.2 Consentimento

Sem mudança em relação à proposta anterior: `consent_purposes` (lookup), `consent_documents`
(texto versionado) e `consent_events` (ledger append-only, revogação é linha nova).

### 2.3 Check-in e medidas

```sql
create table checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  taken_at   timestamptz not null,
  notes      text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on checkins (user_id, taken_at desc);

create table measurement_keys (
  key           text primary key,
  label_ptbr    text not null,
  unit          text not null check (unit in ('cm','kg')),
  bilateral     boolean not null default false,
  min_value     numeric(6,2) not null,
  max_value     numeric(6,2) not null,
  display_order int not null,
  check (max_value > min_value)
);

create table measurement_values (
  checkin_id uuid not null,
  user_id    uuid not null,
  key        text not null references measurement_keys(key),
  side       text not null default 'na' check (side in ('l','r','na')),
  value      numeric(6,2) not null,
  primary key (checkin_id, key, side),
  foreign key (checkin_id, user_id) references checkins(id, user_id) on delete cascade
);
```

Seed do vocabulário, com `head` e `knee` já dentro:

| key           | unidade | bilateral |
| ------------- | ------- | --------- |
| `height`      | cm      | não       |
| `weight`      | kg      | não       |
| `wingspan`    | cm      | não       |
| `head`        | cm      | não       |
| `neck`        | cm      | não       |
| `shoulders`   | cm      | não       |
| `chest`       | cm      | não       |
| `waist`       | cm      | não       |
| `hips`        | cm      | não       |
| `arm_relaxed` | cm      | sim       |
| `arm_flexed`  | cm      | sim       |
| `forearm`     | cm      | sim       |
| `wrist`       | cm      | sim       |
| `thigh`       | cm      | sim       |
| `knee`        | cm      | sim       |
| `calf`        | cm      | sim       |
| `ankle`       | cm      | sim       |

`min_value`/`max_value` são guarda de digitação, propositalmente generosas, e **não são limiar
de saúde**. Servem para barrar 1700 cm de cintura por dedo escorregado no teclado numérico. Vou
propor os pares concretos junto com a migration; nenhum deles carrega significado clínico e
nenhum aparece na UI como "faixa recomendada".

### 2.4 Baseline

```sql
create table baselines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  checkin_id     uuid not null,
  reason         text not null check (reason in ('initial','user_reset')),
  effective_from timestamptz not null default now(),
  effective_to   timestamptz,
  created_at     timestamptz not null default now(),
  foreign key (checkin_id, user_id) references checkins(id, user_id) on delete cascade,
  check (effective_to is null or effective_to > effective_from)
);

create unique index baselines_one_active_per_user
  on baselines (user_id) where effective_to is null;
```

Redefinir baseline fecha a linha vigente (`effective_to = now()`) e abre outra. O índice parcial
garante um único baseline ativo por usuário sem trigger. A história importa por dois motivos:
uma razão calculada em março continua auditável depois de um reset em abril, e a frequência de
resets é um sinal comportamental — ver seção 5.

### 2.5 Razões de proporção

```sql
create table proportion_axes (
  key             text primary key,   -- 'shoulders_back','chest','arms','core_waist','legs','calves'
  label_ptbr      text not null,
  measurement_key text not null references measurement_keys(key),
  display_order   int not null
);

create table proportion_ratios (
  id                 uuid primary key default gen_random_uuid(),
  checkin_id         uuid not null,
  user_id            uuid not null,
  axis_key           text not null references proportion_axes(key),
  denominator_kind   text not null check (denominator_kind in ('baseline','reference')),
  baseline_checkin_id uuid,
  status             text not null check (status in ('ok','missing_input','no_baseline')),
  current_value      numeric(6,2),
  reference_value    numeric(6,2),
  ratio              numeric(6,4),
  inputs             jsonb not null default '{}'::jsonb,
  computed_at        timestamptz not null default now(),
  unique (checkin_id, axis_key, denominator_kind),
  foreign key (checkin_id, user_id) references checkins(id, user_id) on delete cascade,
  foreign key (baseline_checkin_id, user_id) references checkins(id, user_id) on delete cascade,
  check ((status = 'ok') = (ratio is not null)),
  check (
    (denominator_kind = 'baseline' and baseline_checkin_id is not null)
    or (denominator_kind = 'reference' and baseline_checkin_id is null)
  )
);
```

Três coisas travadas por constraint, não por convenção:

1. `denominator_kind = 'baseline'` obriga a registrar **qual** check-in serviu de denominador.
   Sem isso, uma linha antiga vira ambígua no primeiro reset de baseline.
2. `status = 'ok'` e `ratio` andam juntos — não existe eixo "ok" sem razão nem razão em eixo
   indisponível.
3. `ratio` guarda sempre `current_value / reference_value` cru, **sem ajuste de direção**. Ver
   a seção 4.

`no_baseline` substitui `model_not_applicable` como terceiro status: no modo baseline o motivo
de indisponibilidade é não haver baseline ainda, não modelo inaplicável.

### 2.6 Fotos, camada profissional, exclusão

Sem mudança: `photos` com os três carimbos de consentimento e o `CHECK` de prefixo de path;
`professionals` e `plans` com a constraint `delivery_requires_signed_review`;
`deletion_requests` e `audit_log`.

---

## 3. RLS — o que muda

O desenho da proposta anterior vale. Duas tabelas novas entram:

**`baselines`** — padrão dono da linha, com as quatro operações. O usuário precisa poder
redefinir, e redefinir é `UPDATE` na linha vigente mais `INSERT` da nova. `WITH CHECK` no update
impede reatribuição de `user_id`, como nas demais.

**`age_verification_events`** — append-only, como `consent_events`: só `select` e `insert` para
`authenticated`, sem policy de `update`/`delete`. Um evento de verificação que pode ser
reescrito pelo próprio verificado não verifica nada.

Casos novos na suíte pgTAP, somados aos dez anteriores:

11. `UPDATE`/`DELETE` em `age_verification_events` como `authenticated` falha.
12. Dois baselines ativos para o mesmo usuário violam o índice parcial.
13. `INSERT` em `proportion_ratios` com `denominator_kind='baseline'` e `baseline_checkin_id`
    nulo viola a constraint.
14. `baseline_checkin_id` apontando para check-in de outro usuário é rejeitado pela FK composta.

---

## 4. Um buraco na decisão do eixo de cintura

A resposta em Q4 diz que o eixo invertido "satura em ratio 1,0 contra a própria cintura inicial:
redução abaixo disso é registrada como mudança, mas para de aumentar a proporção". Isso elimina
o gradiente de incentivo, e nesse ponto está certo. Mas cria outro problema, e ele é pior.

Escrevendo o que a regra faz, com `b` = cintura no baseline e `c` = cintura atual, valor plotado
`= min(1, b/c)`:

| situação                     | `b/c` | plotado | movimento do vértice     |
| ---------------------------- | ----- | ------- | ------------------------ |
| cintura reduziu (`c < b`)    | > 1   | 1,0     | **nenhum**               |
| cintura igual                | 1     | 1,0     | nenhum                   |
| cintura aumentou (`c > b`)   | < 1   | < 1,0   | para dentro              |

O eixo fica **monotônico em uma direção só**: nunca sobe, só desce. Para quem está reduzindo
cintura — o caso de uso principal — ele congela na posição do dia 1 e não informa nada. Para
quem ganhou cintura, encolhe visivelmente. O resultado líquido é que o único evento de cintura
que o hexágono consegue mostrar é o ganho. Como sinal para um usuário vulnerável, isso é o
oposto do que a saturação pretendia.

A raiz é que a inversão em si já é o app tomando posição sobre o que é bom. No modo de
referência externa a posição vinha embutida no modelo e não tinha como sair. No modo baseline
ela é opcional — e a seção 2.2 do brief diz que o hexágono mede equilíbrio, não valor.

**Proposta: eliminar a inversão.** Os seis eixos plotam `current / baseline`, sem exceção.

- Dia 1: todos valem 1, hexágono regular. Igual ao que você já aceitou.
- Cintura reduziu: o vértice recolhe. Factual, simétrico, e o app não afirma se é bom.
- Cintura aumentou: o vértice avança. Também factual.
- Some o caso especial, some o clamp assimétrico, some qualquer limiar a inventar.

Sobra um problema de leitura, não de matemática: parte dos usuários vai ler "para fora = bom" de
qualquer jeito, e um vértice de cintura recolhendo pode ser lido como piora. Isso se resolve no
desenho da Fase 1 — rótulo, cor neutra no eixo, e o delta numérico ao lado — e é uma decisão de
design que eu prefiro tomar com o gráfico na tela do que agora, no schema.

O que o schema precisa decidir **agora** é só isto: `proportion_ratios.ratio` guarda a razão
crua e nunca um valor ajustado por direção. Foi por isso que tirei `lower_is_better` de
`proportion_axes`. Assim, qualquer que seja a decisão de desenho na Fase 1 — inverter, não
inverter, mostrar direção por cor — ela é reversível sem recomputar o histórico.

Para o clamp de renderização: continua necessário, mas como constante de desenho aplicada
igualmente aos seis eixos (o anel externo da grade), não como regra de um eixo.

---

## 5. Sobre trocar a triagem

Pergunta: trocar o gate SCOFF por "nenhuma mecânica que premie restrição + recursos de ajuda
passivos e permanentes". Concordo com a troca. Vejo três buracos, e nenhum deles reabre o SCOFF.

Antes: seus dois argumentos são melhores que o meu. Um gate que bloqueia features ensina o
usuário a mentir na triagem, e aplicar instrumento validado devolvendo declaração de risco sem
clínico no fluxo encosta em diagnóstico — é exposição, não proteção.

**Buraco 1 — a superfície não encolheu tanto quanto o argumento supõe.** O argumento vale para o
número; o eixo de cintura, do jeito que ficou em Q4, continua sendo a única mecânica do app com
direção moral embutida. A proposta da seção 4 fecha isso. Sem ela, "nenhuma mecânica que premie
restrição" não é verdade no código.

**Buraco 2 — o loop de fotos está fora do argumento.** A Fase 2 traz foto corporal padronizada
semanal, em três ângulos, com timeline. Fotografar o próprio corpo em cadência fixa para
inspecionar mudança é um comportamento por si só, independente de qualquer pontuação. Retirar o
número não retira a câmera. Não acho que isso peça triagem; acho que pede itens explícitos na
lista de mecânicas proibidas: sem streak de check-in, sem badge de "N semanas seguidas", sem
notificação cobrando check-in atrasado, cadência definida pelo usuário. Se algum desses entrar
depois sem revisão, entra fácil — são exatamente as features que todo app de fitness copia.

**Buraco 3 — peso continua no vocabulário.** Sem meta calórica, mas uma linha de peso descendo
apresentada como progresso é adjacente à restrição. É restrição de copy e de desenho, barata
agora: o gráfico de peso mostra variação, não "meta".

**Sobre os recursos passivos:** o risco de "permanente e passivo" é virar invisível. Um
meio-termo que não é gate e não é triagem: oferecer ajuda a partir de sinais de **uso do app**,
não de valores do corpo — por exemplo, resets de baseline repetidos numa janela curta, ou
frequência de check-in muito acima da cadência que o próprio usuário definiu. São limiares de
produto, não de saúde: não precisam de fonte clínica, não produzem escore, não bloqueiam nada,
não afirmam nada sobre a pessoa. É oferta, não porta. A tabela `baselines` com história já
sustenta o primeiro sinal sem nada a mais.

**Proposta concreta:** transformar "nenhuma mecânica que premie restrição" numa lista escrita em
`docs/decisoes/`, com as mecânicas nomeadas uma a uma, e checá-la em revisão de PR. Enquanto for
princípio, é intenção; nomeada, vira item verificável.

---

## 6. Aberto

**A1 — `reference_model_id` em `proportion_ratios`.** Você pediu a coluna desde já. Recomendo
adiar só ela. `denominator_kind` se paga agora porque muda o significado de toda linha escrita
na Fase 1: sem ela, a Fase 3 não sabe interpretar o histórico. `reference_model_id` não tem esse
problema — é `ALTER TABLE ADD COLUMN` nullable, zero linhas tocadas, e adicionada agora seria um
uuid apontando para uma tabela que não existe, sem FK que a segure. Sua chamada; implemento como
você decidir.

**A2 — Inversão do eixo de cintura.** Seção 4. Trava o cálculo da Fase 1, não o schema.

**A3 — Lista de mecânicas proibidas.** Escrevo como ADR se você aprovar a ideia.

Nada disso trava a escrita das migrations, exceto A1.
