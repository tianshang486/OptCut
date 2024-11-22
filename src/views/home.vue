<script setup lang="ts">
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {captureScreenshot} from '@/windows/screenshot.ts'
import {ref} from "vue";

const image_path = ref("");

const greetMsg = ref("");


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

const imgurl = ref('');

// 删除临时图片
async function removeImg() {
  await invoke("delete_temp_file",);
}

</script>

<template>
  <button @click="captureScreenshot">Capture Screenshot</button>
  <button type="button" @click="openDialog">Open Dialog</button>
  <button type="button" @click="removeImg">Remove Img</button>
  <img v-if="imgurl" :src="imgurl" class="fixed top-0 left-0 w-full select-none" alt=""/>
</template>

<style scoped>

</style>