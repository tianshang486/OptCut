<script setup lang="ts">
import {ref} from "vue";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';

const greetMsg = ref("");
const image_path = ref("");
const name = ref("");

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", {image_path: image_path.value});
}


// Open a dialog
async function openDialog() {
  const file: Array<string> | null = await open({
    multiple: true,
    directory: false,
  });
  console.log(file);
  if (!file) return;
  image_path.value = file.join(", ");
  greetMsg.value = await invoke("greet", {image_path: image_path.value});
  await invoke("capture_screen",);
}

// @ts-ignore
import {Windows, windowConfig} from './windows/create'
import {window} from "@tauri-apps/api";

const imgurl = ref('');
const isMoved = ref(false);
const isDown = ref(false);
const mouseDownX = ref(0);
const mouseDownY = ref(0);
const mouseMoveX = ref(0);
const mouseMoveY = ref(0);

const screenshotAreaStyle = ref({});

async function captureScreenshot() {
  const position = {x: 66, y: 66}
  // await invoke('capture_screen', {x: position.x, y: position.y});
//   创建窗口
  console.log(windowConfig)
  const window = new Windows();
  await window.createWin();

}


</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue</h1>

    <div class="row">
      <a href="https://vitejs.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo"/>
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo"/>
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo"/>
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..."/>
      <button type="submit">Greet</button>
      <button type="button" @click="openDialog">Open Dialog</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main>
  <button @click="captureScreenshot">Capture Screenshot</button>
  <img v-if="imgurl" :src="imgurl" class="fixed top-0 left-0 w-full select-none" alt=""/>
  <div
      v-if="isMoved"
      class="fixed bg-[#2080f020] border border-solid border-sky-500"
      :style="screenshotAreaStyle"
  />
  <div
      class="fixed top-0 left-0 bottom-0 right-0 cursor-crosshair select-none"
  />
</template>

<style scoped>
.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}

</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: 0.75s;
}

.logo.tauri:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}

button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }

  button:active {
    background-color: #0f0f0f69;
  }
}

</style>