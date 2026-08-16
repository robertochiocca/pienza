# 0009 — Piso de cobertura em 100, e baixá-lo é decisão datada

Data: 2026-08-16
Situação: aceita

## Contexto

O piso de cobertura de `packages/domain` estava em 95 com cobertura real em 100.

Piso serve para interromper quando algo regride. Um piso cinco pontos abaixo do estado atual não
interrompe ninguém: ele deixa a primeira função sem teste entrar com o build verde, e só avisa
depois que uma parte razoável do domínio já está descoberta. Na prática, 95 com 100 real é não
ter piso.

## Decisão

**Piso em 100 para linhas, ramos, funções e declarações.**

O domínio é lógica pura, sem I/O e sem framework. Não existe aqui a categoria de linha "difícil
de testar" que justifica piso baixo em camada de borda — se uma linha do domínio não tem teste, é
porque ninguém escreveu.

**Baixar o piso é decisão datada e justificada em ADR, nunca ajuste silencioso.** Mesma
disciplina do bloco de dívida declarada: dívida assumida tem data e autor; dívida escondida é uma
linha de configuração que alguém mexeu numa sexta-feira porque estava incomodando.

Se o piso incomodar, as saídas em ordem são: escrever o teste; remover o código morto; ou abrir
ADR dizendo o que ficou sem cobertura, por quê, e qual é a correção de verdade.

## Consequências

Aceito que a Fase 1 traz o cálculo de proporção e que um piso em 100 tende a virar atrito diário.
Esse atrito é o mecanismo funcionando, não um efeito colateral: ele aparece exatamente quando
alguém está prestes a mesclar lógica de domínio sem teste.

O que este número **não** diz, e o README foi corrigido para não sugerir que diz: hoje ele cobre
os módulos de unidade. Ele não fala nada sobre cálculo de proporção, sobre RLS ou sobre as
mecânicas proibidas — essas três são cobertas por outros gates, e a suíte pgTAP e o gate de
mecânicas são os que de fato protegem o produto.

## O que descartei

**Manter em 95 por conforto.** É o estado em que o piso existe no arquivo de configuração e não
existe na prática.

**Piso por arquivo em vez de global.** Adiciona ruído de configuração sem cobrir o caso que
importa, que é o módulo novo entrando inteiro sem teste.
