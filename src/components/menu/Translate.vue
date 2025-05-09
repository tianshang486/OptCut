<template>
  <div class="bg-gray-600 p-6 rounded-lg shadow-lg space-y-6">
    <h2 class="text-xl font-semibold mb-4 text-gray-200">翻译设置</h2>

    <!-- 百度翻译配置 -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-3 text-gray-300">百度翻译配置</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-gray-300 mb-1">App ID</label>
          <input
              v-model="baiduAppId"
              type="password"
              class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-gray-300 mb-1">Secret Key</label>
          <input
              v-model="baiduSecretKey"
              type="password"
              class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="flex justify-between items-center pt-2">
          <div class="space-x-2">
            <button
                @click="testBaiduConfig"
                :disabled="!baiduAppId || !baiduSecretKey"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors disabled:opacity-50"
            >
              测试配置
            </button>
            <button
                @click="saveBaiduConfig"
                :disabled="!baiduConfigTested || !baiduAppId || !baiduSecretKey"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors disabled:opacity-50"
            >
              保存配置
            </button>
          </div>
          <div class="text-sm">
            <span v-if="baiduConfigTested" class="text-green-400">✓ 配置有效</span>
            <span v-else class="text-yellow-400">! 请先测试配置</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { queryAuth } from '@/utils/dbsql';
import { testBaiduConfigApi, saveBaiduConfigApi } from '@/utils/translate';

// 百度翻译配置
const baiduAppId = ref('');
const baiduSecretKey = ref('');
const baiduConfigTested = ref(false);

// 初始化配置
const initConfig = async () => {
  const [baiduAppIdResult, baiduSecretKeyResult, translateEnabledResult] = await Promise.all([
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'baidu_app_id'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'baidu_secret_key'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_enabled'"),
  ]) as { config_value: string }[][];

  baiduAppId.value = baiduAppIdResult[0]?.config_value || '';
  baiduSecretKey.value = baiduSecretKeyResult[0]?.config_value || '';
  baiduConfigTested.value = translateEnabledResult[0]?.config_value === 'true' || false;
};

// 测试百度翻译配置
const testBaiduConfig = async () => {
  try {
    const result = await testBaiduConfigApi(baiduAppId.value, baiduSecretKey.value);
    console.log(result)
    baiduConfigTested.value = result;

    if (result) {
      alert('百度翻译配置测试成功！');
    } else {
      alert('百度翻译配置测试失败，请检查 App ID 和 Secret Key 是否正确。');
    }
  } catch (error) {
    console.error('测试百度翻译配置失败:', error);
    alert('测试百度翻译配置失败: ' + error);
    baiduConfigTested.value = false;
  }
};

// 保存百度翻译配置
const saveBaiduConfig = async () => {
  try {
    if (!baiduConfigTested.value) {
      alert('请先测试配置！');
      return;
    }
    if (!baiduAppId.value || !baiduSecretKey.value) {
      alert('请填写完整的配置信息！');
      return;
    }

    await saveBaiduConfigApi(baiduAppId.value, baiduSecretKey.value, true);
    // 更新translate_enabled状态为true

    alert('百度翻译配置保存成功！');
  } catch (error) {
    console.error('保存百度翻译配置失败:', error);
    alert('保存百度翻译配置失败: ' + error);
  }
};

// 初始化
initConfig();
</script>