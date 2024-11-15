<script setup lang="ts">
import {Windows,} from '@/windows/create'

// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')

const image_ocr: any = ref('')
// 从path路径http://asset.localhost/C:\Users\zxl\AppData\Local\Temp\AGCut_1731571102.png截取图片路径
const image_path: any = ref(path.replace('http://asset.localhost/', ''))
const is_ocr: Ref<UnwrapRef<boolean>, UnwrapRef<boolean> | boolean> = ref(false)



const win = new Windows()
// 调整窗口宽度
// 调整窗口宽度
function resize(width: number, height: number) {
  win.resizeWin('fixed', { width: Math.floor(width), height: Math.floor(height) });
}
// 获取窗口大小
function getSize() {
  return win.getWinSize('fixed')
}

import ContextMenu from '@imengyu/vue3-context-menu'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef} from "vue";
import {invoke} from "@tauri-apps/api/core";

// 右键点击事件处理器
const onContextMenu = async (e: MouseEvent) => {
  e.preventDefault();
  ContextMenu.showContextMenu({
    x: e.clientX, // 使用 clientX 和 clientY 而不是 e.x 和 e.y
    y: e.clientY,
    theme: "mac dark",
    items: [
      {
        label: "A menu item",
        onClick: () => {
          alert("You click a menu item");
        }
      },
      {
        label: "A submenu",
        children: [
          {
            label: "OCR", onClick: async () => {
              await ocr();
            }
          },
          {label: "复制OCR结果"},
          {
            label: "关闭", onClick: async () => {
              await win.closeWin('fixed');
            }
          },
        ]
      },
    ]
  });
};

// 在组件挂载时添加事件监听器
onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu);
});

// 在组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('contextmenu', onContextMenu);
});

// OCR
// listen("OCRImage", async (event) => {
//   image_path.value = event.payload
//   console.log(event.payload)
// });
const ocr = async () => {
  if (image_path.value === '' || image_path.value === null) {
    alert('请先截图');
    return;
  } else {
    const result = await invoke("ps_ocr", { image_path: image_path.value });
    console.log(result, 'ocr结果');
    image_ocr.value = result;
    const size = await getSize();
    if (size !== null) {
      // 只增加宽度，高度保持不变
      resize(size.width + 300, size.height);
      is_ocr.value = true;
    } else {
      console.error('无法获取窗口大小');
    }
  }
};
</script>

<template>
  <div class="screenshot-container">
    <!-- 当 is_ocr 为 false 时，图片占满整个容器 -->
    <img :src="path" alt="Screenshot" class="screenshot-image full" v-if="!is_ocr"/>
    <!-- 当 is_ocr 为 true 时，图片和链接并排显示 -->
    <div class="content" v-if="is_ocr">
      <img :src="path" alt="Screenshot" class="screenshot-image"/>
      <div class="link">
        <p>{{ image_ocr }}</p>
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
</style>