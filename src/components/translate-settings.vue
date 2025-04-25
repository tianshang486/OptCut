<template>
    <div class="translate-settings bg-gray-700 rounded shadow-lg p-1">
      <div class="flex items-center gap-2">
        <select v-model="fromLang" @change="updateFrom" class="select select-sm bg-gray-700 text-white border-none">
          <option value="auto">自动检测</option>
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="jp">日语</option>
          <option value="kor">韩语</option>
          <option value="fra">法语</option>
          <option value="spa">西班牙语</option>
          <option value="ru">俄语</option>
          <option value="de">德语</option>
        </select>
        <span class="text-white">→</span>
        <select v-model="toLang" @change="updateTo" class="select select-sm bg-gray-700 text-white border-none">
          <option value="auto">自动检测</option>
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="jp">日语</option>
          <option value="kor">韩语</option>
          <option value="fra">法语</option>
          <option value="spa">西班牙语</option>
          <option value="ru">俄语</option>
          <option value="de">德语</option>
        </select>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { updateAuth, queryAuth } from '@/windows/dbsql';
import { emit } from '@tauri-apps/api/event';
import { Windows } from '@/windows/create';

const NewWindows = new Windows();
const fromLang = ref('auto');
const toLang = ref('zh');

// 从数据库加载配置
async function loadConfig() {
  try {
    const [fromResult, toResult] = await Promise.all([
      queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_from'"),
      queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_to'")
    ]);

    if (fromResult[0]?.config_value) {
      fromLang.value = fromResult[0].config_value;
    }

    if (toResult[0]?.config_value) {
      toLang.value = toResult[0].config_value;
    }
  } catch (error) {
    console.error('加载翻译配置失败:', error);
  }
}

onMounted(async () => {
  await loadConfig();
  
  // 添加双击关闭窗口事件
  document.addEventListener('dblclick', handleDoubleClick);
});

const updateFrom = async () => {
  try {
    await updateAuth('system_config', { config_value: fromLang.value }, { config_key: 'translate_from' });
    await emit('updateTranslationConfig', { from: fromLang.value });
  } catch (error) {
    console.error('更新源语言配置失败:', error);
  }
};

const updateTo = async () => {
  try {
    await updateAuth('system_config', { config_value: toLang.value }, { config_key: 'translate_to' });
    await emit('updateTranslationConfig', { to: toLang.value });
  } catch (error) {
    console.error('更新目标语言配置失败:', error);
  }
};

// 双击关闭窗口
const handleDoubleClick = (e: MouseEvent) => {
  // 如果双击的是下拉框，不关闭窗口
  if ((e.target as HTMLElement).closest('.select')) return;
  NewWindows.closeWin('translate_settings');
};

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('dblclick', handleDoubleClick);
});
</script>

<style>
:root, html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
}

.translate-settings {
  width: 100%;
  box-sizing: border-box;
}

.select {
  min-width: 100px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style> 