# Fase 0 — Proposta para aprovação

Status: **aguardando aval**. Nada aqui foi implementado.
Escopo: schema + RLS, conflitos identificados, estrutura de diretórios.

---

## 1. Schema refinado

### 1.1 Mudanças que proponho em relação ao esboço da seção 4 do brief

| # | Mudança | Motivo |
|---|---|---|
| M1 | `checkins` vira raiz do agregado; a tabela `measurements` deixa de existir | O esboço tem `measurements.taken_at` **e** `checkins.taken_at`, mais `checkins.measurement_id` — duas fontes de verdade para "quando" e uma FK que pode divergir. Um check-in **é** o evento; medidas e fotos são payload dele. |
| M2 | Medidas em formato longo (`measurement_values`), não uma coluna por medida | O brief exige modelos de referência plugáveis "sem migração de dados". Um modelo novo que use uma medida nova (ex.: `neck`) só funciona se as medidas forem endereçáveis por chave. Bônus: medida ausente = linha ausente, que é exatamente a semântica de "eixo indisponível". |
| M3 | `proportion_scores` → **`proportion_ratios`** | A seção 2.2 proíbe "nota/score" na copy. Se a tabela se chama `scores`, a palavra vaza para o tipo TS, para o endpoint e daí para a UI. O nome do dado é a primeira linha de defesa da copy. |
| M4 | `consent_flags jsonb` → tabelas `consent_documents` + `consent_events` (append-only) | Um jsonb mutável não prova **quando** o consentimento foi dado nem **qual texto** foi aceito. LGPD art. 8º §2º põe o ônus da prova no controlador. Revogação = novo evento, nunca `UPDATE`. |
| M5 | `height_cm` sai de `profiles`, vira medida | Altura é medida com data de aferição, como as outras. |
| M6 | `reference_models` ganha `reference_targets` + `reference_axis_map` | O modelo Reeves é uma **cadeia** (`peito = 6,5 × punho`; `cintura = 0,70 × peito`), não uma tabela plana de coeficientes. Precisa de derivação declarativa. |
| M7 | `user_id` denormalizado em toda tabela-filha, com FK composta | RLS que precisa de `JOIN` para decidir acesso é lento e frágil. A FK composta `(checkin_id, user_id) → checkins(id, user_id)` torna impossível uma linha-filha apontar para o dono errado, sem trigger. |
| M8 | Novas tabelas: `professionals`, `risk_screenings`, `deletion_requests`, `audit_log` | Exigidas pelas seções 2.1, 2.2 e 2.3. Criar agora custa uma migration; criar depois custa refatoração de RLS. |

### 1.2 Tabelas de referência (lookup, populadas por seed — não são enums)

Enum de Postgres exige migration para ganhar valor novo, o que colide com "adicionar modelos depois sem migração". Por isso lookup tables.

```sql
create table measurement_keys (
  key           text primary key,          -- 'wrist','chest','waist','shoulders',...
  label_ptbr    text not null,
  unit          text not null check (unit in ('cm','kg')),
  bilateral     boolean not null default false,
  min_value     numeric(6,2) not null,     -- guarda de digitação, NÃO limiar de saúde
  max_value     numeric(6,2) not null,
  display_order int  not null
);

create table proportion_axes (
  key             text primary key,   -- 'shoulders_back','chest','arms','core_waist','legs','calves'
  label_ptbr      text not null,
  display_order   int  not null,
  lower_is_better boolean not null default false   -- true apenas em 'core_waist'
);

create table consent_purposes (
  key         text primary key,   -- 'store_measurements','store_photos',
  label_ptbr  text not null,      -- 'process_photos_external','share_card','professional_review'
  requires_per_event boolean not null default false
);
```

`min_value`/`max_value` são **guardas de integridade** (impedir 1700 cm de cintura por dedo escorregado), explicitamente não são pisos de saúde. Os pisos de saúde da seção 2.2 são outra coisa e estão pendentes de fonte — ver Q4.

### 1.3 Núcleo

```sql
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  birth_date         date,
  biological_sex     text check (biological_sex in ('male','female','intersex','undisclosed')),
  unit_system        text not null default 'metric' check (unit_system in ('metric','imperial')),
  locale             text not null default 'pt-BR',
  age_gate_passed_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
```

