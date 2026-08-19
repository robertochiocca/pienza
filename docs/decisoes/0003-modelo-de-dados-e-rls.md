# 0003 — Modelo de dados e RLS da Fase 0

Data: 2026-08-16
Situação: aceita

## Contexto

Medidas corporais e fotos do corpo são dado pessoal sensível. O projeto tem usuários,
autenticação e um provedor gerenciado no meio. Isso muda o que "schema bom" significa: a
propriedade que mais importa não é normalização, é que o banco negue por conta própria o que a
aplicação não deveria permitir.

## Decisão

### O check-in é a raiz

Medidas e fotos são carga do check-in. O esboço anterior tinha data de aferição em duas tabelas
ao mesmo tempo e uma chave estrangeira livre para discordar das duas — duas respostas possíveis
para "quando isso foi medido".

### Medidas em formato longo

`measurement_values(checkin_id, key, side, value)` em vez de uma coluna por medida. Três motivos:
uma medida nova é linha de seed e não migration, medida ausente é linha ausente (que é
exatamente a semântica de eixo indisponível), e lado esquerdo/direito sai de graça. Já incluí
`head` e `knee`, que nada usa hoje e que o sistema de Reeves vai exigir na Fase 3.

O custo é que não dá para ter `CHECK` por medida na coluna. Resolvi com trigger contra
`measurement_keys.min_value/max_value`. **Essas faixas são guarda de digitação, não limiar de
saúde** — existem para barrar 1700 cm de cintura por dedo escorregado. Nenhuma tem significado
clínico e nenhuma aparece na interface.

### `user_id` denormalizado com chave estrangeira composta

Toda tabela filha carrega `user_id`, e a chave estrangeira é composta contra
`checkins(id, user_id)`, que ganhou um `unique` só para ser esse alvo. Assim uma linha filha não
consegue apontar para um check-in de outro dono, e isso é garantia do banco em vez de trigger ou
de disciplina de aplicação. De quebra, nenhuma policy precisa de `JOIN` para decidir acesso.

### Consentimento é livro-razão

`consent_documents` versiona o texto; `consent_events` é append-only. Um jsonb de flags responde
"está consentido?" e não responde "desde quando" nem "qual texto a pessoa aceitou" — e a segunda
é a que importa, porque o ônus da prova é de quem controla o dado. Revogar é inserir linha.
As tabelas não têm policy de `UPDATE` nem de `DELETE`: a negativa vem da ausência.

Fotos carregam três carimbos separados — guardar, processar fora do perímetro, compartilhar —
porque são três decisões e o consentimento de uma não vale para as outras.
`consent_external_processing_at` nasce nulo e nada hoje o preenche.

### Razões de proporção são derivadas e o cliente não escreve nelas

`proportion_ratios` tem grant apenas de `SELECT`. Dado derivado que o cliente pode escrever
deixa de ser derivado. Dois `CHECK` fecham as incoerências: eixo `ok` sem razão é rejeitado, e
`denominator_kind = 'baseline'` obriga a registrar qual check-in serviu de denominador. Gatilhos
apagam o derivado quando a medida muda — inclusive nos check-ins que usaram aquele como
baseline, senão editar uma medida do baseline deixaria toda a série posterior calculada contra
um denominador que não existe mais.

**A leitura fica aberta ao titular mesmo quando a interface decide não exibir o hexágono.**
Bloquear no `SELECT` trancaria a pessoa fora do próprio dado e quebraria acesso e exportação. O
que a interface esconde é apresentação; o que o titular pode obter é outra coisa.

### O gate legal do plano é restrição de banco

`plans` rejeita `status = 'delivered'` sem profissional, data de revisão, assinatura,
periodização e evento de consentimento. Prescrição de dieta e de exercício são privativas de
profissional registrado; deixar essa fronteira como convenção de código significa que um bug de
fluxo entrega plano não assinado.

`plans` e `professionals` existem antes da funcionalidade de propósito. Cortei as três tabelas
de modelo de referência porque elas **habilitam** algo que foi para a Fase 3 — peso morto até
lá. Esta restrição é uma **trava**: o valor dela é justamente existir antes, para que a
funcionalidade não possa nascer errada.

### RLS

- `ENABLE` e `FORCE` em todas as tabelas. Sem `FORCE`, o dono da tabela ignora a policy e um
  teste rodando com o papel errado passa em verde mentindo
- `REVOKE` explícito de `anon` e `authenticated`, `GRANT` só do que a tabela precisa. São duas
  camadas: um grant acidental deixaria a policy como única defesa
- Uma policy por operação. `WITH CHECK` em todo `UPDATE` — é o que impede reatribuir a própria
  linha para outro dono, e policy escrita só com `USING` não pega isso
- `(select auth.uid())` e não `auth.uid()`, para o planejador avaliar uma vez por consulta em
  vez de uma vez por linha
- Storage: bucket privado, caminho `{user_id}/{checkin_id}/{ângulo}-{uuid}.jpg`, policy pela
  primeira pasta do caminho, e um `CHECK` em `photos.storage_path` amarrando a linha ao mesmo
  prefixo. Sem esse `CHECK` as duas camadas podem discordar em silêncio

## Consequências

A suíte pgTAP roda contra um Postgres cru mais um shim de `auth` e `storage`, não contra a CLI
do Supabase em Docker. Perco fidelidade de ambiente e ganho uma suíte que roda em segundos, que
é a diferença entre ela rodar em todo commit e rodar quando alguém lembra. O risco assumido é
o shim divergir do Supabase real; ele existe só para reproduzir a superfície de que as
migrations dependem, e está anotado nesse sentido.

Escrever a suíte já pagou: o `CHECK` de intervalo do baseline estava com `>` e reprovava fechar
um baseline na mesma transação em que ele foi aberto, porque `now()` é o instante da transação.
Viraria bug em produção na primeira redefinição feita no mesmo commit.

## O que descartei

**Colapsar `profiles` e `auth.users`.** Preciso de campos meus e não vou mexer na tabela do
provedor. A chave primária de `profiles` é o próprio id de `auth.users`, o que elimina a coluna
`user_id` redundante.

**Guardar direção do eixo no banco.** Ver ADR 0001.

**`risk_screenings`.** Ver ADR 0004.
