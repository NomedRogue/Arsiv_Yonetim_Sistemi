module.exports = (api) => {
  const isTest = api.env('test');
  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: isTest ? 'classic' : 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: isTest ? ['babel-plugin-transform-vite-meta-env'] : [],
  };
};