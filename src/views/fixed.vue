<script setup lang="ts">
import {Windows,} from '@/windows/create'
// import {createText} from '@/windows/text_ocr_create.ts'
import {writeImage} from "@tauri-apps/plugin-clipboard-manager";
import ContextMenu from '@imengyu/vue3-context-menu'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {Image} from "@tauri-apps/api/image";

// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')

const image_ocr: any = ref([])
// 从path路径http://asset.localhost/C:\Users\zxl\AppData\Local\Temp\AGCut_1731571102.png截取图片路径
const image_path: any = ref(path.replace('http://asset.localhost/', ''))
const is_ocr: Ref<UnwrapRef<boolean>, UnwrapRef<boolean> | boolean> = ref(false)


const win = new Windows()

// 调整窗口宽度

function resize(width: number, height: number) {
  win.resizeWin('fixed', {width: Math.floor(width), height: Math.floor(height)});
}

// 获取窗口大小
function getSize() {
  return win.getWinSize('fixed')
}

async function readFileImage(path: string) {
  return await Image.fromPath(path)
}


// 复制图片到剪贴板
const copyImage = async (path: string) => {
  // await invoke("copied_to_clipboard", {image_path: path});
  const img: any = await readFileImage(path);
  // 如果失败则重试,如果提示线程没有打开的粘贴板，则需要打开粘贴板
  try {
    await writeImage(img);
    alert('复制成功');
  } catch (e) {
    console.error(e);
    //   延迟2秒重试
    setTimeout(() => {
      copyImage(path);
    }, 3000);
  }
};

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
            label: "复制图片", onClick: async () => {
              await copyImage(image_path.value);
            }
          },
          {
            label: "复制OCR结果", onClick: async () => {
              await ocr();
            }
          },
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