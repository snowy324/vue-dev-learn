const fs = require("fs")
const path = require("path")

console.group("--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--")
console.info("Ready to copy Vue.js.")
fs.copyFile("./dist/vue.js", "./myTestVue/FrontEnd/src/vue.js", err => {

    console.info("Working...")
    if (err) {
        console.error('Failed to copy Vue.js!')
        throw err
    }
    console.info("Success to copy Vue.js to destination.")
    console.groupEnd()
    console.group("--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--*--")
    console.groupEnd()
})