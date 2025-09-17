const path = require('path');

module.exports = {
    entry: './src/index.browser.ts', // Use your entry point here
    output: {
        filename: 'flowquery.min.js', // The output file for the browser
        path: path.resolve(__dirname, 'dist'),
        library: 'FlowQuery', // Expose your module as a global variable
        libraryTarget: 'umd', // Ensure compatibility with various module systems
        libraryExport: 'default', // Export only the default export
    },
    resolve: {
        extensions: ['.ts', '.js'],
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
    mode: 'production', // Use 'development' for unminified output
    target: 'web', // Ensure the build is targeted for browsers
};