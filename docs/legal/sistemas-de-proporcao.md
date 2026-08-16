# Sistemas de proporção — nota de fonte

Status: **não implementado**. O modo de referência externa foi movido para a Fase 3, opt-in e
desligado por padrão. Este arquivo existe para que a correção abaixo não se perca até lá.

## Correção registrada

A seção 5 do brief original atribuía a Steve Reeves um conjunto de coeficientes que é de **John
McCallum**. São dois sistemas distintos, com estruturas de dependência diferentes. Nenhum dos
dois pode ser gravado sob o nome do outro.

### Cadeia de John McCallum

Deriva tudo do peito, e o peito do punho.

| Alvo    | Base  | Coeficiente |
| ------- | ----- | ----------- |
| peito   | punho | 6,5         |
| quadril | peito | 0,85        |
| cintura | peito | 0,70        |
| coxa    | peito | 0,53        |

### Sistema de Steve Reeves

Ancora cada segmento em um osso ou segmento distinto; o tronco sai do quadril.

| Alvo        | Base      | Coeficiente |
| ----------- | --------- | ----------- |
| braço       | punho     | 2,52        |
| panturrilha | tornozelo | 1,92        |
| pescoço     | cabeça    | 0,79        |
| peito       | quadril   | 1,48        |
| cintura     | quadril   | 0,86        |
| coxa        | joelho    | 1,75        |

Fonte declarada pelo autor do projeto: Steve Reeves com John Little, _Building the Classic
Physique: The Natural Way_, 1995. A citação exata precisa ser conferida contra o exemplar antes
de ir para `source_citation`.

## Limitações que precisam viajar junto com os dados

Nenhum dos dois sistemas é clínico ou antropométrico. São padrões estéticos masculinos de meados
do século XX, derivados em boa parte das medidas de competição de um único homem. Consequências
para o schema, quando o modo de referência for construído:

1. O registro do modelo carrega `evidence_grade` além da citação, com `'anecdotal'` para ambos.
   Um schema que não distingue uma referência da OMS de um livro de fisiculturismo de 1995 está
   mentindo por omissão.
2. `applies_to` explícito. Aplicar qualquer um dos dois a um corpo feminino produz desequilíbrio
   por construção. Sem modelo aplicável, o eixo retorna `model_not_applicable` e a UI diz isso,
   em vez de calcular calado com o modelo errado.
3. Nenhum dos dois cobre **circunferência de ombros**. O eixo Ombros/Costas fica fora do modo de
   referência até existir fonte. No modo baseline não há problema: o denominador é a medida
   anterior do próprio usuário.
4. O sistema Reeves exige **circunferência de cabeça e de joelho**. As chaves `head` e `knee`
   entram no vocabulário de medidas já na Fase 0 — custa uma linha de seed e evita migração.
5. Qualquer limiar de segurança usado junto com o modo de referência precisa de assinatura de
   profissional habilitado. Não de citação encontrada na web.
