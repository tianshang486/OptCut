<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue';
import {listen} from '@tauri-apps/api/event';
import TranslateSettings from '@/components/translate-settings.vue';
import {queryAuth} from '@/utils/dbsql';
import {translateTexts} from '@/utils/translate';
import {invoke} from '@tauri-apps/api/core';
import {writeText} from "@tauri-apps/plugin-clipboard-manager";
import {Windows} from "@/windows/create";
import { PhysicalPosition } from '@tauri-apps/api/window';

const NewWindows = new Windows();
const mouseLeaveTimer = ref<number | null>(null);
const isMouseInWindow = ref(true);
const isFixed = ref(false);
const isDragging = ref(false)
const dragStart = ref({x: 0, y: 0})
const initialPosition = ref({x: 0, y: 0})


// 切换固定状态
const toggleFixed = () => {
  isFixed.value = !isFixed.value;
  if (isFixed.value && mouseLeaveTimer.value) {
    clearTimeout(mouseLeaveTimer.value);
    mouseLeaveTimer.value = null;
  }
};

// 在组件卸载时清理定时器
onUnmounted(() => {
  if (mouseLeaveTimer.value) {
    clearTimeout(mouseLeaveTimer.value);
  }
});

const sourceText = ref('');
const translatedText = ref('');
const isTranslating = ref(false);
const fromLang = ref('auto');
const toLang = ref('auto');
const charCount = ref(0);
const isSegmentMode = ref(false);
const segmentedList = ref<Array<{word: string, trans: string}>>([]);

const params: any = new URLSearchParams(window.location.hash.split('?')[1]);

// 添加新函数用于检测鼠标是否在窗口内
const startMouseTracker = async () => {
  // 只有在非固定状态下才启动跟踪
  if (isFixed.value) return;
  
  // 获取窗口大小和位置
  const currentWindow = await NewWindows.getWin('translate_window');
  if (!currentWindow) return;
  
  try {
    const size = await currentWindow.outerSize();
    const position = await currentWindow.outerPosition();
    
    // 定义窗口边界，添加10px的边缘检测区域
    const windowBounds = {
      left: position.x - 10,
      top: position.y - 10,
      right: position.x + size.width + 10,
      bottom: position.y + size.height + 10
    };
    
    // 获取鼠标位置
    const mousePositionStr = await invoke<string>('get_mouse_position');
    const mousePosition = JSON.parse(mousePositionStr);
    
    // 检查鼠标是否在窗口范围内
    const mouseInWindow = 
      mousePosition.x >= windowBounds.left && 
      mousePosition.x <= windowBounds.right && 
      mousePosition.y >= windowBounds.top && 
      mousePosition.y <= windowBounds.bottom;
    
    // 更新状态，并提供视觉反馈
    isMouseInWindow.value = mouseInWindow;

      if (!mouseInWindow && !isDragging.value) {

        
        if (!mouseLeaveTimer.value) {
          console.log('鼠标离开窗口，准备关闭窗口');
          mouseLeaveTimer.value = window.setTimeout(async () => {
            // 再次检查状态，以防状态改变
            if (!isFixed.value && !isDragging.value) {
              await NewWindows.closeWin('translate_window');
            } else {
              // 如果状态已改变，清除定时器
              if (mouseLeaveTimer.value) {
                clearTimeout(mouseLeaveTimer.value);
                mouseLeaveTimer.value = null;
              }

            }
          }, 1000);
        }
      } else {

        // 鼠标在窗口内，清除关闭定时器
        if (mouseLeaveTimer.value) {
          clearTimeout(mouseLeaveTimer.value);
          mouseLeaveTimer.value = null;
        }
      }
    }
    catch (error) {
      console.error('获取窗口位置失败', error);
    }
  
  // 继续跟踪，每300ms检查一次，比之前的500ms更快响应
  setTimeout(startMouseTracker, 1000);
};

// 在组件挂载时启动鼠标跟踪
onMounted(async () => {
  // 获取默认语言设置
  const [fromResult, toResult] = await Promise.all([
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_from'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_to'")
  ]);

  fromLang.value = fromResult[0]?.config_value || 'auto';
  toLang.value = toResult[0]?.config_value || 'auto';

  // 从URL获取文本
  const text = params.get('text');
  if (text) {
    sourceText.value = decodeURIComponent(text);
    updateCharCount();
    await translateText();
  }

  // 监听翻译配置更新
  await listen('updateTranslationConfig', async (event: any) => {
    const { from, to } = event.payload;
    if (from) fromLang.value = from;
    if (to) toLang.value = to;
    if (sourceText.value) {
      await translateText();
    }
  });
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown);
  
  // 启动鼠标位置跟踪
  await startMouseTracker();
});

