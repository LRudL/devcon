/**
 * Webpack Configuration
 * 
 * Goal: Maintain src/ directory structure in dist/ output
 * Why: This preserves relative paths between HTML and JS files, making it easier to:
 * 1. Maintain consistent file references across the extension
 * 2. Debug issues by having a clear mapping between source and output
 * 3. Update HTML file references without changing build configuration
 * 
 * Implementation:
 * - Uses glob to find all .ts and .html files in src/
 * - Maintains directory structure when copying files to dist/
 * - Outputs compiled .js files to same relative paths as source .ts files
 */

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const glob = require('glob');

/**
 * Creates webpack entry points for all TypeScript files
 * Maintains the directory structure by using the full path after 'src/'
 * Example: src/popup/popup.ts -> popup/popup.js
 */
const getEntries = () => {
    const entries = {};
    glob.sync('src/*/*.{ts,tsx}').forEach(file => {
        // Remove 'src/' and '.ts' or '.tsx' to create the output path
        const entryName = file.replace('src/', '').replace(/\.tsx?$/, '');
        // Use relative path for the entry
        entries[entryName] = './' + file;
    });
    return entries;
};

/**
 * Finds all HTML files in src/ directory
 * Creates copy configurations that preserve directory structure
 */
const getHtmlFiles = () => {
    return glob.sync('src/*/*.html').map(file => ({
        from: file,
        to: file.replace('src/', '')
    }));
};

/**
 * Finds all CSS files in src/ directory
 * Creates copy configurations that preserve directory structure
 */
const getCssFiles = () => {
    return glob.sync('src/*/*.css').map(file => ({
        from: file,
        to: file.replace('src/', '')
    }));
};

module.exports = {
    entry: getEntries(),
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: "manifest.json" },
                ...getHtmlFiles(),
                ...getCssFiles(),
                { from: "public", to: "public" }
            ],
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    devtool: 'cheap-module-source-map',
    mode: 'development'
};