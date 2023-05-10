const path = require('path')
const nodeExternals = require('webpack-node-externals')

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
                use: 'ts-loader',
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
                use: ['style-loader', 'css-loader'],
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
    // externals: ['pg', 'sqlite3', 'tedious', 'pg-hstore', {
    //     'sequelize': require('sequelize'), 
    // }],
    externals: [nodeExternals()]
}