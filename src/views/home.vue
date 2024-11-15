<script setup lang="ts">
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {Windows,} from '@/windows/create'
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


interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  window_x: number;
  window_y: number;
}

async function captureScreenshot() {
  try {
    const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_one'));
    if (!result?.path) {
      console.error('截图失败：未获取到有效结果');
      return;
    }

    const imgUrl = convertFileSrc(result.path);
    const win = new Windows();
    const url = `/#/screenshot?path=${imgUrl}`;

    const windowOptions = {
      label: 'screenshot',
      title: 'screenshot',
      url: url,
      width: result.width,
      height: result.height,
      x: result.window_x,
      y: result.window_y,
    };

    await win.createWin(windowOptions, result.path);
  } catch (error) {
    console.error('截图过程发生错误:', error);
  }
}
</script>

<template>
  <button @click="captureScreenshot">Capture Screenshot</button>
  <button type="button" @click="openDialog">Open Dialog</button>
  <img v-if="imgurl" :src="imgurl" class="fixed top-0 left-0 w-full select-none" alt=""/>
</template>

<style scoped>

</style>