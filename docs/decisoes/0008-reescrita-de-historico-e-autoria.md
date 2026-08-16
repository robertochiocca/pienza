# 0008 — Verificação de autoria é sobre identidade, não sobre mensagem

Data: 2026-08-16
Situação: aceita

## Contexto

O repositório carregava atribuição de autoria indevida. Eu descrevi o problema como "trailers de
coautoria nas mensagens de commit" e escrevi uma sequência de limpeza que removia essas linhas e
depois contava quantas sobraram, esperando zero.

A sequência funcionou e a contagem deu zero. **E o problema continuava lá.** Autor e committer
dos sete commits seguiam registrados em outra conta, com atribuição visível em cada página de
commit e no gráfico de contribuidores do repositório — que é justamente o primeiro lugar onde
alguém olha.

Trailer é texto dentro da mensagem. Autoria é metadado do objeto de commit. São coisas
diferentes, e só a segunda alimenta a atribuição no GitHub.

## Decisão

**A verificação de autoria é sobre identidade, e não sobre linha de mensagem.**

Comando de verificação, que é o que vale:

```bash
git log --format='%an <%ae> | %cn <%ce>' --all | sort -u
```

O resultado precisa conter apenas identidades minhas. Contar `Co-Authored-By:` é verificação
complementar, nunca a principal — ela dá zero num repositório inteiro atribuído a terceiro.

Além disso: `git config user.name` e `git config user.email` no repositório local precisam ser
os meus antes do primeiro commit de qualquer ambiente novo. Corrigir na origem é mais barato que
reescrever depois, e reescrever tem o custo descrito abaixo.

## `git fetch origin` é obrigatório entre a purga e o push

Esta é a parte que ninguém redescobre sozinho.

`git filter-branch -- --all` reescreve **também** `refs/remotes/origin/*`. E
`--force-with-lease`, sem argumento, compara o estado do remoto contra o ref de rastreamento
local. Depois da reescrita, esse ref não é mais uma leitura do servidor: é um valor fabricado
pela própria reescrita.

O resultado é que a lease deixa de proteger. Ou o push é rejeitado por comparar contra um valor
que o servidor nunca teve, ou — pior — passa a sensação de proteção sem proteger, porque a
comparação é contra algo que a operação inventou.

A correção é uma linha, entre a purga de `refs/original` e o push:

```bash
git fetch origin
```

Isso restaura os refs de rastreamento aos valores verdadeiros do servidor, e a lease volta a
comparar o que ela deveria comparar. Verifiquei o efeito: antes do `fetch`, `origin/main`
apontava para o SHA reescrito; depois, para o SHA real que estava no servidor.

## Sequência completa, quando houver motivo

```bash
git status --porcelain                    # tem que sair vazio
git remote -v                             # confirme o repositorio
# confirme que nao ha PR aberto e nem colaborador

git log --format='%an <%ae> | %cn <%ce>' --all | sort -u   # o que existe hoje

FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --env-filter '<reescreve identidade quando o e-mail for de terceiro>' \
  --msg-filter 'sed -E "/^(Co-Authored-By|Claude-Session):/d"' \
  -- --all

git for-each-ref --format='%(refname)' refs/original | xargs -n1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now

git fetch origin                          # obrigatorio, ver acima

git push --force-with-lease --all
git push --force-with-lease --tags
```

Notas que custaram tempo:

- **`sed`, não `grep -v`.** `grep -v` sai com status 1 quando não emite nenhuma linha. Um commit
  cuja mensagem fosse só trailers abortaria o `filter-branch` no meio.
- **`-- --all`, não `A..B`.** A notação `A..B` exclui o próprio `A`, e um trailer no commit raiz
  sobreviveria à limpeza inteira.
- **A contagem intermediária engana.** Enquanto `refs/original` existir, `git log --all` inclui os
  backups e a contagem acusa os trailers antigos. Ela só é confiável depois da purga.
- **`--env-filter` condicionado ao e-mail de origem**, para o commit raiz — que já era meu —
  ficar intacto.

## Limites que aceito

`--force-with-lease` reescreve a branch no remoto, mas o GitHub retém objetos inalcançáveis, e
eles seguem acessíveis por SHA direto por um tempo. Para repositório de uma pessoa, sem fork e
sem ninguém guardando SHA antigo, é acadêmico. Mas não é "sumiu", e não vou escrever que é.

## Reescrita é operação única

Não se repete a cada ciclo. O custo cresce com o tamanho do histórico e cada passada carrega o
risco descrito acima. Motivo cosmético não paga: os três commits anteriores à adoção do padrão de
mensagem seguem com prefixo de conventional commit, fora do meu estilo, e ficam assim. Renomeação
de projeto também não é motivo (ADR 0006).

O que paga é atribuição indevida, que é um erro sobre quem responde pelo repositório.
