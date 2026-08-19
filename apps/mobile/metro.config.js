// Metro precisa enxergar os pacotes do monorepo: o codigo de `apps/mobile` importa
// `@pienza/domain` e `@pienza/tokens`, que vivem fora desta pasta, e por padrao o Metro
// so observa a raiz do projeto. Sem os dois ajustes abaixo o bundle quebra no primeiro
// import de dominio, com "Unable to resolve module".
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projeto = __dirname;
const raiz = path.resolve(projeto, '../..');

const config = getDefaultConfig(projeto);
config.watchFolders = [raiz];
// Os dois lugares onde o npm workspaces pode ter posto uma dependencia: a raiz, para o
// que e comum, e a pasta do app, para o que precisou de versao propria.
config.resolver.nodeModulesPaths = [
  path.resolve(projeto, 'node_modules'),
  path.resolve(raiz, 'node_modules'),
];

module.exports = config;