`profiles.id` **é** `auth.users.id` (convenção Supabase): elimina a coluna `user_id` redundante e faz a policy virar `id = auth.uid()`. `biological_sex` existe só para decidir aplicabilidade do modelo de referência (ver conflito C2), é opcional, e não entra em nenhum cálculo.

```sql
create table checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  taken_at   timestamptz not null,
  notes      text,
  created_at timestamptz not null default now(),
  unique (id, user_id)          -- alvo das FKs compostas das filhas
);
create index on checkins (user_id, taken_at desc);

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

Trigger `validate_measurement_value` confere `value` contra `min_value`/`max_value` e coerência de `side` com `bilateral`. Membros pares gravam `l`/`r`; o formulário da Fase 1 pode coletar um lado só, sem migration para ganhar o outro depois.

```sql
create table photos (
  id                            uuid primary key default gen_random_uuid(),
  checkin_id                    uuid not null,
  user_id                       uuid not null,
  angle                         text not null check (angle in ('front','side','back')),
  bucket                        text not null default 'checkin-photos',
  storage_path                  text not null unique,
  content_hash                  text,
  byte_size                     integer,
  captured_at                   timestamptz,
  consent_store_at              timestamptz not null,   -- evento de upload
  consent_external_processing_at timestamptz,            -- null = nunca saiu do perímetro
  consent_share_at              timestamptz,
  deleted_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  foreign key (checkin_id, user_id) references checkins(id, user_id) on delete cascade,
  check (storage_path like (user_id::text || '/%'))
);
```

O `CHECK` do prefixo do path amarra a linha à policy de Storage (`(storage.foldername(name))[1] = auth.uid()`). Sem ele, as duas camadas podem divergir silenciosamente. Os três `consent_*_at` implementam "consentimento explícito por evento" da seção 2.3: são carimbos por foto, não flags de perfil.

### 1.4 Modelo de referência plugável

```sql
create table reference_models (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null,
  version        integer not null default 1,
  name           text not null,
  source_citation text not null check (length(btrim(source_citation)) > 0),
  source_url     text,
  evidence_level text not null
                 check (evidence_level in ('clinical','anthropometric','aesthetic_historical')),
  applies_to     jsonb not null default '{}'::jsonb,   -- {"biological_sex":["male"]}
  is_active      boolean not null default false,
  reviewed_by_professional_id uuid references professionals(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (slug, version)
);

create table reference_targets (
  model_id    uuid not null references reference_models(id) on delete cascade,
  target_key  text not null,                              -- 'chest','waist','arm','calf','thigh'
  base_kind   text not null check (base_kind in ('measurement','target')),
  base_key    text not null,
  coefficient numeric(8,4) not null check (coefficient > 0),
  primary key (model_id, target_key)
);

create table reference_axis_map (
  model_id        uuid not null references reference_models(id) on delete cascade,
  axis_key        text not null references proportion_axes(key),
  measurement_key text not null references measurement_keys(key),
  target_key      text not null,
  primary key (model_id, axis_key),
  foreign key (model_id, target_key) references reference_targets(model_id, target_key)
);
```

O modelo Reeves como descrito no brief vira dados:

| target_key | base_kind | base_key | coefficient |
|---|---|---|---|
| chest | measurement | wrist | 6.5000 |
| waist | target | chest | 0.7000 |
| hips | target | chest | 0.8500 |
| thigh | target | chest | 0.5300 |
| arm | target | chest | 0.3600 |
| calf | target | chest | 0.3400 |

**Consequência estrutural importante:** como todo alvo é `coeficiente × (medida | alvo)`, a cadeia inteira é homogênea de grau 1. Multiplicar todas as medidas do usuário por *k* multiplica numerador e denominador por *k*, e as razões não mudam. Ou seja: **o teste de propriedade da seção 5 do brief não é só um teste, é uma invariante que o schema torna inexprimível de violar** — não há como escrever um termo aditivo ou não-linear nessas tabelas. Um modelo futuro que precise de constante absoluta (algo tipo IMC) não caberia aqui, e isso é proposital. O teste de propriedade roda contra *todos* os modelos da tabela, não contra um caso fixo.

**Buraco conhecido:** a tabela acima cobre 5 dos 6 eixos. Não há coeficiente para **Ombros/Costas** no material que você me passou, e eu não vou inventar um nem citar uma fonte que não verifiquei. Ver Q1.

### 1.5 Derivado

```sql
create table proportion_ratios (
  id              uuid primary key default gen_random_uuid(),
  checkin_id      uuid not null,
  user_id         uuid not null,
  model_id        uuid not null references reference_models(id),
  axis_key        text not null references proportion_axes(key),
  status          text not null
                  check (status in ('ok','missing_input','model_not_applicable')),
  current_value   numeric(6,2),
  reference_value numeric(6,2),
  ratio           numeric(6,4),
  inputs          jsonb not null default '{}'::jsonb,   -- medidas exatas usadas
  computed_at     timestamptz not null default now(),
  unique (checkin_id, model_id, axis_key),
  foreign key (checkin_id, user_id) references checkins(id, user_id) on delete cascade,
  check ((status = 'ok') = (ratio is not null))
);
```

Cache recomputável, nunca fonte de verdade. `status` distingue os três motivos de um eixo não plotar, e o `CHECK` impede a combinação incoerente (`ok` sem razão). `inputs` guarda as medidas usadas naquele cálculo, para auditar um histórico recalculado. Trigger em `measurement_values` invalida as linhas do check-in afetado.

### 1.6 Camada profissional, triagem, exclusão

```sql
create table professionals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users(id) on delete set null,
  full_name           text not null,
  council             text not null check (council in ('CREF','CRN')),
  registration_number text not null,
  uf                  char(2) not null,
  verified_at         timestamptz,
  active              boolean not null default false,
  unique (council, registration_number, uf)
);

