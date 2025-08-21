const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'background/background': './src/background/background.ts',
    'content/content': './src/content/content.ts',
    'popup/popup': './src/popup/popup.ts',
    'options/options': './src/options/options.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      shared: path.resolve(__dirname, '../../shared/src'),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/options/options.html', to: 'options/options.html' },
        { from: '../../wasm/pkg/wasm_bg.wasm', to: 'wasm_bg.wasm' },
        { from: '../../wasm/pkg/wasm.js', to: 'wasm.js' },
        { from: 'src/icons', to: 'icons' },
      ],
    }),
  ],
};
