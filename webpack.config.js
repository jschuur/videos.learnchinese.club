const slsw = require('serverless-webpack');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');

module.exports = {
  target: 'node',
  entry: slsw.lib.entries,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  node: false,
  optimization: {
    minimize: slsw.lib.webpack.isLocal ? false : true
  },
  devtool: 'inline-cheap-module-source-map',
  stats: {
    warningsFilter: ['mongodb-client-encryption', 'saslprep'],
    modules: false,
    entrypoints: false,
    colors: true
  },
  plugins: [new ContextReplacementPlugin(/.*/)],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { node: '12' }, useBuiltIns: 'usage', corejs: 3 }]
              ]
            }
          }
        ]
      }
    ]
  }
};
