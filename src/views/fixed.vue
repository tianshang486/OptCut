<script setup lang="ts">
import {Windows,} from '@/windows/create'
// import {createText} from '@/windows/text_ocr_create.ts'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";

// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')


// 从path路径http://asset.localhost/C:\Users\zxl\AppData\Local\Temp\AGCut_1731571102.png截取图片路径
const image_path: any = ref(path.replace('http://asset.localhost/', ''))
const image_ocr: any = ref([])
const is_ocr: Ref<UnwrapRef<boolean>, UnwrapRef<boolean> | boolean> = ref(false)
// 用于跟踪菜单状态
const isMenuOpen = ref(false);
let menuBounds = { x: 0, y: 0, width: 200, height: 500 };

const win = new Windows()

// 调整窗口宽度

function resize(width: number, height: number) {
  win.resizeWin('fixed', {width: Math.floor(width), height: Math.floor(height)});
}

// 获取窗口大小
function getSize() {
  return win.getWinSize('fixed')
}

const ocr = async () => {
  if (image_path.value === '' || image_path.value === null) {
    alert('请先截图');
    return;
  }

  try {
    const result: any = await invoke("ps_ocr", {image_path: image_path.value});
    console.log('原始OCR结果:', result);

    let parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

    // 因为结果是数组，取第一个元素
    const ocrData = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;

    if (ocrData && ocrData.code === 100 && Array.isArray(ocrData.data)) {
      console.log('处理后的数据:', ocrData);
      image_ocr.value = ocrData;  // 保存处理后的对象
      is_ocr.value = true;

      const size = await getSize();
      if (size !== null) {
        resize(size.width + 300, size.height);
      }
    } else {
      console.error('数据格式不正确:', ocrData);
    }
  } catch (error) {
    console.error('OCR处理错误:', error);
  }
};

// 监听copyImage
listen("ocrImage", async () => {
  // if (event.payload === null) {
  //   path.value = image_path.value;
  //   return;
  // } else {
  //   path.value = event.payload;
  // }
  await ocr();
});

async function CreateContextMenu(event: any) {
  // 禁用默认右键菜单
  event.preventDefault();
  
  // 如果菜单已经打开，先关闭它
  if (isMenuOpen.value) {
    await closeWin();
  }
  
  // 获取点击位置
  const x = event.screenX - 20;
  const y = event.screenY - 10;
  
  // 保存菜单位置信息
  menuBounds = {
    x: x,
    y: y,
    width: 100,
    height: 300
  };
  // /#/fixed_menu 给url添加参数,image_path
  const urlWithParams = `/#/contextmenu?path=${image_path.value}&label=fixed`;
  console.log(urlWithParams)


  const options = {
    label: 'contextmenu',
    x: x,
    y: y,
    width: menuBounds.width,
    height: menuBounds.height,
    title: '菜单',
    url: urlWithParams,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    dragDropEnabled: true,
    center: false,
    shadow: true,
    theme: 'dark',
    hiddenTitle: true,
    skipTaskbar: true,
    decorations: false,
  };
  
  await win.createWin(options, {x: event.x, y: event.y});
  isMenuOpen.value = true;
  
  // 添加全局鼠标移动监听
  document.addEventListener('mousemove', handleMouseMove);
}

// 处理鼠标移动
function handleMouseMove(event: MouseEvent) {
  if (!isMenuOpen.value) return;
  
  // 检查鼠标是否在菜单区域外
  const mouseX = event.screenX;
  const mouseY = event.screenY;
  
  if (mouseX < menuBounds.x || 
      mouseX > menuBounds.x + menuBounds.width || 
      mouseY < menuBounds.y || 
      mouseY > menuBounds.y + menuBounds.height) {
    closeWin();
  }
}

// 关闭窗口
async function closeWin() {
  await win.closeWin('contextmenu');
  isMenuOpen.value = false;
  // 移除鼠标移动监听
  document.removeEventListener('mousemove', handleMouseMove);
}

// 右键点击事件处理器

// 在组件挂载时添加事件监听器
onMounted(() => {
  document.addEventListener('contextmenu', CreateContextMenu);
});