// 添加键盘事件处理函数
const handleKeyDown = async (event: KeyboardEvent) => {
  // 按下Esc键关闭窗口
  if (event.key === 'Escape') {
    console.log('按下Esc键，关闭窗口');
    await NewWindows.closeWin('translate_window');
  }
};

// 在组件卸载时清理事件监听和定时器
onUnmounted(() => {
  if (mouseLeaveTimer.value) {
    clearTimeout(mouseLeaveTimer.value);
  }
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown);
});

// 更新字符计数
const updateCharCount = () => {
  charCount.value = sourceText.value.length;
};

// 分词翻译
const segmentTranslate = async () => {
  if (!sourceText.value.trim()) return;

  try {
    isTranslating.value = true;
    isSegmentMode.value = true;
    segmentedList.value = [];

    // 调用分词
    const words = (await invoke<string[]>('jieba_cut', { text: sourceText.value }))
      .filter(word => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(word)); // 过滤掉纯特殊字符的分词


    // 批量翻译
    const translations = await translateTexts(words, fromLang.value, toLang.value);

    // 组合结果
    segmentedList.value = words.map((word, index) => ({
      word,
      trans: translations[index] || ''
    }));
  } catch (error) {
    console.error('分词翻译失败:', error);
  } finally {
    isTranslating.value = false;
  }
};

// 普通翻译
const translateText = async () => {
  if (!sourceText.value.trim()) {
    translatedText.value = '';
    return;
  }

  try {
    isTranslating.value = true;
    isSegmentMode.value = false;
    const textLines = sourceText.value.split('\n');
    const result = await translateTexts(textLines, fromLang.value, toLang.value);
    translatedText.value = result.join('\n');
  } catch (error) {
    console.error('翻译失败:', error);
    translatedText.value = '翻译失败，请重试';
  } finally {
    isTranslating.value = false;
  }
};

// 复制文本
const copyText = async (text: string) => {
  try {
    // 按 → 分割取翻译结果
    const [result] = text.split('→')[1]
    await writeText(result);
  } catch (error) {
    console.error('复制失败:', error);
  }
};

// 清空文本
const clearText = () => {
  sourceText.value = '';
  translatedText.value = '';
  segmentedList.value = [];
  isSegmentMode.value = false;
  updateCharCount();
};

// 切换翻译模式
const toggleMode = () => {
  isSegmentMode.value = !isSegmentMode.value;
  if (isSegmentMode.value && sourceText.value) {
    segmentTranslate();
  } else {
    translateText();
  }
};

const startDrag = async (event: MouseEvent) => {
  if (isDragging.value) return;
  
  // 先设置拖动初始状态
  isDragging.value = true;
  dragStart.value = { x: event.screenX, y: event.screenY };
  
  // 使用鼠标在元素内的相对位置作为偏移量
  // 这样鼠标点击的位置就是抓取点，拖动更自然
  let offsetX = 50, offsetY = 50; // 默认值
  if (event.currentTarget && event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
  }
  
  // 初始化一个默认位置，防止首次拖动窗口跳到左上角
  initialPosition.value = { x: event.screenX - offsetX, y: event.screenY - offsetY };
  
  // 异步获取准确的窗口位置
  const currentWindow = await NewWindows.getWin('translate_window');
  if (currentWindow) {
    try {
      const position = await currentWindow.outerPosition();
      initialPosition.value = { x: position.x, y: position.y };
    } catch (error) {
      console.error('获取窗口位置失败', error);
    }
  }
};

const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragStart.value = {x: 0, y: 0}
  }
}

const drag = async (event: MouseEvent) => {
  // 检查鼠标左键是否仍然按下(buttons属性的第一位表示左键状态)
  if (!isDragging.value || (event.buttons & 1) === 0) {
    if (isDragging.value) {
      stopDrag();
    }
    return;
  }
  
  const dx = event.screenX - dragStart.value.x
  const dy = event.screenY - dragStart.value.y

  const currentWindow = await NewWindows.getWin('translate_window')
  if (currentWindow) {
    const newX = initialPosition.value.x + dx
    const newY = initialPosition.value.y + dy
    await currentWindow.setPosition(new PhysicalPosition(newX, newY))
  }
}
</script>

