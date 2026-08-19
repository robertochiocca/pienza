// Preset do Expo, exigido pelo Metro. Sem arquivo proprio o Metro nao acha o preset e
// falha no primeiro import de JSX.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
