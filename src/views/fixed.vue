<script setup lang="ts">
import {Windows,} from '@/windows/create'
// import {createText} from '@/windows/text_ocr_create.ts'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {emit, listen} from "@tauri-apps/api/event";
import {copyImage} from "@/windows/method.ts";
import {fabric} from 'fabric'
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {PaintingTools} from '@/windows/painting'
import {PhysicalPosition} from '@tauri-apps/api/window'

interface OcrItem {
  text: string;
  box: number[][];
}

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

let menuBounds = {x: 0, y: 0, width: 50, height: 220};

const win = new Windows()

// 调整窗口宽度

function resize(width: number, height: number) {
  win.resizeWin(label, {width: Math.floor(width), height: Math.floor(height)});
}

// 获取窗口大小
function getSize() {
  return win.getWinSize(label)
}

// 存储原始 OCR 结果
const originalOcrData = ref<{ code: any; data: any[] } | null>(null)

const ocr = async () => {
  if (image_path.value === '' || image_path.value === null) {
    alert('请先截图');
    return;
  }

  try {
    // const result: any = await invoke("ps_ocr", {image_path: image_path.value});
    const result: any = await invoke("ps_ocr_pd", {image_path: image_path.value});
    console.log('原始OCR结果:', result);

    let parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

    // 因为结果是数组，取第一个元素
    const ocrData = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;

    if (ocrData && ocrData.code === 100 && Array.isArray(ocrData.data)) {
      console.log('OCR completed, data:', ocrData)
      image_ocr.value = ocrData
      is_ocr.value = true
      originalOcrData.value = null
      isTranslated.value = false
      await emit('translationStatus', false)

      // OCR 成功后发送事件切换到取消绘图状态并禁用工具栏
      await emit('toolbar-tool-change', {
        tool: null,  // null 表示取消绘图状态
        targetLabel: label,
        disableTools: true  // 添加标志表示禁用工具
      })

      const size = await getSize()
      if (size !== null) {
        resize(size.width + 300, size.height)
      }
    } else {
      console.error('数据格式不正确:', ocrData);
    }
  } catch (error) {
    console.error('OCR处理错误:', error);
    alert('OCR处理失败' + error);
  }
};

// 取消 OCR 时重新启用工具栏
listen("ocrImage", async (event) => {
  if (event.payload === null) {
    is_ocr.value = false
    image_ocr.value = []
    // 恢复原始窗口大小
    const size = await getSize()
    if (size !== null) {
      resize(size.width - 300, size.height)
    }
    // 重新启用工具栏
    await emit('toolbar-tool-change', {
      tool: null,  // 保持取消绘图状态
      targetLabel: label,
      disableTools: false  // 重新启用工具
    })
  } else {
    await ocr()
  }
})

// 添加翻译状态变量
const isTranslated = ref(false)

// 监听翻译事件
listen("translateText", async () => {
  if (image_ocr.value && image_ocr.value.data) {
    // 在翻译前，确保保存完整的原始数据结构
    if (!originalOcrData.value) {
      console.log('Saving original OCR data before translation:', image_ocr.value)
      // 保存完整的数据结构
      originalOcrData.value = {
        code: image_ocr.value.code,
        data: image_ocr.value.data.map((item: OcrItem) => ({
          text: item.text,
          box: [...item.box]  // 确保复制所有必要的属性
        }))
      }
    }

    // 添加翻译
    image_ocr.value.data = image_ocr.value.data.map((item: any) => ({
      ...item,
      text: item.text + ' 已翻译'
    }))
    isTranslated.value = true
    await emit('translationStatus', true)
  }
})

// 监听取消翻译事件
listen("cancelTranslate", async () => {
  console.log('Restoring original OCR data:', originalOcrData.value)
  if (originalOcrData.value) {
    // 完全替换为原始数据
    image_ocr.value = {
      code: originalOcrData.value.code,
      data: originalOcrData.value.data.map((item: OcrItem) => ({
        text: item.text,
        box: [...item.box]
      }))
    }

    // 清空原始数据
    originalOcrData.value = null
    isTranslated.value = false
    await emit('translationStatus', false)
  }
})

