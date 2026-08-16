-- Proveniencia de medida e classificacao estrutural/variavel.
-- Ver docs/decisoes/0007-proveniencia-de-medida.md.

-- Nem toda medida muda. Punho, tornozelo, joelho, cabeca, altura e envergadura
-- ancoram os modelos de proporcao justamente por nao mudarem, e remedi-las toda
-- semana e atrito com ganho de informacao zero. A classificacao fica em tabela e nao
-- em constante de codigo porque classificar uma medida e decisao de dominio e vai
-- ser revista.
alter table measurement_keys
  add column kind text not null default 'variable'
    check (kind in ('structural', 'variable'));

-- O default existe apenas para esta migration nao falhar sobre as linhas ja
-- semeadas; a classificacao real vem logo abaixo. Depois disso ele sai, para que uma
-- chave nova exija classificacao explicita em vez de herdar um palpite.
update measurement_keys set kind = 'structural'
 where key in ('height', 'wingspan', 'head', 'wrist', 'knee', 'ankle');

alter table measurement_keys alter column kind drop default;

-- Toda medida carrega como entrou: `typed` quando a pessoa digitou naquele check-in,
-- `kept` quando veio do check-in anterior sem ser remedida.
--
-- Sem esta coluna, o pre-preenchimento produz um valor indistinguivel de medicao
-- real, e a serie passa a descrever o habito de tocar em "proximo" em vez do corpo.
-- Deduzir comparando com o valor anterior nao resolve: "mediu e deu igual" e "nao
-- mediu" produzem o mesmo numero e sao fatos diferentes.
--
-- Sem default de proposito: quem escreve tem que dizer como o valor entrou, e um
-- insert que esqueca falha em vez de gravar uma suposicao.
alter table measurement_values
  add column provenance text not null
    check (provenance in ('typed', 'kept'));

create index measurement_values_provenance_idx
  on measurement_values (checkin_id) where provenance = 'kept';

-- Um baseline contaminado desloca os seis eixos para sempre, e nao ha como saber
-- depois que ele era ruim. E o unico ponto do sistema onde a contaminacao e
-- irreversivel, entao a regra e trava de banco e nao convencao de aplicacao.
--
-- Medida estrutural mantida nao conta: la `kept` e o comportamento correto.
create function public.validate_baseline_provenance() returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  pendentes text[];
begin
  select array_agg(distinct mv.key order by mv.key) into pendentes
    from public.measurement_values mv
    join public.measurement_keys mk on mk.key = mv.key
   where mv.checkin_id = new.checkin_id
     and mk.kind = 'variable'
     and mv.provenance = 'kept';

  if pendentes is not null then
    -- Erro que nao diz o que fazer vira suporte: a mensagem nomeia o que falta.
    raise exception
      'baseline exige medida digitada; foram mantidas do check-in anterior: %',
      array_to_string(pendentes, ', ')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger baselines_validate_provenance
  before insert on baselines
  for each row execute function public.validate_baseline_provenance();

-- A razao anota a proveniencia das duas pontas, como ja anota os lados do corpo em
-- `inputs`. Um eixo cujo numerador ou denominador foi mantido nao e o mesmo objeto
-- que um eixo medido nas duas pontas, e a diferenca precisa ser consultavel — em
-- coluna com restricao, e nao so inferivel a partir de um jsonb de diagnostico.
alter table proportion_ratios
  add column current_provenance text
    check (current_provenance in ('typed', 'kept')),
  add column reference_provenance text
    check (reference_provenance in ('typed', 'kept'));

alter table proportion_ratios
  add constraint proportion_ratios_proveniencia_coerente
    check (
      status <> 'ok'
      or (current_provenance is not null and reference_provenance is not null)
    );

comment on column proportion_ratios.current_provenance is
  'Como entrou a medida do check-in atual. Eixo com status ok obriga as duas pontas.';
