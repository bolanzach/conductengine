const path = require('path');

module.exports = {
  entry: './src/client/main.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.client.json'
          }
        },
        exclude: /node_modules/,
      },
      {
        // Embed WGSL files as strings
        test: /\.wgsl$/i,
        type: "asset/source",
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist/src/server/static'),
  },
};