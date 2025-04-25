<script setup lang="ts">
import {Windows,} from '@/windows/create'
// import {createText} from '@/windows/text_ocr_create.ts'
import {onMounted, onUnmounted, Ref, ref, UnwrapRef, nextTick} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {emit, listen} from "@tauri-apps/api/event";
import {copyImage, readFileImage} from "@/windows/method.ts";
import {fabric} from 'fabric'
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {PaintingTools} from '@/windows/painting'
import {PhysicalPosition} from '@tauri-apps/api/window'
import {queryAuth} from "@/windows/dbsql.ts";
import {tencentOCR} from '@/windows/ocr';
import {translateTexts} from '@/windows/translate'
import {showToast} from '@/utils/toast'

interface OcrItem {
  text: string;
  box: number[][];
  translatedText?: string;
}

const NewWindows = new Windows()
// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')
const operationalID: any = new URLSearchParams(url).get('operationalID')
const label: any = new URLSearchParams(url).get('label')

// 从path路径http://asset.localhost/C:\Users\zxl\AppData\Local\Temp\AGCut_1731571102.png截取图片路径
const image_path: any = ref(path.replace('http://asset.localhost/', ''))
const image_ocr = ref<{ code: any; data: OcrItem[] }>({
  code: null,
  data: []
});
const is_ocr: Ref<UnwrapRef<boolean>, UnwrapRef<boolean> | boolean> = ref(false)
// 用于跟踪菜单状态
// 如果operationalID是fixed_copy则是直接复制图片到剪贴板,然后关闭窗口
// if (operationalID === 'fixed_copy') {
//   console.log('复制图片', path)
//   copyImage(path)
//   console.log('关闭窗口', label)
//   NewWindows.closeWin(label)
// }
// if (operationalID === 'fixed_ocr') {
// //   进行OCR识别
//   console.log('OCR识别', path)
//   emit('ocrImage',readFileImage(image_path.value))
// }
let menuBounds = {x: 0, y: 0, width: 50, height: 360};

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
    // 获取 OCR 模式
    const modeResult = await queryAuth(
        'system_config',
        "SELECT config_value FROM system_config WHERE config_key = 'ocr_mode'"
    ) as { config_value: string }[];

    const mode = modeResult[0]?.config_value || 'offline';

    let result: any;

    if (mode === 'online') {
      // 使用腾讯云 OCR
      result = await tencentOCR(image_path.value);
    } else {
      // 使用离线 OCR
      const engineResult = await queryAuth(
          'system_config',
          "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"
      ) as { config_value: string }[];

      const engine = engineResult[0]?.config_value || 'RapidOCR';
      result = await invoke(
          engine === 'RapidOCR' ? 'ps_ocr' : 'ps_ocr_pd',
          {image_path: image_path.value}
      );
    }

    console.log('OCR 结果:', result);

    let parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

    // 因为结果是数组，取第一个元素
    const ocrData = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;

    if (ocrData && ocrData.code === 100 && Array.isArray(ocrData.data)) {
      // 适配腾讯云 OCR 的 box 格式
      ocrData.data = ocrData.data.map((item: any) => {
        const [x, y] = item.box[0]; // 取第一个点作为左上角坐标
        const boxWidth = calculateBoxWidth(item.text, calculateFontSize(item)); // 动态计算框宽度

        const boxHeight = Math.abs(item.box[1][1] - item.box[2][1]); // 根据实际坐标计算高度
        // 取绝对值，防止负值
        console.log('boxHeight:', boxHeight)
        return {
          ...item,
          box: [
            [x, y], // 左上角
            [x + boxWidth, y], // 右上角
            [x + boxWidth, y + boxHeight], // 右下角
            [x, y + boxHeight] // 左下角
          ]
        };
      });

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

      // 根据面板显示状态调整窗口大小
      const size = await getSize()
      if (size !== null && showOcrPanel.value) {
        resize(size.width + 300, size.height)
      }
    } else {
      console.error('数据格式不正确:', ocrData);
    }
  } catch (error) {
    console.error('OCR 处理错误:', error);
    alert('OCR 处理失败: ' + error);
  }
};

