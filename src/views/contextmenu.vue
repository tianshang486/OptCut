<template>
  <div class="v3-context-menu">
    <div class="v3-context-menu-item" 
         v-for="item in menuItems" 
         :key="item.label"
         @click="handleSelect(item.label)">
      <i v-if="item.icon" class="menu-icon">{{ item.icon }}</i>
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {writeImage} from "@tauri-apps/plugin-clipboard-manager";
import {Image} from "@tauri-apps/api/image";
import {Windows,} from '@/windows/create'
import {emit} from "@tauri-apps/api/event";

const windows = new Windows()
// 从url中获取截图路径和label /#/fixed_menu?path=xxx&label=xxx
const hash = window.location.hash // 获取 #/fixed_menu?path=xxx&label=xxx
const params = new URLSearchParams(hash.split('?')[1]) // 分割获取参数部分
const image_path: any = ref(params.get('path'))
const label: any = ref(params.get('label'))

// const image_ocr: any = ref([])
// const activeIndex = ref('1')
const menuItems = [
  { label: '复制', icon: '📋', handler: () => copyImage(image_path.value) },
  { label: '复制关闭', icon: '✂️', handler: () => copyAndClose(image_path.value) },
  { label: 'OCR', icon: '👁️', handler: async () => {
    const img = await readFileImage(image_path.value)
    ocr(img)
  }},
]

async function readFileImage(path: string) {
  return await Image.fromPath(path)
}
// 文字识别
function ocr(img: any) {
  emit('ocrImage', img)
}

// 复制图片到剪贴板
const copyImage = async (path: string) => {
  // await invoke("copied_to_clipboard", {image_path: path});
  const img: any = await readFileImage(path);
  // 如果失败则重试,如果提示线程没有打开的粘贴板，则需要打开粘贴板
  try {
    await writeImage(img);
    // alert('复制成功');
  } catch (e) {
    console.error(e);
    //   延迟2秒重试
    setTimeout(() => {
      copyImage(path);
    }, 3000);
  }
};

// 复制并关闭窗口
const copyAndClose = async (path: string) => {
  await copyImage(path);
  await windows.closeWin(label.value)
  await windows.closeWin('contextmenu')
};
const handleSelect = (index: string) => {
  const item = menuItems.find(item => item.label === index)
  if (item?.handler) {
    item.handler()
  }
}
</script>

<style scoped>


.v3-context-menu {
  min-width: 180px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.v3-context-menu-item {
  padding: 8px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #333;
}

.v3-context-menu-item:hover {
  background: #f5f7fa;
}

.menu-icon {
  margin-right: 8px;
  font-size: 16px;
}
</style>