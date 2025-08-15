const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'service-worker': './src/background/service-worker.ts',
    'content': './src/content/content.ts',
    'popup': './src/popup/popup.ts',
    'options': './src/options/options.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      fs: false,
      path: false,
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  mode: 'production',
  optimization: {
    minimize: false, // Keep readable for debugging
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/options/options.html', to: 'options.html' },
        // Copy WASM files for dynamic import
        { from: '../../wasm/pkg/wasm_bg.wasm', to: 'wasm_bg.wasm' },
        { from: '../../wasm/pkg/wasm.js', to: 'wasm.js' },
      ],
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
