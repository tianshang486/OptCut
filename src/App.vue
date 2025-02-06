<script setup lang="ts">

//@ts-ignore
import {onMounted, onUnmounted} from "vue";

// const handleChangeTheme = () => {
//   const html = document.getElementsByTagName('html')[0]
//   const darkTheme = html.dataset.theme
//
//   if (darkTheme === 'dark') {
//     html.dataset.theme = 'light'
//   } else {
//     html.dataset.theme = 'dark'
//   }
// }
const handleKeyDown = (event: KeyboardEvent) => {
  // 检测是否按下了 Ctrl + R
  if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
    event.preventDefault(); // 阻止默认刷新行为
    console.log('Ctrl + R 刷新已被禁用');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// 禁用默认右键菜单
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

</script>

<template>
<!--  <div class="button-container flex justify-center my-10">-->
<!--    <button class="btn">Button</button>-->
<!--    <button class="btn btn-primary">Button</button>-->
<!--    <button class="btn btn-secondary">Button</button>-->
<!--    <button class="btn btn-accent">Button</button>-->
<!--    <button class="btn btn-ghost">Button</button>-->
<!--    <button class="btn btn-link">Button</button>-->
<!--  </div>-->


<!--  <div class="container">-->
  <router-view></router-view>
<!--    </div>-->
  <!--  <main class="container">-->
  <!--    <h1>Welcome to Tauri + Vue</h1>-->

  <!--    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>-->

  <!--    <form class="row" @submit.prevent="greet">-->
  <!--      <input id="greet-input" v-model="name" placeholder="Enter a name..."/>-->
  <!--      <button type="submit">Greet</button>-->

  <!--    </form>-->
  <!--    <p>{{ greetMsg }}</p>-->
  <!--  </main>-->

</template>
<style scoped></style>
