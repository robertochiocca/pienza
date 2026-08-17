-- Baseline parcial, e contexto de medicao.

-- ------------------------------------------------------------ baseline parcial --
-- A regra anterior recusava abrir baseline enquanto qualquer medida variavel
-- estivesse mantida. Ela protegia o denominador, e cobrava por isso a sessao mais
-- longa que o app produz, no momento em que a pessoa esta comecando um ciclo novo.
-- A consequencia de segunda ordem e pior que o problema: se redefinir baseline for
-- caro, ninguem redefine, e a serie inteira passa a ser comparada contra um
-- baseline velho que ja nao descreve aquele corpo.
--
-- A protecao muda de lugar. O baseline abre com o que houver; o que fica proibido e
-- um eixo usar denominador que ninguem digitou.
drop trigger baselines_validate_provenance on baselines;
drop function public.validate_baseline_provenance();

alter table proportion_ratios drop constraint proportion_ratios_status_check;

alter table proportion_ratios
  add constraint proportion_ratios_status_valido
    check (status in ('ok', 'missing_input', 'no_baseline', 'baseline_not_typed'));

comment on column proportion_ratios.status is
  'missing_input: falta medida no check-in atual. no_baseline: ainda nao ha '
  'baseline. baseline_not_typed: o baseline existe, mas a medida deste eixo nunca '
  'foi digitada nele, entao o eixo espera. Em nenhum dos tres o eixo vale zero — '
  'ele fica indisponivel, com motivo, e a tela mostra o motivo.';

alter table proportion_ratios drop constraint proportion_ratios_proveniencia_coerente;

-- O numerador pode ser mantido: significa que a pessoa nao remediu aquele eixo
-- neste check-in, e a razao continua verdadeira sobre o que se sabe. O denominador
-- nao pode: um baseline nao digitado e um numero que ninguem aferiu servindo de
-- referencia para todo o historico.
alter table proportion_ratios
  add constraint proportion_ratios_proveniencia_coerente
    check (
      status <> 'ok'
      or (
        current_provenance is not null
        and reference_provenance = 'typed'
      )
    );

-- ----------------------------------------------------- contexto de medicao -----
-- Se a diferenca entre os lados vai aparecer na tela, o metodo passa a importar
-- mais que antes: erro de afericao supera com facilidade a assimetria real, e boa
-- parte desse erro e hora do dia e estado de treino. Registrar o contexto nao
-- corrige a medida, mas deixa a serie interpretavel depois.
--
-- Tudo opcional, e nada bloqueia o check-in. Contexto ausente e contexto ausente.
alter table checkins
  add column training_state text
    check (training_state in ('before_training', 'after_training', 'not_applicable')),
  -- `taken_at` e timestamptz e perde o deslocamento original, entao "mediu as sete
  -- da manha" nao e recuperavel a partir dele sozinho. Um inteiro devolve a hora
  -- local que a pessoa de fato viveu.
  add column taken_at_utc_offset_minutes integer
    check (taken_at_utc_offset_minutes between -840 and 840);

comment on column checkins.training_state is
  'Contexto opcional. Nao entra em nenhum calculo e nao bloqueia o check-in: '
  'existe para a serie ser interpretavel, nao para corrigir a medida.';
