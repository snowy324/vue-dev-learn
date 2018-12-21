console.log('\n')
console.group("--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--")
console.info("Ready to compile.")
console.info("Working...")


const path = require("path")
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
    mode: 'development',
    entry: __dirname + '/src/main.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, "dist")
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.js$/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin()
    ]
}

console.info("Success to compile!")
console.groupEnd()
console.group("--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--")
console.groupEnd()