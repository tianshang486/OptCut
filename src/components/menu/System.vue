<template>
  <div class="bg-gray-600 p-6 rounded-lg shadow-lg">
    <h2 class="text-xl font-semibold mb-4 text-gray-200">{{ $t('settings.title') }}</h2>
    
    <!-- 自启动设置 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <label class="flex items-center space-x-3">
        <input type="checkbox" v-model="autoStart" class="form-checkbox h-5 w-5 text-blue-600 rounded" />
        <span class="text-gray-300">{{ $t('settings.autoStart') }}</span>
      </label>
      <p class="text-sm text-gray-400 mt-1">{{ $t('settings.autoStartDescription') }}</p>
    </div>

    <!-- 界面语言设置 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <label class="block text-gray-300 mb-2">{{ $t('settings.language') }}</label>
      <select v-model="language" class="w-full p-2 bg-gray-900 border border-gray-700 rounded text-gray-200 focus:border-blue-500 focus:outline-none">
        <option value="zh-CN">简体中文</option>
        <option value="en">English</option>
      </select>
      <p class="text-sm text-gray-400 mt-1">{{ $t('settings.languageDescription') }}</p>
    </div>

    <!-- 更新检查 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <button @click="checkForUpdates" class="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-gray-200 transition-colors">
        {{ $t('settings.checkUpdates') }}
      </button>
      <p v-if="updateStatus" class="text-sm mt-2" :class="{'text-green-400': updateStatus === $t('settings.updateStatus.latest'), 'text-yellow-400': updateStatus === $t('settings.updateStatus.newVersion')}">
        {{ updateStatus }}
      </p>
      <p v-else class="text-sm text-gray-400 mt-1">{{ $t('settings.version') }}: {{ version }}</p>
    </div>

    <!-- 版本号 -->
<!--    <div class="mt-6 p-4 bg-gray-800 rounded-lg">-->
<!--      <p class="text-sm text-gray-400">{{ $t('settings.version') }}: {{ version }}</p>-->
<!--    </div>-->
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { queryAuth, updateAuth } from '@/windows/dbsql';

const { locale, t } = useI18n();

// 自启动状态
const autoStart = ref(false);

// 界面语言
const language = ref(locale.value);

// 更新检查状态
const updateStatus = ref('');

// 版本号
const version = ref('1.0.0');

// 检查更新函数
const checkForUpdates = async () => {
  updateStatus.value = t('settings.updateStatus.checking');

  try {
    // 获取当前版本号
    const currentVersionResult = await queryAuth(
      'system_config', 
      "SELECT config_value FROM system_config WHERE config_key = 'version'"
    ) as { config_value: string }[];
    const currentVersion = currentVersionResult[0]?.config_value || '1.0.0';

    // 从 GitHub 获取最新版本信息
    const response = await fetch('https://raw.githubusercontent.com/yourusername/yourrepo/main/version.json');
    const latestVersionInfo = await response.json();

    // 比较版本号
    if (latestVersionInfo.version > currentVersion) {
      updateStatus.value = t('settings.updateStatus.newVersion');
      // 弹窗提示用户下载更新
      if (confirm(`发现新版本 ${latestVersionInfo.version}，是否前往下载？`)) {
        window.open(latestVersionInfo.download_url, '_blank');
      }
    } else {
      updateStatus.value = t('settings.updateStatus.latest');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    updateStatus.value = '检查更新失败';
  }
};

// 监听语言切换
watch(language, async (newLang) => {
  locale.value = newLang;
  // 更新数据库中的语言配置
  await updateAuth('system_config', { config_value: newLang }, { config_key: 'language' });
});

// 初始化时加载语言配置
(async () => {
  const result = await queryAuth(
    'system_config', 
    "SELECT config_value FROM system_config WHERE config_key = 'language'"
  ) as { config_value: string }[];
  if (result[0]?.config_value) {
    language.value = result[0].config_value;
    locale.value = result[0].config_value;
  }
})();
</script>

<style scoped>
/* 自定义样式 */
.form-checkbox:checked {
  background-color: #3b82f6;
}
</style> 