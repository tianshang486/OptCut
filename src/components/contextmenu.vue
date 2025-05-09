<template>
  <div v-if="isReady" class="v3-context-menu" :class="{ 'menu-show': isReady }">
    <div v-for="item in menuItems" :key="item.label">
      <!-- 普通菜单项 -->
      <div v-if="!item.children"
           class="v3-context-menu-item"
           :class="{ 'disabled': item.disabled }"
           @click="!item.disabled && handleSelect(item.label)">
        <span>{{ item.label }}</span>
      </div>
      <!-- 子菜单项 -->
      <div v-else class="v3-context-submenu" :class="{ 'disabled': item.disabled }">
        <div class="v3-context-menu-item submenu-trigger">
          <span>{{ item.label }}</span>
          <span class="submenu-arrow">▶</span>
        </div>
        <div class="submenu-content">
          <div v-for="child in item.children"
               :key="child.label"
               class="v3-context-menu-item"
               @click="child.handler">
            <span>{{ child.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {Image} from "@tauri-apps/api/image";
import {Windows,} from '@/windows/create'
import {emit, listen} from "@tauri-apps/api/event";
import { updateAuth } from '@/utils/dbsql';
import { translateTheText } from '@/utils/translate';

// 定义菜单项类型
interface MenuItem {
  label: string;
  handler: (() => void) | (() => Promise<void>) | null;
  disabled: boolean;
  children?: {
    label: string;
    handler: (() => void) | (() => Promise<void>);
  }[];
}

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
const show_ocr_panel: any = ref(params.get('show_ocr_panel') === 'true') // 获取 OCR 面板显示状态
console.log(image_path.value, label.value,'父信息')// const image_ocr: any = ref([])

const menuItems: MenuItem[] = [
  { 
    label: '复制', 
    handler: async () => {
      // 使用emit向主窗口发送复制命令
      await emit('menu_copy_image', { path: image_path.value });
      await NewWindows.closeWin('contextmenu');
    },
    disabled: false
  },
  { 
    label: '复制关闭', 
    handler: async () => {
      // 使用emit向主窗口发送复制命令
      await emit('menu_copy_image', { path: image_path.value });
      // 等待第二个窗口关闭
      NewWindows.closeWin('contextmenu');
      // 等待第一个窗口关闭
      NewWindows.closeWin(label.value);
    },
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
    label: show_ocr_panel.value ? '隐藏展示栏' : '显示展示栏',
    handler: async () => {
      // 更新数据库配置
      await updateAuth('system_config', 
        { config_value: (!show_ocr_panel.value).toString() }, 
        { config_key: 'ocr_panel_visible' }
      );
      // 发送事件更新界面
      await emit('toggleOcrPanel')
      show_ocr_panel.value = !show_ocr_panel.value
      await NewWindows.closeWin('contextmenu')
    },
    disabled: !is_ocr.value // 未 OCR 时禁用
  },
  { 
    label: '翻译', 
    handler: async () => {
      await translateTheText()
      is_translated.value = true;
      await NewWindows.closeWin('contextmenu');
    },
    disabled: !is_ocr.value || is_translated.value // 未 OCR 或已翻译时禁用
  },
  { 
    label: '翻译设置', 
    handler: async () => {
      const sourceLabel = label.value;
      const currentWindow = await NewWindows.getWin(sourceLabel);
      let x = 100;
      let y = 100;
      
      // 获取当前窗口位置设置翻译窗口位置
      if (currentWindow) {
        const position = await currentWindow.outerPosition();
        x = position.x;
        y = position.y - 40; // 设置在窗口顶部上方
        
        // 重要：监听窗口关闭事件
        await currentWindow.onCloseRequested(async () => {
          await NewWindows.closeWin('translate_settings');
        });
      }
      
      await NewWindows.createWin({
        label: 'translate_settings',
        url: `/#/translate-settings?sourceLabel=${sourceLabel}`,
        width: 240,
        height: 40,
        x: x,
        y: y,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
      }, {});
      
      await NewWindows.closeWin('contextmenu');
    },
    disabled: false
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
      await NewWindows.closeWin('translate_settings')
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
  font-family: inherit;
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
  font-family: inherit;
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

/* 添加子菜单样式 */
.v3-context-submenu {
  position: relative;
}

.submenu-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 24px;
}

.submenu-arrow {
  font-size: 10px;
  margin-left: 8px;
}

.submenu-content {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 120px;
  background: #2b2b2b;
  border-radius: 5px;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.2);
  display: none;
}

.v3-context-submenu:hover > .submenu-content {
  display: block;
}

.v3-context-submenu.disabled > .submenu-trigger {
  opacity: 0.5;
  cursor: not-allowed;
  color: #888;
}

.v3-context-submenu.disabled:hover > .submenu-content {
  display: none;
}
</style>