const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    target: 'electron-renderer',
    mode: 'development',
    entry: {
        app: './src/renderer/App.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dev', 'renderer'),
        filename: '[name].bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.json"
                    },
                },
                exclude: /node_modules/
            },
            {
                test: /\.m?js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                },
                exclude: /node_modules/
            },
            {
                test: /\.s?css$/,
                use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
                exclude: /node_modules/
            },
            {
                test: /\.(png|jp(e*)g|svg|gif)$/,
                use: ['file-loader'],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: 'source-map'
};