async function CreateContextMenu(event: any) {
  event.preventDefault();
  // 检查是否有选中的文本
  const selection = window.getSelection();
  if (selection && selection.toString().trim() !== '') {
    // 如果有选中的文本，直接复制并阻止默认菜单
    event.preventDefault();
    try {
      await writeText(selection.toString());
      await emit('show-alert', {
        type: 'success',
        message: '复制成功'
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
      await emit('show-alert', {
        type: 'error',
        message: '复制失败'
      });
    }
    return;
  }

  // 如果没有选中的文本，则显示菜单
  // 获取点击位置
  const x = event.screenX - 20;
  const y = event.screenY - 10;

  // 添加翻译状态到 URL 参数
  const urlWithParams = `/#/contextmenu?path=${image_path.value}&label=${label}&is_ocr=${is_ocr.value}&is_translated=${isTranslated.value}`;
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
    fabric.Image.fromURL(path, (fabricImg) => {
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
      width: 365,
      height: 45,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      shadow: false,
      x: window.screenX,
      y: window.screenY + img.height + 2,
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

// 添加双击复制功能
const copyText = async (text: string) => {
  try {
    await writeText(text)
    // 发送成功提示事件
    await emit('show-alert', {
      type: 'success',
      message: '复制成功'
    })
  } catch (error) {
    console.error('Failed to copy text:', error)
    await emit('show-alert', {
      type: 'error',
      message: '复制失败'
    })
  }
}

const isDragging = ref(false)
const dragStart = ref({x: 0, y: 0})
const initialPosition = ref({x: 0, y: 0})  // 添加初始窗口位置

const startDrag = async (event: MouseEvent) => {
  isDragging.value = true
  dragStart.value = {x: event.screenX, y: event.screenY}

  // 保存开始拖动时的窗口位置
  const currentWindow = await NewWindows.getWin(label)
  if (currentWindow) {
    const position = await currentWindow.outerPosition()
    initialPosition.value = {x: position.x, y: position.y}
  }
}

const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragStart.value = {x: 0, y: 0}
  }
}

const isPaintingMode = ref(false)

const drag = async (event: MouseEvent) => {
  if (isDragging.value && !isPaintingMode.value) {
    const dx = event.screenX - dragStart.value.x
    const dy = event.screenY - dragStart.value.y

    const currentWindow = await NewWindows.getWin(label)
    const toolbarWindow = await NewWindows.getWin('Toolbar')

    if (currentWindow) {
      const newX = initialPosition.value.x + dx
      const newY = initialPosition.value.y + dy

      // 移动主窗口
      await currentWindow.setPosition(new PhysicalPosition(newX, newY))

      // 移动工具栏窗口
      if (toolbarWindow) {
        await toolbarWindow.setPosition(new PhysicalPosition(
            newX,
            newY + (await currentWindow.outerSize()).height + 5
        ))
      }
    }
  }
}

listen('toolbar-tool-change', async (event: any) => {
  const {tool} = event.payload
  isPaintingMode.value = tool !== null && tool !== undefined
  console.log('Drawing mode:', isPaintingMode.value)  // 添加日志以便调试
})

// 在 script setup 中添加
const showAlert = ref(false)
const alertMessage = ref('')

// 监听显示提示事件
listen('show-alert', (event: any) => {
  alertMessage.value = event.payload.message
  showAlert.value = true
  setTimeout(() => {
    showAlert.value = false
  }, 2000)
})

// 在 script 部分添加计算字体大小的函数
const calculateFontSize = (item: OcrItem) => {
  const boxWidth = Math.round(item.box[2][0] - item.box[0][0]);
  const boxHeight = Math.round(item.box[2][1] - item.box[0][1]);
  const textLength = item.text.length;

  // 根据宽度和高度计算最大字体大小
  const widthBasedSize = boxWidth / (textLength * 0.55);  // 调整系数以更好地适应宽度
  const heightBasedSize = boxHeight * 0.9;  // 调整系数以更好地适应高度

  // 取两者中较小的值
  return Math.min(widthBasedSize, heightBasedSize);
};

// 添加滚轮事件处理函数
const handleWheel = (event: WheelEvent) => {
  const ocrOverlay = document.querySelector('.ocr-overlay') as HTMLElement;
  if (ocrOverlay) {
    // 水平滚动
    ocrOverlay.scrollLeft += event.deltaY;
    event.preventDefault();  // 阻止默认的垂直滚动行为
  }
};

</script>


<template>
  <div
      class="screenshot-container"
      @mousedown="startDrag"
      @mouseup="stopDrag"
      @mousemove="drag"
      @mouseleave="stopDrag"
  >
    <!-- Canvas 始终显示 -->
    <canvas id="c"></canvas>

    <!-- OCR 结果显示 -->
    <div class="content" v-if="is_ocr">
      <!-- OCR 文本覆盖层 -->
      <div class="ocr-overlay" @mousedown.stop @wheel="handleWheel">
        <div
            v-for="(item, index) in image_ocr?.data"
            :key="index"
            class="ocr-text"
            :style="{
              left: `${Math.round(item.box[0][0])}px`,
              top: `${Math.round(item.box[0][1])}px`,
              width: `${Math.round(item.box[2][0] - item.box[0][0])}px`,
              height: `${Math.round(item.box[2][1] - item.box[0][1])}px`,
              fontSize: `${calculateFontSize(item)}px`,
              lineHeight: `${Math.round(item.box[2][1] - item.box[0][1])}px`,
              whiteSpace: 'nowrap',
              overflow: 'visible',
              textOverflow: 'clip',
              textAlign: 'left',
            }"
            @dblclick="copyText(item.text)"
        >
          {{ item.text }}
        </div>
      </div>

      <!-- 右侧文本列表 -->
      <div class="w-[300px] h-full box-border overflow-y-auto bg-neutral-700">
        <div v-for="(item, index) in image_ocr?.data"
             :key="index"
             class="flex items-start m-2 p-1 hover:bg-white/10 select-none">
          <span
              class="min-w-[24px] mr-2 text-gray-500 text-right select-none"
          >{{ index + 1 }}</span>
          <div
              class="flex-1 break-all cursor-copy select-none"
              @dblclick="copyText(item.text)"
          >
            {{ item.text }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
      v-if="showAlert"
      role="alert"
      class="alert alert-success fixed top-0 w-36 right-0  z-50"
  >
    <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24">
      <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span>{{ alertMessage }}</span>
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
  box-sizing: border-box;
  cursor: move; /* 鼠标悬停时显示为可拖动 */
}

/* 添加伪元素来创建虚化边框效果 */
.screenshot-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15); /* 更淡的白色边框 */
  transition: box-shadow 0.3s ease;
}

/* 当容器被选中或悬停时的效果 */
.screenshot-container:hover::after,
.screenshot-container:focus-within::after {
  box-shadow: inset 0 0 0 1px rgba(33, 150, 243, 0.2), /* 非常淡的蓝色边框 */ 0 0 20px rgba(33, 150, 243, 0.1); /* 柔和的外发光效果 */
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
  pointer-events: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.ocr-text {
  background: transparent;
  color: transparent;
  cursor: text;
  user-select: text;
  pointer-events: auto;
  position: absolute;
  padding: 0;
  margin: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  text-align: left;
}

.ocr-text:hover {
  background: rgba(0, 0, 0, 0.6);
  outline: 2px solid rgba(33, 150, 243, 0.5);
  color: rgb(255, 255, 255);
  /*text-shadow: 0 0 1px white, 0 0 1px white, 0 0 1px white, 0 0 1px white;  悬停时添加白色边缘效果*/
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



</style>