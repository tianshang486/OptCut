<script setup lang="ts">
import {Windows,} from '@/windows/create'
// import {createText} from '@/windows/text_ocr_create.ts'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {emit, listen} from "@tauri-apps/api/event";
import {copyImage} from "@/windows/method.ts";
import { fabric } from 'fabric'
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { PaintingTools } from '@/windows/painting'

const NewWindows = new Windows()
// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')
const operationalID: any = new URLSearchParams(url).get('operationalID')
const label: any = new URLSearchParams(url).get('label')
// 如果operationalID是fixed_copy则是直接复制图片到剪贴板,然后关闭窗口
if (operationalID === 'fixed_copy') {
  copyImage(path).then(() => {
    NewWindows.closeWin(label)
  })
}

// 从path路径http://asset.localhost/C:\Users\zxl\AppData\Local\Temp\AGCut_1731571102.png截取图片路径
const image_path: any = ref(path.replace('http://asset.localhost/', ''))
const image_ocr: any = ref([])
const is_ocr: Ref<UnwrapRef<boolean>, UnwrapRef<boolean> | boolean> = ref(false)
// 用于跟踪菜单状态

let menuBounds = {x: 0, y: 0, width: 50, height: 138};

const win = new Windows()

// 调整窗口宽度

function resize(width: number, height: number) {
  win.resizeWin(label, {width: Math.floor(width), height: Math.floor(height)});
}

// 获取窗口大小
function getSize() {
  return win.getWinSize(label)
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
    alert('OCR处理失败' + error);
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

  // 获取点击位置
  const x = event.screenX - 20;
  const y = event.screenY - 10;

  // 保存菜单位置信息
  // menuBounds = {
  //   x: x,
  //   y: y,
  //   width: 50,
  //   height: 200
  // };
  // /#/fixed_menu 给url添加参数,image_path
  const urlWithParams = `/#/contextmenu?path=${image_path.value}&label=${label}`;
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
    shadow: false,
    theme: 'dark',
    hiddenTitle: true,
    skipTaskbar: true,
    decorations: false,
    focus: false,
  };

  await win.createWin(options, {x: event.x, y: event.y});

}

// 监听右键点击事件启动菜单,启动后任何点击事件都会关闭菜单
// 关闭菜单的处理函数
const handleCloseMenu = () => {
  emit('close_menu')
};

// 监听全局事件
onMounted(() => {
  // 监听右键菜单事件
  document.addEventListener('contextmenu', CreateContextMenu);
  // 监听点击事件关闭菜单
  document.addEventListener('click', handleCloseMenu);
  // 监听窗口失焦事件关闭菜单
  window.addEventListener('blur', handleCloseMenu);
  // 监听按下 Esc 键关闭菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      handleCloseMenu();
    }
  });
});

// 清理所有事件监听
onUnmounted(() => {
  document.removeEventListener('contextmenu', CreateContextMenu);
  document.removeEventListener('click', handleCloseMenu);
  window.removeEventListener('blur', handleCloseMenu);
  document.removeEventListener('keydown', handleCloseMenu);
  if (paintingTools) {
    paintingTools.cleanup()
  }
});
// 在 script setup 顶部添加 paintingTools 引用
let paintingTools: PaintingTools | null = null

// 将 canvas 初始化移 onMounted 中
onMounted(() => {
  // 获取页面大小
  const img = new Image();
  img.src = path;

  // 等图片加载完成
  img.onload = async () => {
    const canvas = new fabric.Canvas('c', {
      width: img.width,
      height: img.height,
      backgroundColor: 'transparent'
    });

    // 创建绘图工具实例并传入 store
    paintingTools = new PaintingTools(canvas)

    // 修改这里：使用 fabric.Image.fromURL 替代 FabricImage.fromURL
    await fabric.Image.fromURL(path, (fabricImg) => {
      fabricImg.set({
        left: 0,
        top: 0,
        width: img.width,
        height: img.height,
        selectable: false,
        evented: false,
        hoverCursor: 'default'
      });
      canvas.add(fabricImg);
      canvas.renderAll();
    });

    // 创建工具栏窗口
    let toolbarWin: any = null
    toolbarWin = await NewWindows.createWin({
      label: 'Toolbar',
      url: `/#/painting-toolbar?sourceLabel=${label}`,
      title: 'Toolbar',
      width: 280,
      height: 48,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      shadow: false,
      x: window.screenX,
      y: window.screenY + img.height + 5,
    }, {parent: label});

    // 监听窗口关闭事件
    const currentWindow = await NewWindows.getWin(label);
    if (currentWindow) {
      await currentWindow.onCloseRequested(async () => {
        if (toolbarWin) {
          await NewWindows.closeWin(toolbarWin.label);
        }
      });
    }
  };

});

const copyText = async (text: string) => {
  try {
    await writeText(text);
    console.log('文本已复制');
  } catch (err) {
    console.error('复制失败:', err);
  }
};

</script>


<template>
  <div class="screenshot-container">
    <!-- Canvas 始终示 -->
    <canvas id="c"></canvas>

    <!-- OCR 结果显示 -->
    <div class="content" v-if="is_ocr">
      <!-- OCR 文本覆盖层 -->
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
            @dblclick="() => copyText(item.text)"
        >
          {{ item.text }}
        </div>
      </div>

      <!-- 右侧文本列表 -->
      <div class="link">
        <div v-for="(item, index) in image_ocr?.data" :key="index" class="text-item">
          <span class="line-number">{{ index + 1 }}</span>
          <p>{{ item.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screenshot-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
}

#c {
  flex: 1;
  height: 100%;
  object-fit: contain;
}

/* OCR 内容容器 */
.content {
  display: flex;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* OCR 文本覆盖层 */
.ocr-overlay {
  flex: 1;
  position: relative;
  width: calc(100% - 300px);
  height: 100%;
}

.ocr-text {
  background: transparent;
  color: transparent;  /* 默认文字透明 */
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
  justify-content: center;
}

.ocr-text:hover {
  background: rgba(255, 255, 0, 0.71);
  border: 1px solid rgb(120, 246, 150);
  color: rgb(0, 92, 253);  /* 悬浮时文字显示为半透明黑色 */
}

.ocr-text::selection,
.ocr-text *::selection {  /* 确保字内容也能被选中 */
  background: rgba(0, 123, 255, 0.3);
  color: #000;  /* 选中时文字显示为黑色 */
}

/* 右侧文本列表 */
.link {
  width: 300px;
  height: 100%;
  color: #ffffff;
  background: rgb(43, 43, 43);
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}

::-webkit-scrollbar-thumb {
  background-color: #005cfd;
  border-radius: 5px;
}

/* 文本项容器 */
.text-item {
  display: flex;
  align-items: flex-start;
  margin: 8px 0;
  padding: 5px;
}

.text-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 行号样式 */
.line-number {
  min-width: 24px;
  margin-right: 8px;
  color: #666;
  text-align: right;
  user-select: none;
}

/* 文本内容样式 */
.text-item p {
  margin: 0;
  flex: 1;
  text-align: left;
}

/* 移除之前的 p 样式 */
.link p {
  margin: 0;
  padding: 0;
}

.link p:hover {
  background: none;
}
</style>