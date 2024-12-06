<script setup lang="ts">
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {captureScreenshot} from '@/windows/screenshot.ts'
import {tray_close} from '@/windows/tray.ts'
import {ref} from "vue";
import {queryAuth } from "@/windows/dbsql"

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

const imgurl: any = ref('');

// 删除临时图片
async function removeImg() {
  await invoke("delete_temp_file",);
}

// 弹窗提升配置文件
async function read_conf_file() {
  try {
    const result = await invoke('read_config');
    console.log('Config result:', result);
  } catch (error) {
    console.error('Error reading config:', error);
  }
}

// 查看窗口池
const logWindowPool = () => {
  const windowPool =   queryAuth('windowPool');
  console.log(windowPool);
}

</script>

<template>
  <button @click="() => captureScreenshot()">Capture Screenshot</button>
  <button type="button" @click="openDialog">Open Dialog</button>
  <button type="button" @click="removeImg">Remove Img</button>
  <button type="button" @click="() => tray_close()">Close Tray</button>
  <button type="button" @click="() => read_conf_file()">test Config</button>
  <button type="button" @click="logWindowPool">查看窗口池</button>
  <img v-if="imgurl" :src="imgurl" class="fixed top-0 left-0 w-full select-none" alt=""/>
</template>

<style scoped>

</style>