// 取消 OCR 时重新启用工具栏
listen("ocrImage", async (event) => {
  if (event.payload === null) {
    is_ocr.value = false
    image_ocr.value = {
      code: null,
      data: []
    }
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
listen("translateText", async (event: any) => {
  if (image_ocr.value && image_ocr.value.data) {
    try {
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

      const {from, to} = event.payload || {from: 'auto', to: 'auto'} ;
      // 获取所有需要翻译的文本
      const texts = image_ocr.value.data.map(item => item.text);

      // 批量翻译
      const translatedTexts = await translateTexts(texts, from, to);

      // 在更新显示数据前添加调试信息
      console.log('原始文本:', texts);
      console.log('翻译结果:', translatedTexts);

      // 更新显示数据，只添加翻译结果，不修改原始文本
      image_ocr.value = {
        ...image_ocr.value,
        data: image_ocr.value.data.map((item, index) => ({
          ...item,
          translatedText: translatedTexts[index] // 只添加翻译结果
        }))
      };

      isTranslated.value = true;
      await emit('translationStatus', true);

      // 强制更新界面
      await nextTick();
    } catch (error) {
      const err = error as Error; // 将 error 断言为 Error 类型
      console.error('翻译处理失败:', err);
      alert('翻译处理失败: ' + err.message);
    }
  }
});

// 监听取消翻译事件
listen("cancelTranslate", async () => {
  if (originalOcrData.value) {
    // 恢复原始数据
    image_ocr.value = originalOcrData.value;
    isTranslated.value = false;
    await emit('translationStatus', false);
  }
});

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
  const urlWithParams = `/#/contextmenu?path=${image_path.value}&label=${label}&is_ocr=${is_ocr.value}&is_translated=${isTranslated.value}&show_ocr_panel=${showOcrPanel.value}`;
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

// 控制 OCR 面板显示状态
const showOcrPanel = ref(true);

// 初始化 OCR 面板显示状态
const initOcrPanelVisibility = async () => {
  try {
    const result = await queryAuth('system_config',
      "SELECT config_value FROM system_config WHERE config_key = 'ocr_panel_visible'"
    ) as { config_value: string }[];
    showOcrPanel.value = result[0]?.config_value === 'true';
  } catch (error) {
    console.error('获取 OCR 面板显示状态失败:', error);
  }
};

// 监听全局事件
onMounted(async () => {
  // 初始化 OCR 面板显示状态
  await initOcrPanelVisibility();
  
  // 处理 fixed_copy 和 fixed_ocr
  if (operationalID === 'fixed_copy') {
    console.log('复制图片', path)
    await copyImage(path)
    console.log('关闭窗口', label)
    await NewWindows.closeWin(label)
  }
  
  if (operationalID === 'fixed_ocr') {
    // 给一点延时确保组件完全加载
    setTimeout(async () => {
      console.log('OCR识别', path)
      const img = await readFileImage(image_path.value)
      await emit('ocrImage', img)
    }, 500)
  }

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
    let toolbarWin: any = null;
    const size: any = await getSize()
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();

        if (toolbarWin) {
          // 如果工具栏存在，则关闭它
          await NewWindows.closeWin('Toolbar');
          toolbarWin = null;
        } else {
          // 如果工具栏不存在，则创建它
          const currentWindow = await NewWindows.getWin(label);
          let x = 100;
          let y = 100;
          
          if (currentWindow) {
            const position = await currentWindow.outerPosition();
            x = position.x;
            y = position.y + size.height; // 设置在窗口顶部上方
          }
          
          toolbarWin = await NewWindows.createWin({
            label: 'Toolbar',
            url: `/#/painting-toolbar?sourceLabel=${label}`,
            width: 350,
            height: 40,
            x: x,
            y: y,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
          }, {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

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

// 添加双击复制功能
const copyText = async (text: string) => {
  try {
    await writeText(text)
    showToast('复制成功', 'success')
  } catch (error) {
    console.error('Failed to copy text:', error)
    showToast('复制失败', 'error')
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
    const translateSettingsWindow = await NewWindows.getWin('translate_settings')
    const size: any = await getSize()
    if (currentWindow) {
      const newX = initialPosition.value.x + dx
      const newY = initialPosition.value.y + dy

      // 移动主窗口
      await currentWindow.setPosition(new PhysicalPosition(newX, newY))

      // 移动工具栏窗口 - 修改为上方
      if (toolbarWindow) {
        await toolbarWindow.setPosition(new PhysicalPosition(
            newX,
            newY + size.height
        ))
      }
      
      // 移动翻译设置窗口
      if (translateSettingsWindow) {
        await translateSettingsWindow.setPosition(new PhysicalPosition(newX, newY - 40))
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

// 监听切换 OCR 面板显示状态事件
listen('toggleOcrPanel', async () => {
  showOcrPanel.value = !showOcrPanel.value;
  // 强制更新视图
  await nextTick();
  // 根据面板显示状态调整窗口大小
  const size = await getSize()
  if (size !== null) {
    resize(size.width + (showOcrPanel.value ? 300 : -300), size.height)
  }
  // 触发视图更新
  if (image_ocr.value) {
    image_ocr.value = { ...image_ocr.value };
  }
});

// 修改 calculateFontSize 函数
const calculateFontSize = (item: OcrItem) => {
  const boxHeight = Math.round(item.box[2][1] - item.box[0][1]);
  return boxHeight * 0.85;  // 从 0.95 调整为 0.85，缩小 10%
};

// 优化计算行高的逻辑
const calculateLineHeight = (boxHeight: number) => {
  const minLineHeight = 10; // 设置最小行高
  return Math.max(Math.round(boxHeight * 0.95), minLineHeight); // 根据文本框高度动态调整行高
};

// 修改滚轮事件处理函数
const handleWheel = (event: WheelEvent) => {
  const target = event.target as HTMLElement;
  // 只有当目标元素是 ocr-text 时才处理滚动
  if (target.classList.contains('ocr-text')) {
    // 阻止事件冒泡
    event.stopPropagation();
    // 水平滚动
    target.scrollLeft += event.deltaY * 2;
    // 阻止默认的垂直滚动行为
    event.preventDefault();
  }
};

// 优化计算框宽度的逻辑
const calculateBoxWidth = (text: string, fontSize: number) => {
  let totalWidth = 0;
  for (const char of text) {
    totalWidth += getCharWidth(char) * fontSize;
  }
  const charSpacing = 0.5; // 减少字符间距
  totalWidth += (text.length - 1) * charSpacing; // 计算总字符间距
  return totalWidth; // 直接返回计算的总宽度，不再限制最大宽度
};

// 添加新的 ref 来跟踪当前显示的项目索引
const activeIndex = ref<number | null>(null);

// 修改点击事件处理函数
const scrollToItem = (index: number) => {
  // 更新当前激活的索引
  activeIndex.value = activeIndex.value === index ? null : index;

  const itemElement = document.getElementById(`ocr-item-${index}`);
  if (itemElement) {
    // 移除之前的高亮
    document.querySelectorAll('.ocr-list-item').forEach(el => {
      el.classList.remove('highlight');
    });

    // 添加高亮
    itemElement.classList.add('highlight');

    // 滚动到对应项
    itemElement.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
};

// 调整字符宽度系数
const getCharWidth = (char: string) => {
  // 汉字宽度
  if (/[\u4e00-\u9fa5]/.test(char)) {
    return 0.8; // 汉字宽度系数调整为 1.0
  }
  // 数字和字母宽度
  if (/[0-9a-zA-Z]/.test(char)) {
    return 0.6; // 数字和字母宽度系数调整为 0.6
  }
  // 其他字符
  return 0.6; // 默认宽度系数调整为 0.8
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
      <!-- OCR 文本覆盖层 - 始终显示 -->
      <div class="ocr-overlay" @mousedown.stop>
        <div
            v-for="(item, index) in image_ocr.data"
            :key="index"
            class="ocr-text"
            :class="{ 'ocr-text-visible': activeIndex === index }"
            :style="{
              left: `${Math.round(item.box[0][0])}px`,
              top: `${Math.round(item.box[0][1])}px`,
              fontSize: `${calculateFontSize(item)}px`,
              lineHeight: `${calculateLineHeight(Math.abs(item.box[1][1] - item.box[2][1]))}px`,
              height: `${Math.abs(item.box[1][1] - item.box[2][1])}px`,
              whiteSpace: 'nowrap',
              overflow: 'auto',
              textOverflow: 'unset',
              textAlign: 'left',
            }"
            @wheel="handleWheel"
            @dblclick="copyText(!showOcrPanel && isTranslated && item.translatedText ? item.translatedText : item.text)"
            @click="scrollToItem(index)"
        >
          {{ !showOcrPanel && isTranslated && item.translatedText ? item.translatedText : item.text }}
        </div>
      </div>

      <!-- OCR 结果面板 - 可以显示/隐藏 -->
      <div v-if="showOcrPanel" class="w-[300px] h-full box-border overflow-y-auto bg-neutral-700">
        <div
            v-for="(item, index) in image_ocr.data"
            :key="index"
            :id="`ocr-item-${index}`"
            class="flex items-start m-2 p-1 hover:bg-white/10 select-none ocr-list-item"
            :class="{ 'highlight': activeIndex === index }"
            @click="scrollToItem(index)"
        >
          <span class="min-w-[24px] mr-2 text-gray-500 text-right select-none">{{ index + 1 }}</span>
          <div class="flex-1 break-all cursor-copy select-none" @dblclick="copyText(item.text)">
            <div v-if="isTranslated && item.translatedText">
              {{ item.translatedText }}
            </div>
            <div v-else>
              {{ item.text }}
            </div>
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
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none; /* 隐藏滚动条（Firefox） */
  -ms-overflow-style: none; /* 隐藏滚动条（IE/Edge） */
}

.ocr-overlay::-webkit-scrollbar {
  display: none; /* 隐藏滚动条（Chrome/Safari） */
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
  display: inline-block;
  max-width: 100%;
  overflow: auto;
  text-overflow: unset;
  white-space: nowrap;
  text-align: left;
  scrollbar-width: none;
  -ms-overflow-style: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* 恢复悬停效果 */
.ocr-text:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
  outline: 2px solid rgba(33, 150, 243, 0.5);
  color: rgb(255, 255, 255);
  z-index: 1000; /* 低于点击激活的层级 */
}

/* 点击激活的样式 */
.ocr-text-visible {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
  outline: 2px solid rgba(33, 150, 243, 0.5);
  color: rgb(255, 255, 255);
  z-index: 1001; /* 确保点击激活的文本在最上层 */
}

.highlight {
  background-color: rgba(33, 150, 243, 0.2) !important;
  outline: 2px solid rgba(33, 150, 243, 0.5);
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

/* 隐藏滚动条 */
.ocr-text {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  pointer-events: auto; /* 确保可以接收鼠标事件 */
}

.ocr-text::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

</style>