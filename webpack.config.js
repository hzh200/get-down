const path = require('path')
const nodeExternals = require('webpack-node-externals')
const webpack = require('webpack')

module.exports = {
    target: 'electron-renderer',
    mode: 'none',
    entry: {
        app: './src/renderer/App.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dist', 'renderer'),
        filename: '[name].bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.renderer.json"
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
    devtool: 'source-map',
    // devtool: false,
    // plugins: [new webpack.SourceMapDevToolPlugin({})],
    // externals: [nodeExternals()]
    // externals: ['pg', 'sqlite3', 'tedious', 'pg-hstore', {
    //     'sequelize': require('sequelize'), 
    // }],
}