create table plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  kind              text not null check (kind in ('training','nutrition')),
  status            text not null default 'draft_ai'
                    check (status in ('draft_ai','pending_review','changes_requested',
                                      'approved','delivered','revoked','expired')),
  draft_content     jsonb not null,
  reviewed_content  jsonb,
  periodization     jsonb,
  professional_id   uuid references professionals(id),
  reviewed_at       timestamptz,
  signature_ref     text,
  consent_event_id  uuid references consent_events(id),
  delivered_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  constraint delivery_requires_signed_review check (
    status <> 'delivered' or (
      professional_id  is not null and
      reviewed_at      is not null and
      signature_ref    is not null and
      periodization    is not null and
      consent_event_id is not null
    )
  )
);
```

O gate legal da seção 2.1 vira **constraint de banco**, não convenção de código: é fisicamente impossível gravar `status = 'delivered'` sem profissional, data de revisão, assinatura, periodização e termo de consentimento. Um bug de aplicação não consegue entregar plano não assinado.

```sql
create table risk_screenings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  instrument         text not null,          -- 'SCOFF'
  instrument_version text not null,
  locale             text not null,
  raw_answers        jsonb,                  -- decisão pendente, ver Q6
  score              integer,
  outcome            text not null check (outcome in ('cleared','flagged','incomplete')),
  taken_at           timestamptz not null default now()
);

create table deletion_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  requested_at       timestamptz not null default now(),
  confirmed_at       timestamptz,
  purged_at          timestamptz,
  storage_objects_purged integer,
  backup_expiry_at   timestamptz,
  notes              text
);

create table audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  actor_role  text not null,        -- 'user','professional','system'
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
```

---

## 2. Políticas de RLS

### 2.1 Regras gerais

1. `ENABLE` **e** `FORCE ROW LEVEL SECURITY` em todas as tabelas. Sem `FORCE`, o dono da tabela ignora RLS e um teste rodando como `postgres` passa em verde mentindo.
2. `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated` e `GRANT` explícito por tabela e por operação. Nada de acesso por default.
3. Uma policy **por operação**, nunca `FOR ALL` — `FOR ALL` não permite distinguir `USING` de `WITH CHECK` com clareza e não é testável por operação.
4. Sempre `(select auth.uid())` e não `auth.uid()`: o subselect é avaliado uma vez por query (InitPlan) em vez de uma vez por linha.
5. Índice em `user_id` em toda tabela com RLS — a policy vira predicado de todo plano de execução.
6. `anon` não tem policy em nenhuma tabela do domínio. Zero acesso não autenticado.

### 2.2 Padrão "dono da linha" (`checkins`, `measurement_values`, `photos`, `consent_events`, `risk_screenings`)

```sql
alter table checkins enable row level security;
alter table checkins force  row level security;
grant select, insert, update, delete on checkins to authenticated;

