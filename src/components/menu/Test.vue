<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">测试功能区</h1>
    <div class="bg-gray-600 p-4 rounded shadow space-x-1">
      <h2 class="text-xl font-semibold mb-2">功能测试</h2>
      <button class="btn btn-info" @click="() => captureScreenshot()">
        <span class="button-title">截图</span>
      </button>
      <button class="btn btn-info" @click="openDialog">
        <span class="button-title">打开文件</span>
      </button>
      <button class="btn btn-info" @click="removeImg">
        <span class="button-title">删除图片</span>
      </button>
      <button class="btn btn-info" @click="ps_ocr_pd">
        <span class="button-title">测试paddocr</span>
      </button>
      <button class="btn btn-info" @click="query_database_info">
        <span class="button-title">测试查询</span>
      </button>
      <button class="btn btn-info" @click="logWindowPool">
        <span class="button-title">窗口池</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { captureScreenshot } from '@/windows/screenshot.ts'
import { ref } from "vue";
import { queryAuth } from "@/windows/dbsql"

const image_path = ref("");
const greetMsg = ref("");

async function openDialog() {
  const file: Array<string> | null = await open({
    multiple: true,
    directory: false,
  });
  console.log(file);
  if (!file) return;
  image_path.value = file.join(", ");
  greetMsg.value = await invoke("greet", { image_path: image_path.value });
  await invoke("capture_screen",);
}

async function removeImg() {
  await invoke("delete_temp_file",);
}

async function ps_ocr_pd() {
  // 获取当前 OCR 引擎配置
  const engineResult = await queryAuth(
    'system_config', 
    "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"
  ) as { config_value: string }[];
  
  const engine = engineResult[0]?.config_value || 'RapidOCR';
  
  const result = await invoke(
    engine === 'RapidOCR' ? 'ps_ocr' : 'ps_ocr_pd',
    { image_path: "D:\\CodeProject\\OptCut\\src-tauri\\tools\\img.png" }
  );
  console.log(result);
}

async function query_database_info() {
  const result = await invoke("query_database_info",);
  console.log(result);
}

const logWindowPool = () => {
  const windowPool = queryAuth('windowPool');
  console.log(windowPool);
}
</script> 