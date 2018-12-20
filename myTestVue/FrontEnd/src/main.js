console.log(Vue)
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

new Vue({
  render: h => h(App),
}).$mount('#app')