create policy checkins_select_own on checkins for select to authenticated
  using (user_id = (select auth.uid()));

create policy checkins_insert_own on checkins for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy checkins_update_own on checkins for update to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy checkins_delete_own on checkins for delete to authenticated
  using (user_id = (select auth.uid()));
```

O `WITH CHECK` no `UPDATE` é o que impede o usuário de reatribuir a própria linha para outro `user_id`. Um erro comum é escrever só o `USING`.

### 2.3 Exceções — as que importam

**`consent_events` — append-only.** Só `select` e `insert`. Nenhuma policy de `update`/`delete` existe, então ambas são negadas por ausência. Revogar consentimento é inserir `action = 'revoked'`, jamais apagar o `granted`. O histórico é a prova.

```sql
grant select, insert on consent_events to authenticated;
create policy consent_select_own on consent_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_insert_own on consent_events for insert to authenticated
  with check (user_id = (select auth.uid()));
```

**`proportion_ratios` — leitura e nada mais.** Dado derivado não se escreve pelo cliente; se escrevesse, deixaria de ser derivado.

```sql
grant select on proportion_ratios to authenticated;
create policy ratios_select_own on proportion_ratios for select to authenticated
  using (user_id = (select auth.uid()));
-- sem policies de insert/update/delete: escrita só por função SECURITY DEFINER / service_role
```

**`plans` — o gate profissional em RLS.** Usuário só enxerga plano entregue; profissional ativo enxerga o que está revisando; ninguém escreve pelo cliente.

```sql
grant select on plans to authenticated;

create policy plans_select_delivered on plans for select to authenticated
  using (user_id = (select auth.uid()) and status = 'delivered');

create policy plans_select_reviewer on plans for select to authenticated
  using (exists (
    select 1 from professionals p
    where p.user_id = (select auth.uid())
      and p.id = plans.professional_id
      and p.active
  ));
-- nenhuma escrita para 'authenticated': transições de status só via Edge Function
```

Rascunho de IA em `draft_ai`/`pending_review` é **invisível ao usuário por RLS**, não por condicional de tela. É a diferença entre "a UI não mostra" e "o banco não devolve".

**`reference_models` / lookups — leitura pública autenticada, escrita nenhuma.**

```sql
grant select on reference_models, reference_targets, reference_axis_map,
                measurement_keys, proportion_axes, consent_purposes to authenticated;
create policy models_select_active on reference_models for select to authenticated
  using (is_active);
```

**`professionals`** — a tabela fica fechada; o app lê nome/conselho/registro por uma view `security_invoker` que expõe só o necessário para exibir a assinatura no plano.

**`audit_log`, `deletion_requests`** — nenhum acesso para `authenticated`. Só `service_role`.

### 2.4 Storage

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin-photos','checkin-photos', false, 15728640,
        array['image/jpeg','image/png','image/heic']);

create policy photos_read_own on storage.objects for select to authenticated
  using (bucket_id = 'checkin-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'checkin-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'checkin-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
-- sem policy de update: foto é imutável; correção = nova foto
```

Path canônico `{user_id}/{checkin_id}/{angle}-{uuid}.jpg`. Bucket privado, leitura por URL assinada de TTL curto gerada no servidor. Nenhuma URL pública, em nenhum momento.

### 2.5 Como o RLS é testado (entregável da Fase 0)

