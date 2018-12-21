Vue.mixin({
    data () {
        return {
            mixInInfo: "this is mixin info"
        }
    },
    created () {
        console.log("call hook " + " created " + "in mixin")
    }
})


import App from './App.vue'

new Vue({
  render: h => h(App),
}).$mount('#app')