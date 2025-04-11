<template>
  <div class="bg-gray-600 p-6 rounded-lg shadow-lg space-y-6">
    <h2 class="text-xl font-semibold mb-4 text-gray-200">OCR 设置</h2>

    <!-- OCR 模式选择 -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-3 text-gray-300">OCR 模式</h3>
      <select v-model="ocrMode" class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none">
        <option value="offline">离线模式</option>
        <option value="online">在线模式</option>
      </select>
      <p class="text-sm text-gray-400 mt-1">选择 OCR 工作模式，在线模式需要配置相应的服务</p>
    </div>

    <!-- OCR 面板设置 -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-3 text-gray-300">OCR 面板设置</h3>
      <div class="flex items-center justify-between">
        <span class="text-gray-300">默认显示 OCR 结果面板</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="ocrPanelVisible" class="sr-only peer" @change="updateOcrPanelVisibility">
          <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer 
                      peer-checked:after:translate-x-full peer-checked:after:border-white 
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                      after:bg-white after:border-gray-300 after:border after:rounded-full 
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      <p class="text-sm text-gray-400 mt-1">控制 OCR 识别后是否自动显示结果面板</p>
    </div>

    <!-- 离线 OCR 设置 -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-3 text-gray-300">离线 OCR 设置</h3>
      <div class="mb-2">
        <label class="block text-gray-300 mb-2">OCR 引擎</label>
        <select 
          v-model="ocrEngine" 
          :disabled="ocrMode === 'online'"
          class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="RapidOCR">RapidOCR</option>
          <option value="PaddleOCR">PaddleOCR</option>
        </select>
        <p class="text-sm text-gray-400 mt-1">选择本地 OCR 引擎</p>
      </div>
    </div>

    <!-- 在线 OCR 服务配置 -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-3 text-gray-300">在线 OCR 服务配置</h3>
      
      <!-- 服务选择 -->
      <div class="mb-4">
        <label class="block text-gray-300 mb-2">服务提供商</label>
        <select 
          v-model="onlineService"
          :disabled="ocrMode === 'offline'"
          class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="tencent">腾讯云 OCR</option>
        </select>
      </div>

      <!-- 腾讯云配置 -->
      <div v-if="onlineService === 'tencent'" class="space-y-3">
        <div>
          <label class="block text-gray-300 mb-1">SecretId</label>
          <input 
            v-model="tencentSecretId" 
            :disabled="ocrMode === 'offline'"
            type="password"
            class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-gray-300 mb-1">SecretKey</label>
          <input 
            v-model="tencentSecretKey" 
            :disabled="ocrMode === 'offline'"
            type="password"
            class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <!-- 测试和保存按钮 -->
        <div class="flex justify-between items-center pt-2">
          <div class="space-x-2">
            <button 
              @click="testTencentConfig"
              :disabled="ocrMode === 'offline' || !tencentSecretId || !tencentSecretKey"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors disabled:opacity-50"
            >
              测试配置
            </button>
            <button 
              @click="saveOnlineConfig"
              :disabled="!configTested || !tencentSecretId || !tencentSecretKey"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors disabled:opacity-50"
            >
              保存配置
            </button>
          </div>
          <div class="text-sm">
            <span v-if="configTested" class="text-green-400">✓ 配置有效</span>
            <span v-else-if="ocrMode === 'online'" class="text-yellow-400">! 请先测试配置</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { queryAuth, updateAuth } from '@/windows/dbsql';
import { testTencentOCR } from '@/windows/ocr';

// OCR 模式
const ocrMode = ref('offline');
// OCR 面板显示状态
const ocrPanelVisible = ref(true);
// OCR 引擎
const ocrEngine = ref('RapidOCR');
// 在线服务提供商
const onlineService = ref('tencent');
// 腾讯云配置
const tencentSecretId = ref('');
const tencentSecretKey = ref('');
const configTested = ref(false);

// 更新 OCR 面板显示状态
const updateOcrPanelVisibility = async () => {
  try {
    await updateAuth('system_config', 
      { config_value: ocrPanelVisible.value.toString() }, 
      { config_key: 'ocr_panel_visible' }
    );
  } catch (error) {
    console.error('更新 OCR 面板显示状态失败:', error);
    alert('更新设置失败: ' + error);
  }
};

// 初始化配置
const initConfig = async () => {
  const configs = await Promise.all([
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'ocr_mode'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'tencent_secret_id'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'tencent_secret_key'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'tencent_ocr_enabled'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'ocr_panel_visible'")
  ]) as { config_value: string }[][];

  ocrMode.value = configs[0][0]?.config_value || 'offline';
  ocrEngine.value = configs[1][0]?.config_value || 'RapidOCR';
  tencentSecretId.value = configs[2][0]?.config_value || '';
  tencentSecretKey.value = configs[3][0]?.config_value || '';
  configTested.value = configs[4][0]?.config_value === 'true';
  ocrPanelVisible.value = configs[5][0]?.config_value === 'true';
};

// 测试腾讯云配置
const testTencentConfig = async () => {
  try {
    const result = await testTencentOCR(tencentSecretId.value, tencentSecretKey.value);
    configTested.value = result;
    
    if (result) {
      alert('配置测试成功！');
    } else {
      alert('配置测试失败，请检查密钥是否正确。');
    }
  } catch (error) {
    console.error('测试配置失败:', error);
    alert('测试配置失败: ' + error);
    configTested.value = false;
  }
};

// 监听模式切换
watch(ocrMode, async (newMode) => {
  if (newMode === 'online') {
    if (!configTested.value) {
      alert('您已切换到在线模式，请配置并测试在线 OCR 服务后才能使用。');
      return;
    }
  }
  await updateAuth('system_config', { config_value: newMode }, { config_key: 'ocr_mode' });
});

// 监听引擎切换
watch(ocrEngine, async (newEngine) => {
  if (ocrMode.value === 'offline') {
    await updateAuth('system_config', { config_value: newEngine }, { config_key: 'ocr_engine' });
  }
});

// 监听在线服务切换
watch(onlineService, () => {
  configTested.value = false;
  if (ocrMode.value === 'online') {
    ocrMode.value = 'offline';
    alert('切换服务提供商需要重新测试配置，已切换回离线模式');
  }
});

// 保存在线配置
const saveOnlineConfig = async () => {
  try {
    if (!configTested) {
      alert('请先测试配置！');
      return;
    }
    if (!tencentSecretId.value || !tencentSecretKey.value) {
      alert('请填写完整的配置信息！');
      return;
    }

    await Promise.all([
      updateAuth('system_config', { config_value: tencentSecretId.value }, { config_key: 'tencent_secret_id' }),
      updateAuth('system_config', { config_value: tencentSecretKey.value }, { config_key: 'tencent_secret_key' }),
      updateAuth('system_config', { config_value: configTested.value.toString() }, { config_key: 'tencent_ocr_enabled' })
    ]);

    alert('在线配置保存成功！');
  } catch (error) {
    console.error('保存配置失败:', error);
    alert('保存配置失败: ' + error);
  }
};

// 初始化
initConfig();
</script> 