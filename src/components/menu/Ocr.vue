<template>
  <div class="bg-gray-600 p-6 rounded-lg shadow-lg">
    <h2 class="text-xl font-semibold mb-4 text-gray-200">{{ $t('settings.title') }}</h2>

    <!-- OCR 引擎设置 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <label class="block text-gray-300 mb-2">OCR 引擎</label>
      <select v-model="ocrEngine" class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none">
        <option value="RapidOCR">RapidOCR</option>
        <option value="PaddleOCR">PaddleOCR</option>
      </select>
      <p class="text-sm text-gray-400 mt-1">选择当前使用的 OCR 引擎。</p>
    </div>

    <!-- 其他设置项... -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { queryAuth, updateAuth } from '@/windows/dbsql';

const { locale, t } = useI18n();

// OCR 引擎
const ocrEngine = ref('RapidOCR');

// 初始化时加载 OCR 配置
(async () => {
  const result = await queryAuth(
      'system_config',
      "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"
  ) as { config_value: string }[];
  if (result[0]?.config_value) {
    ocrEngine.value = result[0].config_value;
  }
})();

// 监听 OCR 引擎切换
watch(ocrEngine, async (newEngine) => {
  await updateAuth('system_config', { config_value: newEngine }, { config_key: 'ocr_engine' });
});
</script> 