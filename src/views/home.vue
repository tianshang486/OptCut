<script setup lang="ts">

import {ref} from "vue";

import system from '@/components/menu/System.vue'
import Ocr from '@/components/menu/Ocr.vue'
import ShortcutKey from '@/components/menu/ShortcutKey.vue'
import Test from '@/components/menu/Test.vue'
import {registerShortcutsMain} from "@/windows/ShortcutRegistration";
import {onMounted} from "vue";

const currentMenu = ref('test'); // 默认显示test菜单

// 菜单切换函数
const switchMenu = (menu: string) => {
  currentMenu.value = menu;
};

onMounted(async () => {
  try {
    await registerShortcutsMain();
  } catch (error) {
    console.error('Failed to register shortcuts after page reload:', error);
  }
});
</script>

<template>
  <div class="flex h-screen bg-gray-900 text-gray-200">
    <!-- 左侧菜单 - 减小padding和间距 -->
    <div class="bg-gray-800 p-0 overflow-y-auto">
<!--      <h2 class="text-lg font-bold mb-0 text-center">系统</h2>-->
      <ul class="menu list-none p-0 space-y-1">
        <li @click="switchMenu('system')"
            :class="{ 'bg-gray-700': currentMenu === 'system' }"
            class="cursor-pointer hover:bg-gray-700 rounded p-1.5">
          <a class="flex items-center space-x-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span class="truncate">system</span>
          </a>
        </li>
        <li @click="switchMenu('Ocr')"
            :class="{ 'bg-gray-700': currentMenu === 'Ocr' }"
            class="cursor-pointer hover:bg-gray-700 rounded p-1.5">
          <a class="flex items-center space-x-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="truncate">Ocr</span>
          </a>
        </li>
        <li @click="switchMenu('shortcutKey')"
            :class="{ 'bg-gray-700': currentMenu === 'shortcutKey' }"
            class="cursor-pointer hover:bg-gray-700 rounded p-1.5">
          <a class="flex items-center space-x-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span class="truncate">shortcutKey</span>
          </a>
        </li>
        <li @click="switchMenu('test')"
            :class="{ 'bg-gray-700': currentMenu === 'test' }"
            class="cursor-pointer hover:bg-gray-700 rounded p-1.5">
          <a class="flex items-center space-x-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span class="truncate">test</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- 右侧内容 - 添加 overflow-y-auto -->
    <div class="flex-1 p-4 bg-gray-700 overflow-y-auto">
      <component :is="currentMenu === 'system' ? system :
                     currentMenu === 'Ocr' ? Ocr :
                     currentMenu === 'shortcutKey' ? ShortcutKey :
                     Test"/>
    </div>
  </div>
</template>

<style>


/* 应用级别的滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}


</style>