<template>
  <div v-if="isReady" class="v3-context-menu" :class="{ 'menu-show': isReady }">
    <div class="v3-context-menu-item"
         v-for="item in menuItems"
         :key="item.label"
         :class="{ 'disabled': item.disabled }"
         @click="!item.disabled && handleSelect(item.label)">
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {writeImage} from "@tauri-apps/plugin-clipboard-manager";
import {Image} from "@tauri-apps/api/image";
import {Windows,} from '@/windows/create'
import {emit, listen} from "@tauri-apps/api/event";
// 禁用默认右键菜单
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});
const NewWindows = new Windows()
// 从url中获取截图路径和label /#/fixed_menu?path=xxx&label=xxx
const hash = window.location.hash // 获取 #/fixed_menu?path=xxx&label=xxx
const params = new URLSearchParams(hash.split('?')[1]) // 分割获取参数部分
const image_path: any = ref(params.get('path'))
const label: any = ref(params.get('label'))
const is_ocr: any = ref(params.get('is_ocr') === 'true') // 获取 OCR 状态
const is_translated: any = ref(params.get('is_translated') === 'true') // 从 URL 获取翻译状态
console.log(image_path.value, label.value,'父信息')// const image_ocr: any = ref([])
// const activeIndex = ref('1')
const menuItems = [
  { 
    label: '复制', 
    handler: () => copyImage(image_path.value).then(() => NewWindows.closeWin('contextmenu')),
    disabled: false
  },
  { 
    label: '复制关闭', 
    handler: () => copyAndClose(image_path.value),
    disabled: false
  },
  { 
    label: 'OCR', 
    handler: async () => {
      const img = await readFileImage(image_path.value)
      ocr(img)
      await NewWindows.closeWin('contextmenu')
    },
    disabled: is_ocr.value // OCR 后禁用
  },
  { 
    label: '取消OCR', 
    handler: () => {
      emit('ocrImage', null)
      is_translated.value = false // 重置翻译状态
      NewWindows.closeWin('contextmenu')
    },
    disabled: !is_ocr.value // 未 OCR 时禁用
  },
  { 
    label: '翻译', 
    handler: async () => {
      await emit('translateText', '已翻译')
      is_translated.value = true
      await NewWindows.closeWin('contextmenu')
    },
    disabled: !is_ocr.value || is_translated.value // 未 OCR 或已翻译时禁用
  },
  { 
    label: '取消翻译', 
    handler: async () => {
      await emit('cancelTranslate')
      is_translated.value = false
      await NewWindows.closeWin('contextmenu')
    },
    disabled: !is_ocr.value || !is_translated.value // 未 OCR 或未翻译时禁用
  },
  { 
    label: '关闭窗口', 
    handler: async () => {
      await NewWindows.closeWin(label.value)
      await NewWindows.closeWin('contextmenu')
    },
    disabled: false
  }
]

async function readFileImage(path: string) {
  return await Image.fromPath(path)
}

// 文字识别
function ocr(img: any) {
  emit('ocrImage', img)
}

// 监听关闭窗口事件
listen('close_menu', async () => {
  console.log('监听到关闭窗口事件')
  // await NewWindows.closeWin(label.value)
  //   延迟1秒关闭窗口
  setTimeout(async () => {
    await NewWindows.closeWin('contextmenu')
    console.log('关闭窗口')
  }, 100)
})

// 监听翻译状态变化
listen('translationStatus', (event: any) => {
  is_translated.value = event.payload
  console.log('Translation status updated:', is_translated.value) // 添加日志
})

// 监听翻译事件
listen('translateText', async (event: any) => {
  is_translated.value = true
  console.log('Translation completed, status:', is_translated.value) // 添加日志
  await emit('translateText', event.payload)
})

// 使用getWin 获取父窗口是否存在,不存在则关闭子窗口
// 持续检查父窗口是否存在
onMounted(() => {
  const checkParentWindow = setInterval(async () => {
    try {
      const win = await NewWindows.getWin(label.value);
      if (!win) {
        clearInterval(checkParentWindow);
        await NewWindows.closeWin(label.value);
        await NewWindows.closeWin('contextmenu');
      }
    } catch (error) {
      console.log(error)
      alert(error);
      clearInterval(checkParentWindow);
      await NewWindows.closeWin(label.value);
      await NewWindows.closeWin('contextmenu');
    }
  }, 1000); // 每秒检查一次

  // 延迟显示菜单,等待完全加载
  setTimeout(() => {
    isReady.value = true
  }, 100)
});


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
  try {
    // 调用同步的 copyImage 函数
    copyImage(path);

    // 等待第一个窗口关闭
    await NewWindows.closeWin(label.value);

    // 等待第二个窗口关闭
    await NewWindows.closeWin('contextmenu');
  } catch (error) {
    console.error("Error occurred during copy and close operations:", error);
    // 可以在这里处理错误，例如重新尝试或记录日志
  }
};
const handleSelect = (index: string) => {
  const item = menuItems.find(item => item.label === index)
  if (item?.handler) {
    item.handler()
  }
}

const isReady = ref(false)
</script>

<style>

:root {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.v3-context-menu {
  min-width: 120px;
  background: #2b2b2b;
  border-radius: 5px;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.2);
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.1s ease-out;
}

.menu-show {
  opacity: 1;
  transform: scale(1);
}

.v3-context-menu-item {
  padding: 6px 14px;
  font-size: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #e1e1e1;
  transition: all 0.1s;
  background: #2b2b2b;
  user-select: none;
  min-height: 22px;
}

.v3-context-menu-item:hover {
  background: #0063e1; /* macOS 风格的蓝色 */
  color: #ffffff;
}

.v3-context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #888;
}

.v3-context-menu-item.disabled:hover {
  background: #2b2b2b; /* 禁用时不显示悬停效果 */
}
</style>