// 在组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('contextmenu', CreateContextMenu);
  document.removeEventListener('mousemove', handleMouseMove);
  // 如果菜单还开着，确保关闭
  if (isMenuOpen.value) {
    closeWin();
  }
});

// OCR
// listen("OCRImage", async (event) => {
//   image_path.value = event.payload
//   console.log(event.payload)
// });

</script>

<template>
  <div class="screenshot-container">
    <img :src="path" alt="Screenshot" class="screenshot-image full" v-if="!is_ocr"/>
    <div class="content" v-if="is_ocr">
      <div class="image-container">
        <img :src="path" alt="Screenshot" class="screenshot-image"/>
        <div class="ocr-overlay">
          <div 
            v-for="(item, index) in image_ocr?.data" 
            :key="index"
            class="ocr-text"
            :style="{
              position: 'absolute',
              left: `${Math.round(item.box[0][0])}px`,
              top: `${Math.round(item.box[0][1])}px`,
              width: `${Math.round(item.box[2][0] - item.box[0][0])}px`,
              height: `${Math.round(item.box[2][1] - item.box[0][1])}px`,
              lineHeight: `${Math.round(item.box[2][1] - item.box[0][1])}px`,
              fontSize: `${Math.round((item.box[2][1] - item.box[0][1]) * 0.9)}px`,
            }"
          >
            {{ item.text }}
          </div>
        </div>
      </div>
      <div id="container" class="link">
        <div v-for="(item, index) in image_ocr?.data" :key="index">
          <p>{{ item.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

/* 容器样式 */
.screenshot-container {
  display: flex; /* 使用 flexbox 布局 */
  align-items: center; /* 垂直居中对齐 */
  width: 100vw; /* 容器宽度 */
  height: 100vh; /* 容器高度 */
  position: fixed; /* 固定位置 */
  top: 0;
  left: 0;
}

/* 图片样式 */
.screenshot-image.full {
  width: 100%; /* 设置图片宽度为 100% */
  height: auto; /* 高度自适应 */
  object-fit: cover; /* 确保图片保持比例 */
}

.screenshot-image {
  width: calc(100vw - 300px); /* 设置图片宽度为容器宽度减去链接的100px */
  height: auto; /* 高度自适应 */
  object-fit: cover; /* 确保图片保持比例 */
}

/* 内容容器样式 */
.content {
  display: flex; /* 使用 flexbox 布局 */
  width: 100%; /* 内容容器宽度 */
  height: 100%; /* 内容容器高度 */
}

/* 链接样式 */
.link {
  width: 300px; /* 固定宽度为 300px */
  color: #ffffff; /* 文字颜色为白色 */
  background: rgb(43, 43, 43); /* 背景颜色 */
  text-align: center; /* 文字居中 */
  white-space: normal; /* 允许内容换行 */
  overflow-x: hidden; /* 隐藏横向溢出的内容 */
  overflow-y: auto; /* 允许垂直溢出时滚动 */
  padding: 10px; /* 增加内边距 */
  box-sizing: border-box; /* 边框和内边距包含在宽度内 */
  word-break: break-word; /* 长单词或URL在到达容器边界时在内部换行 */
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

::-webkit-scrollbar-thumb {
  background-color: #005cfd;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background-color: #005cfd;
  border-radius: 5px;


}

/* 添加新的样式 */
.image-container {
  position: relative;
  width: calc(100vw - 300px);
  height: 100vh;
}

.ocr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.ocr-text {
  background: transparent;
  color: transparent;
  cursor: text;
  user-select: text;
  pointer-events: auto;
  position: absolute;
  font-size: 14px;
  padding: 0;
  margin: 0;
  white-space: nowrap;
  z-index: 1000;
  display: flex;
  align-items: center;
}

/* 鼠标悬停时显示半透明背景 */
.ocr-text:hover {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid rgba(255, 255, 0, 0.3);
}

/* 移除自定义选中样式，使用系统默认的蓝色选中效果 */
/* .ocr-text::selection {
  // 移除这部分，让系统默认选中效果生效
} */

</style>