pgTAP via `supabase test db`, com helper que troca de identidade dentro da transação:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-do-usuario-A>","role":"authenticated"}';
```

Casos mínimos, todos obrigatórios em CI:

1. Usuário B não lê, não altera e não apaga nenhuma linha de A — em cada tabela do domínio.
2. `anon` recebe zero linhas em toda tabela do domínio.
3. `UPDATE` tentando trocar `user_id` da própria linha é rejeitado (cobre o `WITH CHECK`).
4. `INSERT`/`UPDATE`/`DELETE` em `proportion_ratios` como `authenticated` falha.
5. `SELECT` em `plans` com status ≠ `delivered` devolve zero linhas para o dono.
6. `INSERT` em `plans` com `status='delivered'` sem assinatura viola a constraint.
7. `UPDATE`/`DELETE` em `consent_events` falha.
8. `INSERT` em `photos` com `storage_path` de prefixo alheio viola o `CHECK`.
9. FK composta: `INSERT` em `measurement_values` com `user_id` ≠ dono do check-in falha.
10. Objeto de Storage fora da pasta do próprio uid é negado.

---

## 3. Conflitos identificados

Ordenados por quanto custa descobrir tarde.

### C1 — O hexágono contradiz "sempre contra si mesmo" (bloqueia a Fase 1)

O brief afirma duas coisas que não fecham. A seção 1 diz que a comparação é sempre você-contra-você, e a 2.2 diz que a foto de inspiração nunca vira alvo numérico. Mas a seção 5 define `ratio = medida_atual / medida_de_referência`, e a referência é um ideal estético externo (Reeves). O ideal não foi eliminado — foi embutido no denominador de todo eixo. O anel externo do gráfico *é* um alvo, só que anônimo.

Não é fatal, mas é uma decisão de produto que muda a semântica de `proportion_ratios` e precisa ser tomada antes de eu congelar o schema. Três saídas:

- **(a) Referência = seu próprio baseline.** Denominador vira o primeiro check-in do usuário. O hexágono passa a mostrar mudança, não distância de um ideal. Coerente 100% com a tese "contra si mesmo", e sai do território da comparação ascendente. Custo: o hexágono do dia 1 é um hexágono regular perfeito e não diz nada sobre desequilíbrio — perde-se justamente o insight de "onde estou menos desenvolvido".
- **(b) Mantém a referência externa, com a copy e o desenho blindados.** Nunca renderizar o anel 1,0 como meta, nunca mostrar "faltam X%", nunca ordenar eixos do pior para o melhor. O gráfico mostra formato, não distância.
- **(c) Dois modos**, com o modo (a) como padrão.

Recomendo **(c) com (a) como default**. Custa uma coluna (`reference_kind` em `reference_models`: `'self_baseline' | 'external'`) e resolve o conflito sem matar o insight. Mas é sua chamada — é decisão de produto, não de engenharia.

### C2 — O modelo Reeves é masculino e estético, não antropométrico

Os coeficientes vêm da musculação clássica masculina dos anos 1950. Aplicados sem alteração a um corpo feminino, o eixo Core/Cintura e a razão quadril/peito produzem um hexágono sistematicamente "desequilibrado" por construção — exatamente o vetor de dano descrito na 2.2, entregue pela matemática e não pela copy.

Proposta: `reference_models.applies_to` com escopo explícito; quando não houver modelo aplicável ao perfil, o eixo retorna `model_not_applicable` e a UI diz isso, em vez de calcular calado com um modelo errado. Isso implica que **o app pode não ter hexágono para mulheres no lançamento**, a menos que você forneça um modelo com fonte. Ver Q3.

Relacionado: `evidence_level` existe para o app nunca apresentar um modelo estético histórico com a mesma autoridade de um dado antropométrico.

### C3 — O eixo invertido cria gradiente de incentivo para minimizar cintura

Cintura menor aumenta o eixo. Sem teto, a função recompensa monotonicamente a redução — que é literalmente a métrica que um usuário em risco vai otimizar. O eixo precisa de um platô: abaixo de certo ponto, para de subir.

A 2.2 diz que todo piso numérico vem de fonte citada e revisada por profissional habilitado. Eu não tenho essa fonte e não vou inventar. Então proponho implementar o clamp **agora**, com o limiar como linha de configuração marcada `unvalidated`, e o eixo Core/Cintura **desabilitado** enquanto o limiar não for preenchido com fonte. Ver Q4.

### C4 — Travar a pontuação por triagem colide com o direito de acesso da LGPD

A 2.2 manda não entregar pontuação a quem a triagem sinalizar. A LGPD art. 18 dá ao titular direito de acesso aos próprios dados. Se eu implementar o bloqueio como policy de RLS negando `SELECT` em `proportion_ratios`, eu tranco o titular fora dos próprios dados.

Proposta: o bloqueio é de **apresentação e cálculo derivado**, não de acesso. Concretamente — quando a triagem sinaliza: (i) a UI não renderiza hexágono nem razões, (ii) o pipeline não recomputa, (iii) o export de dados do titular continua funcionando e inclui tudo. RLS permanece "dono lê o próprio dado"; o gate vive na aplicação e no pipeline. Se você preferir bloqueio duro em RLS, precisamos de um caminho de export alternativo, e vale conversa com advogado.

### C5 — "Exclusão completa de backups em um toque" não é executável

Supabase mantém PITR/snapshots. Não existe deleção seletiva dentro de um snapshot — ou você restaura o snapshot inteiro, ou ele expira. Nenhum controlador em nenhum provedor consegue prometer isso literalmente.

O que é executável e é o padrão defensável: purga imediata e verificável de produção (linhas + objetos de Storage + derivados + caches), com registro em `deletion_requests`, e expiração das cópias de backup dentro da janela de retenção contratada, informada ao titular no próprio fluxo. Preciso do seu aval no texto e na janela. Ver Q10.

### C6 — Gate 18+ "de fato" exige verificação de identidade, que é um problema maior

Não existe bloqueio real de idade sem verificar documento ou biometria — o que significa coletar documento de identidade, ou seja, mais dado sensível, um operador a mais na cadeia e um DPIA mais pesado. Data de nascimento declarada é uma barreira, não uma verificação.

O meio-termo honesto: data declarada + bloqueio imediato e persistente (marcador no dispositivo e na conta, sem re-tentativa trivial) + `age_gate_passed_at` auditável + copy que não finge ter verificado. Se você quer verificação real, é um fornecedor de KYC e uma decisão de custo/atrito. Ver Q7.

### C7 — Supabase Storage é terceiro; a regra da 2.3 precisa de redação melhor

"Nenhuma foto sai do dispositivo para API de terceiros sem consentimento" não pode ser lida literalmente, senão o próprio upload viola. A distinção correta é entre **operador contratado** (Supabase/AWS, sob contrato, art. 39) e **transferência para análise por terceiro** (uma API de visão computacional, por exemplo). Proponho: `consent_store_at` cobre o armazenamento no operador; `consent_external_processing_at` cobre qualquer saída do perímetro e começa `null` para sempre enquanto não existir feature que precise. Falta decidir região do projeto (art. 33, transferência internacional) — ver Q8.

### C8 — A linha entre medir e prescrever é mais fina do que parece

"Seu eixo de braços está baixo em relação à referência" é fato descritivo. "Priorize braços" é recomendação de exercício. A distância entre as duas frases é uma revisão de copy mal feita. Não vejo isso como bloqueio — a 8.234/1991 e a 9.696/1998 tratam de prescrição individualizada, e exibir medida própria não é prescrição — mas proponho travar como regra de engenharia: nenhum texto gerado a partir de `proportion_ratios` pode conter verbo no imperativo dirigido a treino ou dieta, e isso entra em checklist de PR junto com a proibição de "nota/score/ranking".

### C9 — Menor, mas registra: SCOFF em pt-BR

Aplicar instrumento de triagem e dizer ao usuário que ele tem risco encosta em diagnóstico. A copy tem que ser não-diagnóstica ("estas respostas sugerem que vale conversar com um profissional"), nunca conclusiva. E eu não vou assumir versão nem ponto de corte de uma tradução validada para o português sem você me passar a referência. CVV 188 eu tenho segurança; contatos institucionais mudam e devem viver em tabela de configuração revisada antes do lançamento, não hardcoded. Ver Q6.

---

## 4. Estrutura de diretórios

```
ryven/
├── .github/
│   └── workflows/ci.yml          # typecheck + lint + vitest + pgTAP
├── docs/
│   ├── fase-0-proposta.md        # este arquivo
│   ├── decisoes/                 # ADRs numerados, um por decisão travada
│   └── legal/                    # notas com fonte citada — nunca fonte inventada
├── packages/
│   └── domain/                   # TypeScript puro. Zero import de react-native.
│       ├── src/
│       │   ├── units/            # cm/kg canônico, conversão só na borda
│       │   ├── measurements/     # chaves, validação, normalização
│       │   ├── reference/        # avaliador da cadeia de alvos + detecção de ciclo
│       │   ├── proportion/       # eixos, inversão do core, clamps
│       │   └── index.ts
│       └── test/                 # vitest + fast-check (property-based)
├── apps/
│   └── mobile/                   # Expo — entra na Fase 1, vazio na Fase 0
├── supabase/
│   ├── config.toml
│   ├── migrations/               # versionadas, nunca editadas depois de aplicadas
│   ├── seed/                     # lookups + modelos de referência
│   └── tests/                    # pgTAP
├── .env.example
├── .gitignore                    # .env desde o commit 1
├── package.json                  # npm workspaces
└── tsconfig.base.json            # strict + noUncheckedIndexedAccess
```

Notas:

- **npm workspaces, não pnpm.** Metro + symlinks do pnpm ainda dá atrito; para um dev solo não vale o tempo de debugar bundler.
- **`packages/domain` separado de verdade**, não uma pasta `src/domain` dentro do app. A separação física é o que garante o requisito da seção 8 ("testável sem RN"): o pacote não tem RN nas dependências, então um import errado quebra o build em vez de passar despercebido. Regra de ESLint `no-restricted-imports` reforça.
- **`apps/mobile` vazio na Fase 0** — o brief diz "sem UI ainda". Crio o diretório e o workspace, sem app Expo, para o CI já ter a forma final.
- `tsconfig` com `noUncheckedIndexedAccess` porque a maior parte do domínio é acesso indexado a medidas possivelmente ausentes, e esse flag transforma "eixo indisponível" em erro de compilação em vez de `NaN` em produção.

### Entregáveis concretos da Fase 0, depois do seu aval

1. Scaffolding: workspaces, tsconfig strict, ESLint, Prettier, `.gitignore` com `.env`
2. `packages/domain` com tipos de unidade e vitest + fast-check ligados (sem lógica de proporção — isso é Fase 1)
3. Migrations do schema acima
4. Seed dos lookups e do modelo de referência (**inativo** até Q1/Q2/Q3 resolvidas)
5. RLS em todas as tabelas + suíte pgTAP com os 10 casos da seção 2.5
6. CI verde
7. README com **Implementado** e **Roadmap** em seções separadas, nada de roadmap no presente do indicativo

---

## 5. Perguntas que preciso responder antes de codificar

Marcadas por onde travam.

| # | Pergunta | Trava |
|---|---|---|
| Q1 | Não há coeficiente de referência para o eixo **Ombros/Costas**. Envio o eixo desabilitado (`model_not_applicable`) ou você me passa um coeficiente com fonte? | Fase 0 (seed) |
| Q2 | `source_citation` é obrigatório e eu não vou inventar. Confirma a fonte exata do conjunto Reeves que devo gravar? | Fase 0 (seed) |
| Q3 | O modelo se aplica a quais perfis? Restrinjo a `biological_sex = 'male'` e devolvo `model_not_applicable` para os demais, ou você tem um modelo com fonte para outros perfis? (Ver C2 — impacta se há hexágono para mulheres no lançamento.) | Fase 0 (seed) |
| Q4 | Limiar de platô do eixo Core/Cintura e sua fonte. Sem isso, entrego o eixo desabilitado. (Ver C3.) | Fase 1 |
| Q5 | Denominador do hexágono: baseline próprio, referência externa, ou os dois com baseline como padrão? (Ver C1 — é a decisão mais estruturante das duas primeiras fases.) | Fase 1 |
| Q6 | Versão pt-BR do SCOFF, ponto de corte e fonte. E: persisto as respostas brutas ou só `score` + `outcome`? Minha recomendação é só `score` + `outcome` — menos dado sensível guardado, mesmo resultado funcional. | Fase 0 (schema) |
| Q7 | Gate 18+: aceita data declarada + bloqueio persistente + copy honesta, ou quer verificação por fornecedor de KYC? (Ver C6.) | Fase 3 |
| Q8 | Região do projeto Supabase. Recomendo São Paulo se disponível no seu plano, para simplificar a discussão de transferência internacional. | Fase 0 (infra) |
| Q9 | Na exclusão de conta, mantenho prova anonimizada de consentimento (hash do id, sem dado pessoal) para defesa em eventual questionamento, ou apago tudo? É pergunta jurídica, não técnica. | Fase 0 (schema) |
| Q10 | Aceita a redação do C5 sobre backups — purga imediata em produção + expiração na janela de retenção, informada ao titular? | Fase 3 |

Q1, Q2, Q3, Q6, Q8 e Q9 travam a Fase 0. Q4 e Q5 travam a Fase 1. Q7 e Q10 travam a Fase 3, mas Q10 muda texto de consentimento que já é semeado na Fase 0.

Se preferir, dá para começar o scaffolding (itens 1, 2 e 6 da seção 4) enquanto essas respostas não chegam — nenhum deles depende das perguntas em aberto.
