const path = require('path');

module.exports = {
    extends: path.resolve(__dirname, './webpack.config.js'),
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'app', 'renderer'),
        filename: '[name].bundle.js',
    },
};