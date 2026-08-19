# 0012 — Proteção de branch é o gate que faltava, e ele não é meu

Data: 2026-08-18
Situação: aceita

## Contexto

No ciclo 5 eu empurrei um commit depois de o gate de banco reportar vermelho. Encadeei
verificação e push no mesmo comando com `;` em vez de `&&`, então o push aconteceu independente
do resultado. O vermelho era falso — o cluster local tinha parado e a suíte estava verde — mas
isso é sorte, não processo.

Escrevi na hora que a correção era minha e não tinha gate: "verificação e push não vão mais no
mesmo comando." Isso é uma promessa sobre como eu vou digitar, e promessa sobre digitação é
exatamente a categoria de controle que este repositório recusa em todo lugar. O `AGENTS.md` diz
que gate reprova o build; ele não diz que gate é uma intenção de quem digita.

O repositório inteiro é construído sobre a ideia de que o mecanismo tem que ser estrutural: o
gate de cores existe porque lembrar de não escrever `#DA291C` não funciona; o diretório de
fixtures existe porque trocar a string resolve uma vez e a exclusão mútua resolve a classe. Um
push direto para `main` que ninguém verificou é o mesmo problema, e ele estava sem mecanismo.

## Decisão

**`main` é protegida no GitHub, e todo merge passa por pull request com os checks obrigatórios
verdes.**

Configuração:

- Pull request obrigatória para `main`; push direto bloqueado, inclusive para o dono do
  repositório.
- Checks obrigatórios: `formato, lint, tipos, testes, gates`, `varredura de segredo no
  histórico`, `migrations e RLS`, e `migrations contra a pilha real do Supabase`.
- Branch tem que estar atualizada com `main` antes do merge — senão dois PRs verdes isoladamente
  produzem um `main` vermelho, que é o modo clássico de o CI dizer verde sobre um estado que
  nunca existiu.
- Force push e deleção de `main` bloqueados.
- A regra vale para administradores. Uma proteção que o dono contorna sozinho protege contra
  terceiros, e não há terceiros aqui: o único que empurra sou eu, e fui eu que empurrei em cima
  do vermelho.

**Esta é a primeira decisão deste repositório cuja aplicação não é minha.** Ela mora no console
do GitHub, não no `git`, e por isso não há como eu verificá-la de dentro do repositório nem
escrever teste para ela. O que cabe a mim é isto aqui e a linha correspondente no `AGENTS.md`;
ligar a chave é ação de console.

Enquanto ela não estiver ligada, o registro honesto é que este gate não existe.

## Consequências

Ciclo mais lento: cada entrega passa a exigir branch, PR e espera de CI, e a espera inclui o job
contra a pilha real do Supabase, que leva minutos em vez de segundos. Aceito. O custo é pago
todo ciclo; o benefício aparece na vez em que eu estiver errado, e essa vez já aconteceu uma vez
em cinco ciclos.

O job `migrations contra a pilha real do Supabase` nunca foi executado — não há Docker no
ambiente onde ele foi escrito. Torná-lo obrigatório significa que a primeira PR para `main` vai
ser também a primeira execução dele, e ele pode reprovar por causa dele mesmo e não do código.
Isso é o esperado e é o motivo de ele existir; o que não pode acontecer é ele ser removido da
lista de obrigatórios na primeira vez que incomodar.

## O que descartei

**Um hook de `pre-push` local.** É o mesmo controle na mesma máquina de quem está errando, e
`--no-verify` o desliga. Ele reduz o acidente e não fecha a classe; o acidente do ciclo 5 foi de
construção de comando e um hook o teria pego, mas o próximo pode ser um hook desinstalado numa
máquina nova.

**Confiar no `npm run check` antes do push.** É a promessa que já falhou. A distância entre
"rodei o check" e "o check passou" é uma linha de shell, e foi exatamente essa linha.

**Proteger com bypass para administrador.** Deixaria a regra ligada e inaplicável a única pessoa
que empurra.
