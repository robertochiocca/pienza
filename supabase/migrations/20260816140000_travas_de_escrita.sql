-- Travas de escrita: quem pode alterar o que, depois que a linha ja existe.
--
-- A RLS responde "de quem e a linha". Ela nao responde "esta coluna pode mudar
-- depois de gravada", e ha colunas aqui que o dominio trata como verdade e que o
-- cliente escreve por PostgREST. Sem privilegio por coluna, a trava de proveniencia
-- e uma tranca numa porta com a janela aberta.

-- ------------------------------------------------------------------ correcao ---
-- As duas funcoes de invalidacao apagam de proportion_ratios, onde `authenticated`
-- so tem SELECT. Como elas rodavam com os privilegios de quem invoca, qualquer
-- UPDATE ou DELETE de medida feito pelo app falhava com "permission denied for
-- table proportion_ratios" — ou seja, corrigir um numero digitado errado era
-- impossivel em producao. A suite nao pegou porque aquelas assercoes rodavam como
-- superusuario, que ignora privilegio.
--
-- SECURITY DEFINER resolve, e traz junto a obrigacao de search_path vazio com
-- referencia qualificada: funcao privilegiada com search_path mutavel deixa quem
-- controla o caminho de busca sequestrar a resolucao de nome dentro dela.
create or replace function public.invalidate_proportion_ratios() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  affected uuid := coalesce(new.checkin_id, old.checkin_id);
begin
  -- O alcance vem do check-in da linha que disparou o gatilho, e a RLS ja confirmou
  -- que aquela linha e de quem esta escrevendo. Definer aqui nao amplia alcance.
  delete from public.proportion_ratios
   where checkin_id = affected
      or baseline_checkin_id = affected;
  return null;
end;
$$;

create or replace function public.invalidate_ratios_on_baseline_change() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  delete from public.proportion_ratios
   where user_id = new.user_id
     and denominator_kind = 'baseline';
  return null;
end;
$$;

revoke execute on function public.invalidate_proportion_ratios() from public;
revoke execute on function public.invalidate_ratios_on_baseline_change() from public;

-- --------------------------------------------------- proveniencia e imutavel ---
-- Corrigir um numero e legitimo. Reescrever como ele entrou, nao: ninguem mede
-- retroativamente. Se `provenance` pudesse virar 'typed' depois, bastaria gravar
-- tudo mantido e promover em seguida, e a regra do baseline cairia por fora sem
-- encostar no gatilho.
--
-- Chave, lado e check-in tambem sao identidade da linha, nao conteudo dela.
revoke update on measurement_values from authenticated;
grant update (value) on measurement_values to authenticated;

-- Fechar o baseline vigente e acao da pessoa. Reapontar um baseline para outro
-- check-in nao e: seria trocar o denominador de toda a serie por UPDATE, sem passar
-- pelo gatilho de insercao.
revoke update on baselines from authenticated;
grant update (effective_to) on baselines to authenticated;

-- ------------------------------------------- verificacao de idade declarada ----
-- O cliente pode afirmar que a pessoa se declarou maior de idade, porque e ele que
-- recebe a declaracao. Ele nao pode afirmar que houve conferencia de documento ou
-- verificacao por provedor: isso e evento de servidor. Sem esta restricao, o
-- registro mais forte do sistema seria escrito por quem esta sendo verificado.
drop policy age_verification_insercao_propria on age_verification_events;

create policy age_verification_insercao_declarada on age_verification_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and method = 'self_declared'
  );

comment on column age_verification_events.method is
  'O cliente so pode inserir self_declared. Metodo mais forte e escrito por rotina '
  'de servidor, porque quem esta sendo verificado nao atesta a propria verificacao.';