<template>
  <div
    class="flex flex-col bg-transparent text-white space-y-1 translate-container"
    :style="{height: '100vh' }"
  >
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between bg-neutral-800 p-2 rounded-lg relative">
      <div class="flex items-center gap-2 z-10">
        <!-- 固定按钮 -->
        <button
          @click="toggleFixed"
          class="p-2 rounded-md transition-colors"
          :class="isFixed ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-neutral-700'"
          :title="isFixed ? '取消固定' : '固定窗口'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <TranslateSettings />
      </div>
      <div class="flex items-center gap-2 z-10">
        <!-- 分词翻译按钮 -->
        <button
          @click="toggleMode"
          class="px-3 py-1 rounded-md flex items-center space-x-1 transition-colors"
          :class="isSegmentMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-white hover:bg-neutral-700'"
          :title="isSegmentMode ? '切换到普通翻译' : '切换到分词翻译'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          {{ isSegmentMode ? '分词' : '普通' }}
        </button>
        
        <!-- 刷新按钮 -->
        <button
          @click="isSegmentMode ? segmentTranslate() : translateText()"
          class="p-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 transition-colors"
          :disabled="isTranslating"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <!-- 拖拽区域 -->
      <div 
        data-tauri-drag-region 
        class="absolute inset-0 z-0"
        @mousedown="startDrag"
        @mouseup="stopDrag"
        @mousemove="drag"
        @mouseleave="stopDrag"
      ></div>
    </div>

    <!-- 内容区域容器 -->
    <div class="flex-1 flex flex-col space-y-1 overflow-hidden">
      <!-- 源文本区域 -->
      <div class="h-[250px] bg-neutral-800 rounded-lg overflow-hidden">

        <div class="flex justify-between items-center px-3 py-2 border-b border-neutral-700">
          <span class="text-sm text-neutral-400">原文</span>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-neutral-500">{{ charCount }}/6000</span>
            <button 
              @click="clearText"
              class="p-1 hover:bg-neutral-700 rounded transition-colors"
              title="清空"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
            <button 
              @click="copyText(sourceText)"
              class="p-1 hover:bg-neutral-700 rounded transition-colors"
              title="复制原文"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zm0-2h8a4 4 0 014 4v11a4 4 0 01-4 4H6a4 4 0 01-4-4V5a4 4 0 014-4z" />
              </svg>
            </button>
          </div>
        </div>
        <textarea
          v-model="sourceText"
          class="w-full bg-transparent resize-none focus:outline-none overflow-y-auto p-2"
          style="height: calc(100% - 40px);"
          placeholder="请输入要翻译的文本"
          @input="updateCharCount(); isSegmentMode ? segmentTranslate() : translateText()"
        ></textarea>
      </div>

      <!-- 翻译结果区域 -->
      <div class="flex-1 bg-neutral-800 rounded-lg overflow-hidden">
        <div class="flex justify-between items-center px-3 py-2 border-b border-neutral-700">
          <span class="text-sm text-neutral-400">{{ isSegmentMode ? '分词结果' : '译文' }}</span>
          <button 
            @click="copyText(isSegmentMode ? segmentedList.map(item => item.trans).join('\n') : translatedText)"
            class="p-1 hover:bg-neutral-700 rounded transition-colors"
            :title="isSegmentMode ? '复制所有译文' : '复制译文'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zm0-2h8a4 4 0 014 4v11a4 4 0 01-4 4H6a4 4 0 01-4-4V5a4 4 0 014-4z" />
            </svg>
          </button>
        </div>
        <!-- 普通翻译结果 -->
        <div 
          v-if="!isSegmentMode"
          class="flex-1 w-full p-3 overflow-auto whitespace-pre-wrap break-words"
          :class="{ 'opacity-50': isTranslating }"
          style="white-space: pre-wrap; word-break: break-word;"
        >
          {{ translatedText || '翻译结果将显示在这里' }}
        </div>
        <!-- 分词翻译结果 -->
        <div
          v-else
          class="flex-1 w-full overflow-auto"
          :class="{ 'opacity-50': isTranslating }"
        >
          <div v-if="segmentedList.length" class="grid grid-cols-1 divide-y divide-neutral-700">
            <div 
              v-for="(item, idx) in segmentedList" 
              :key="idx"
              class="group hover:bg-neutral-700/50 transition-colors"
            >
              <div class="flex items-start p-3 gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-blue-400 font-medium">{{ item.word }}</span>
                    <span class="text-xs text-neutral-500 bg-neutral-700/50 px-1.5 py-0.5 rounded">
                      {{ item.word.length }}字
                    </span>
                  </div>
                  <div class="mt-1 text-sm text-neutral-400">
                    {{ item.trans }}
                  </div>
                </div>
                <button 
                  @click="copyText(item.trans)"
                  class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-neutral-600 rounded transition-all"
                  title="复制译文"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zm0-2h8a4 4 0 014 4v11a4 4 0 01-4 4H6a4 4 0 01-4-4V5a4 4 0 014-4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div 
            v-else 
            class="flex flex-col items-center justify-center h-full text-neutral-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <span>分词翻译结果将显示在这里</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* 确保内容区域占满可用空间 */
.h-full {
  height: 100%;
}

/* 输入框样式 */
textarea::placeholder {
  color: #666;
}

/* 分词结果动画 */
.group:hover .opacity-0 {
  transition-delay: 50ms;
}

/* 超出内容显示滚动条 */
textarea {
  overflow-y: auto;
  min-height: 100px;
}

/* 确保内容区域可以正确滚动 */
.flex-1 {
  min-height: 0;
  overflow: auto;
}



</style>