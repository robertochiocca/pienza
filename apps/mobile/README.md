# apps/mobile

**Ainda não é um aplicativo.** Este diretório contém, por ora, apenas a identidade do app.

`app.json` existe antes do código por um motivo com prazo: o identificador de bundle
(`com.robertochiocca.pienza`) é imutável depois da primeira publicação nas lojas. Fixá-lo agora
custa uma linha; trocá-lo depois custa um app novo com os usuários no antigo. Ver
`docs/decisoes/0006-nome-pienza.md`.

As dependências do Expo entram junto com as primeiras telas, e não antes: instalar a árvore
inteira agora só adicionaria superfície de auditoria de dependência sem nada para executar.

O que vem aqui primeiro é a entrada de medidas em sequência guiada — uma medida por tela, na
ordem do caminho físico da fita pelo corpo. A lógica que decide a ordem, o que vem
pré-preenchido e como cada valor é carimbado vive em `packages/domain/src/session`, fora do
React Native e testável sem app.
