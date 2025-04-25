<template>
  <div class="bg-gray-600 p-4 rounded shadow">
    <h2 class="text-xl font-semibold mb-4">快捷键设置</h2>
    
    <div class="space-y-4">
      <!-- 快捷键配置表单 -->
      <div v-for="(_, key) in shortcuts" :key="key" 
           class="flex items-center space-x-4 p-2 bg-gray-700 rounded">
        <div class="w-1/3">
          <span class="text-gray-300">{{ getShortcutLabel(key as keyof Shortcuts) }}</span>
        </div>
        <div class="flex-1">
          <input type="text" 
                 :value="shortcuts[key].toUpperCase()"
                 @input="event => shortcuts[key] = (event.target as HTMLInputElement).value.toUpperCase()"
                 @keydown.stop="recordShortcut($event, key as keyof Shortcuts)"
                 :placeholder="'请按下快捷键组合'"
                 class="w-full px-3 py-2 bg-gray-800 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-gray-200" />
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-end mt-4">
        <button @click="saveShortcuts" 
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
          保存设置
        </button>
      </div>

      <!-- 提示信息 -->
      <div class="text-sm text-gray-400 mt-2">
        注意：快捷键修改后需要重启应用才能生效
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';

// 定义快捷键类型
interface Shortcuts {
  default: string;
  fixed_copy: string;
  fixed_ocr: string;
  paste_img: string;
}

// 定义标签映射类型
interface ShortcutLabels {
  default: string;
  fixed_copy: string;
  fixed_ocr: string;
  paste_img: string;
  [key: string]: string;
}

// 快捷键配置
const shortcuts = ref<Shortcuts>({
  default: '',
  fixed_copy: '',
  fixed_ocr: '',
  paste_img: ''
});

// 快捷键标签映射
const shortcutLabels: ShortcutLabels = {
  default: '默认截图',
  fixed_copy: '固定复制',
  fixed_ocr: '固定OCR',
  paste_img: '贴图',
};

// 获取快捷键显示标签
const getShortcutLabel = (key: keyof Shortcuts): string => {
  return shortcutLabels[key] || key;
};

// 读取配置
const loadShortcuts = async () => {
  try {
    const config = await invoke('read_config');
    const shortcutConfig = JSON.parse(config as string).shortcut_key;
    shortcuts.value = {
      default: shortcutConfig.default?.toUpperCase() || '',
      fixed_copy: shortcutConfig.fixed_copy?.toUpperCase() || '',
      fixed_ocr: shortcutConfig.fixed_ocr?.toUpperCase() || '',
      paste_img: shortcutConfig.paste_img?.toUpperCase() || '',
    };
  } catch (error) {
    console.error('Failed to load shortcuts:', error);
  }
};

// 记录快捷键
const recordShortcut = (event: KeyboardEvent, key: keyof Shortcuts) => {
  event.preventDefault();
  
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push('CTRL');
  if (event.altKey) modifiers.push('ALT');
  if (event.shiftKey) modifiers.push('SHIFT');
  if (event.metaKey) modifiers.push('META');
  
  const key_name = event.key.toUpperCase();
  if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key_name)) {
    modifiers.push(key_name);
  }
  
  if (modifiers.length > 0) {
    shortcuts.value[key] = modifiers.join('+');
  }
};

// 保存快捷键配置
const saveShortcuts = async () => {
  try {
    // 确保所有快捷键都是大写
    const upperShortcuts = {
      default: shortcuts.value.default.toUpperCase(),
      fixed_copy: shortcuts.value.fixed_copy.toUpperCase(),
      fixed_ocr: shortcuts.value.fixed_ocr.toUpperCase(),
      paste_img: shortcuts.value.paste_img.toUpperCase(),
    };

    await invoke('save_shortcuts', { shortcuts: upperShortcuts });

    const confirmed = await confirm(
      '快捷键设置已保存，需要重启应用才能生效。是否现在重启？',
      { 
        title: '重启提示'
      }
    );
    
    if (confirmed) {
      await invoke('restart_app');
    }
  } catch (error) {
    console.error('Failed to save shortcuts:', error);
    await message(
      `保存失败: ${error}`,
      { 
        title: '错误'
      }
    );
  }
};

// 组件加载时读取配置
onMounted(() => {
  loadShortcuts();
});
</script>

<style scoped>

</style> 