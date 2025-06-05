<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">测试功能区</h1>
    <div class="bg-gray-600 p-4 rounded shadow space-x-2 space-y-2">
      <h2 class="text-xl font-semibold mb-2">功能测试</h2>
      <button class="btn btn-info" @click="() => captureScreenshot()">
        <span class="button-title">截图测试</span>
      </button>
      <button class="btn btn-info" @click="openDialog">
        <span class="button-title">打开文件</span>
      </button>
      <button class="btn btn-info" @click="removeImg">
        <span class="button-title">删除图片</span>
      </button>
      <button class="btn btn-info" @click="ps_ocr_pd">
        <span class="button-title">测试ocr</span>
      </button>
      <button class="btn btn-info" @click="query_database_info">
        <span class="button-title">测试查询</span>
      </button>
      <button class="btn btn-info" @click="logWindowPool">
        <span class="button-title">窗口池</span>
      </button>
      <button class="btn btn-info" @click="get_selected_text">
        <span class="button-title">文本选中识别</span>
      </button>
    </div>

    <!-- 添加倒计时提示 -->
    <div v-if="countdown > 0" 
         class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg
                flex items-center space-x-2 text-lg font-medium
                animate-fade-in-out">
      <span>请在 {{ countdown }} 秒内选中文本</span>
      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { captureScreenshot } from '@/utils/screenshot.ts'
import { ref, onUnmounted } from "vue";
import { queryAuth } from "@/utils/dbsql"

const image_path = ref<string>("");

// 添加倒计时状态
const countdown = ref(0);
let countdownTimer: number | null = null;

async function openDialog() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{
      name: 'Images',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
    }]
  }) as string | null;
  
  if (!file) return;
  
  image_path.value = file;
  console.log('选择的图片路径:', image_path.value);
}

async function removeImg() {
  await invoke("delete_temp_file",);
}

async function ps_ocr_pd() {
  if (!image_path.value) {
    // 使用openDialog选择图片
    await openDialog();
  }

  try {
    const engineResult = await queryAuth(
      'system_config', 
      "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"
    ) as { config_value: string }[];
    
    const engine = engineResult[0]?.config_value || 'RapidOCR';
    const result = await invoke(
      engine === 'RapidOCR' ? 'ps_ocr' : 'ps_ocr_pd',
      { image_path: image_path.value }
    );
    console.log('OCR结果:', result);
    alert('OCR识别成功: ' + result);
  } catch (error) {
    console.error('OCR识别失败:', error);
    alert('OCR识别失败: ' + error);
  }
}

async function query_database_info() {
  const result = await invoke("query_database_info",);
  console.log(result);
  alert(result);
}

const logWindowPool = async () => {
  // 只取3个窗口池信息
  const windowPool = JSON.stringify( await queryAuth('windowPool', 'SELECT * FROM windowPool LIMIT 3'));
  console.log(windowPool);
  alert(windowPool);
}

// 修改选中文本函数
async function get_selected_text() {
  // 开始倒计时
  countdown.value = 5;
  
  // 清除可能存在的旧定时器
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  // 设置新的定时器
  countdownTimer = window.setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
  }, 1000);

  try {
    // 延迟5秒执行
    await new Promise(resolve => setTimeout(resolve, 5000));
    const select_text = await invoke("get_selected_text");
    alert(select_text);
  } catch (error) {
    console.error('获取选中文本失败:', error);
    alert('获取选中文本失败: ' + error);
  } finally {
    // 清除倒计时
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdown.value = 0;
  }
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style>
/* 添加淡入淡出动画 */
@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}

.animate-fade-in-out {
  animation: fadeInOut 5s ease-in-out forwards;
}

/* 添加旋转动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style> 