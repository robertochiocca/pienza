# 0004 — Sem instrumento de triagem clínica

Data: 2026-08-16
Situação: aceita

## Contexto

A ideia original era aplicar um instrumento breve de rastreio no onboarding e, se ele
sinalizasse risco, não entregar hexágono nem plano, encaminhando a pessoa para ajuda.

Desisti por dois motivos. Um gate que bloqueia funcionalidade ensina a pessoa a responder o que
libera — a triagem passa a medir a vontade de usar o app, não o que ela deveria medir. E aplicar
instrumento validado devolvendo uma afirmação de risco, sem clínico nenhum no fluxo, encosta em
diagnóstico. Isso é exposição minha e da pessoa, não proteção.

Some-se que a superfície de dano encolheu com a ADR 0001: sem ideal externo, sem meta calórica,
sem comparação entre usuários e sem eixo invertido, sumiu a maior parte do que um rastreio
estaria ali para conter.

## Decisão

Não há instrumento de triagem. No lugar:

1. **Nenhuma mecânica que premie restrição.** Escrita item a item e com gate na ADR 0002.
2. **Recursos de ajuda visíveis de forma permanente**, não condicionados a resultado de teste.
3. **Sinais de uso podem tornar esses recursos mais visíveis, e disparam efêmeros na leitura.**

O terceiro ponto tem uma restrição que é a parte mais importante desta ADR.

### O sinal nunca é persistido

Se "três redefinições de baseline em duas semanas" virar coluna, flag ou registro derivado, eu
acabei de produzir uma inferência sobre saúde mental. Isso é dado pessoal sensível, gerado sem
consentimento e sem base clínica — fica pior que o problema que resolve. O sinal é calculado na
leitura, muda o que a tela apresenta, e não é escrito em lugar nenhum.

Por isso os sinais são de **uso do app**, e não de valores do corpo: redefinição de baseline
repetida numa janela curta, ou cadência de check-in muito acima da que a própria pessoa definiu.
São limiares de produto, não de saúde. Não precisam de fonte clínica, não produzem escore, não
bloqueiam nada e não afirmam nada sobre ninguém.

### A copy nunca se dirige à pessoa

Nada de "notamos que você...". Dizer isso é afirmar algo sobre alguém a partir de um limiar de
produto. O recurso fica mais visível; ninguém é diagnosticado.

## Consequências

Aceito que não vou detectar quem está em risco. Nunca foi possível: um formulário de cinco
perguntas dentro de um app de medição não detecta, e achar que detecta é o problema. O que está
sob meu controle é não construir as mecânicas que empurram.

Aceito também que "permanente e passivo" corre o risco de virar invisível. É por isso que os
sinais de uso existem — para mudar a proeminência sem virar porta.

Não removi `deletion_requests` nem a possibilidade de exportar. Se o app não serve para alguém,
sair tem que ser fácil e completo.

## O que descartei

**SCOFF com gate.** Motivos acima.

**SCOFF sem gate, só para telemetria.** Pior dos dois mundos: coleta dado sensível e não o usa
para nada que ajude a pessoa.

**Tabela `risk_screenings` no schema "por precaução".** Tabela sem escritor é convite. Se eu
reabrir esta decisão, ela volta com uma migration — que é barato.

## Ponto que fica aberto

A Fase 2 traz foto corporal padronizada, em três ângulos, com histórico. Fotografar o próprio
corpo em cadência fixa para inspecionar mudança é um comportamento por si só, independente de
qualquer pontuação. Tirar o número não tira a câmera. Não acho que isso peça triagem; acho que
pede que os itens 1, 3 e 4 da ADR 0002 sejam respeitados com rigor extra no fluxo de foto, e que
a decisão de cadência seja sempre da pessoa.
