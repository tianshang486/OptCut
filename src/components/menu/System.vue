<template>
  <div class="bg-gray-600 p-6 rounded-lg shadow-lg">
    <h2 class="text-xl font-semibold mb-4 text-gray-200">{{ $t('settings.title') }}</h2>

    <!-- 自启动设置 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <label class="flex items-center space-x-3">
        <input
            type="checkbox"
            v-model="autoStart"
            :disabled="isProcessing"
            class="form-checkbox h-5 w-5 text-blue-600 rounded"
        />
        <span class="text-gray-300">{{ $t('settings.autoStart') }}</span>
        <span v-if="isProcessing" class="ml-2 text-gray-400">
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
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

    <!-- 字体设置 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <label class="block text-gray-300 mb-2">{{ $t('settings.font') }}</label>
      <div class="space-y-3">
        <!-- 搜索框 -->
        <div class="relative">
          <input
            v-model="fontSearch"
            type="text"
            class="w-full h-10 pl-10 pr-4 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
            :placeholder="$t('settings.fontSearchPlaceholder')"
          />
          <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>

        <!-- 字体列表 -->
        <div class="relative">
          <div class="max-h-96 overflow-y-auto custom-scrollbar bg-gray-900 rounded-lg border border-gray-700">
            <!-- 系统默认字体选项 -->
            <div 
              class="p-3 cursor-pointer hover:bg-gray-800 transition-colors border-b border-gray-700"
              :class="{'bg-blue-600 hover:bg-blue-700': selectedFont === 'default'}"
              @click="selectedFont = 'default'; handleFontChange()"
            >
              <div class="flex items-center justify-between">
                <span class="text-gray-200">{{ $t('settings.defaultFont') }}</span>
                <svg v-if="selectedFont === 'default'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <!-- 系统字体列表 -->
            <div v-for="font in filteredFonts" 
              :key="font.name" 
              class="p-3 cursor-pointer hover:bg-gray-800 transition-colors border-b border-gray-700 last:border-b-0"
              :class="{'bg-blue-600 hover:bg-blue-700': selectedFont === font.name}"
              @click="selectedFont = font.name; handleFontChange()"
            >
              <div class="flex items-center justify-between">
                <span class="text-gray-200">{{ font.name }}</span>
                <svg v-if="selectedFont === font.name" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="mt-1 text-sm text-gray-400">
                <span class="font-preview" :style="{ fontFamily: font.name + ' !important' }">AaBbCc 123 测试文本</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="text-sm text-gray-400 mt-3">{{ $t('settings.fontDescription') }}</p>
    </div>

    <!-- 更新检查 -->
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <button @click="checkForUpdates" class="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-gray-200 transition-colors">
        {{ $t('settings.checkUpdates') }}
      </button>
      <p v-if="updateStatus" class="text-sm mt-2" :class="{'text-green-400': updateStatus === $t('settings.updateStatus.latest'), 'text-yellow-400': updateStatus === $t('settings.updateStatus.newVersion')}">
        {{ updateStatus }}
      </p>
    </div>

    <!-- 版本号 -->
    <!--    <div class="mt-6 p-4 bg-gray-800 rounded-lg">-->
    <!--      <p class="text-sm text-gray-400">{{ $t('settings.version') }}: {{ version }}</p>-->
    <!--    </div>-->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { queryAuth, updateAuth,  } from '@/utils/dbsql';
import { invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { getVersion } from '@tauri-apps/api/app';
import { confirm } from '@tauri-apps/plugin-dialog';

interface FontInfo {
  name: string;
  is_system: boolean;
}

const { locale, t } = useI18n();

// 自启动状态
const autoStart = ref(false);
const isProcessing = ref(false);

// 界面语言
const language = ref(locale.value);

// 更新检查状态
const updateStatus = ref('');


// 字体搜索和过滤
const fontSearch = ref('');
const systemFonts = ref<FontInfo[]>([]);
const selectedFont = ref('default');

// 在 script setup 部分，watch selectedFont 之前添加这个新方法
const scrollToSelectedFont = () => {
  setTimeout(() => {
    const selectedElement = document.querySelector('.bg-blue-600');
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
};

// 加载系统字体
const loadSystemFonts = async () => {
  try {
    // 使用 font-kit 获取系统字体
    systemFonts.value = await invoke('get_system_fonts');

    // 从系统配置表加载用户设置的字体
    const result = await queryAuth(
        'system_config',
        "SELECT config_value FROM system_config WHERE config_key = 'font'"
    ) as { config_value: string }[];

    if (result[0]?.config_value) {
      const savedFont = result[0].config_value;
      if (savedFont.includes('system-ui')) {
        selectedFont.value = 'default';
      } else {
        // 移除引号，获取实际字体名称
        selectedFont.value = savedFont.replace(/['"]/g, '');
      }
      applyFont(selectedFont.value);
      // 添加滚动到选中字体的调用
      scrollToSelectedFont();
    }
  } catch (error) {
    console.error('加载系统字体失败:', error);
  }
};


// 应用字体
const applyFont = (fontName: string) => {
  const fontValue = fontName === 'default'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'
    : fontName;

  document.documentElement.style.setProperty('--custom-font', fontValue);
  return fontValue;
};

// 处理字体变更
const handleFontChange = async () => {
  try {
    const fontValue = applyFont(selectedFont.value);
    await updateAuth(
        'system_config',
        { config_value: fontValue },
        { config_key: 'font' }
    );
  } catch (error) {
    console.error('更新字体设置失败:', error);
  }
};

// 监听自启动状态变化
watch(autoStart, async (newValue) => {
  try {
    // 更新系统状态
    if (newValue) {
      await enable();
    } else {
      await disable();
    }

    // 更新数据库
    const result = await updateAuth(
        'system_config',
        { config_value: newValue.toString() },
        { config_key: 'autostart' }
    );
    console.log('数据库更新结果:', result);
  } catch (error) {
    console.error('更新自启动状态失败:', error);
    // 如果失败，恢复到实际的系统状态
    try {
      const currentStatus = await isEnabled();
      autoStart.value = currentStatus;
      // 同步数据库状态
      await updateAuth(
          'system_config',
          { config_value: currentStatus.toString() },
          { config_key: 'autostart' }
      );
    } catch (syncError) {
      console.error('同步状态失败:', syncError);
    }
  }
});

// 加载自启动状态
const loadAutoStartStatus = async () => {
  try {
    // 从数据库加载状态
    const result = await queryAuth(
        'system_config',
        "SELECT config_value FROM system_config WHERE config_key = 'autostart'"
    ) as { config_value: string }[];

    console.log('数据库中的自启动状态:', result);

    // 获取系统实际状态
    const systemStatus = await isEnabled();
    console.log('系统实际的自启动状态:', systemStatus);

    // 如果数据库状态与系统状态不一致，以系统状态为准
    if (result[0]?.config_value !== systemStatus.toString()) {
      console.log('状态不一致，更新数据库...');
      await updateAuth(
          'system_config',
          { config_value: systemStatus.toString() },
          { config_key: 'autostart' }
      );
    }

    autoStart.value = systemStatus;
  } catch (error) {
    console.error('加载自启动状态失败:', error);
  }
};

// 在组件挂载时加载状态
onMounted(async () => {
  await Promise.all([
    loadAutoStartStatus(),
    loadSystemFonts()
  ]);
});

// 监听字体变化
watch(selectedFont, (newFont) => {
  if (newFont) {
    handleFontChange();
  }
});

// 检查更新函数
const checkForUpdates = async () => {
  updateStatus.value = t('settings.updateStatus.checking');

  try {
    // 获取当前应用版本号
    const currentVersion = await getVersion();
    console.log('当前应用版本:', currentVersion);

    // 从 GitHub 获取最新版本信息
    const response = await fetch('https://raw.githubusercontent.com/tianshang486/OPT_OUT_UPDATE/main/main.json');
    const latestVersionInfo = await response.json();
    console.log('远程版本信息:', latestVersionInfo);

    // 比较版本号
    if (latestVersionInfo.version !== currentVersion) {
      console.log('检测到新版本');
      updateStatus.value = t('settings.updateStatus.newVersion');


      const downloadUrl = latestVersionInfo.download_url;
      // 创建弹窗提示用户下载更新,点击确认才跳转浏览器
      const confirmed = await confirm(
          `发现新版本 ${latestVersionInfo.version}，是否前往下载？`,
          {
            title: '发现新版本',
          }
      );
      if (confirmed) {
        window.open(downloadUrl, '_blank');
      }

    } else {
      console.log('已是最新版本');
      updateStatus.value = t('settings.updateStatus.latest');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    updateStatus.value = t('settings.updateStatus.failed');
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

// 优化的字体过滤逻辑
const filteredFonts = computed(() => {
  const search = fontSearch.value.trim().toLowerCase();
  if (!search) return systemFonts.value;

  return systemFonts.value.filter(font => {
    const name = font.name.toLowerCase();
    return name.includes(search) ||
        font.name.split(' ').some(word => word.toLowerCase().startsWith(search));
  });
});
</script>

<style scoped>
/* 自定义样式 */
.form-checkbox:checked {
  background-color: #3b82f6;
}


/* 字体预览样式 */
.font-preview {
  font-family: inherit !important;
}
</style> 