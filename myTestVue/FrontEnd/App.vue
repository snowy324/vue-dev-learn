<template>
    <div id="app">
        <div>
            显示值：{{ message }}
        </div>
        <div>
            <input type="text" v-model="message" label="更改值">
        </div>
        <div>
            计算属性：{{ computedMsg }}
        </div>
        <div>
            <label for="weather">天气</label>
            <input type="text" v-model="weather" name="weather">
        </div>
        <div>
            please give me some suggestions according to the weather today:
        </div>
        <div>
            <span class="b">suggestions:</span> {{ suggestions }}
        </div>
    </div>
</template>

<script>
    export default {

    }
</script>

<style>
    
</style>