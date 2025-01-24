<script setup lang="ts">
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {captureScreenshot} from '@/windows/screenshot.ts'
import {ref} from "vue";
import {queryAuth} from "@/windows/dbsql"

const image_path = ref("");
const greetMsg = ref("");
const currentMenu = ref('test'); // 默认显示test菜单

// 菜单切换函数
const switchMenu = (menu: string) => {
  currentMenu.value = menu;
};

// Open a dialog
async function openDialog() {
  const file: Array<string> | null = await open({
    multiple: true,
    directory: false,
  });
  console.log(file);
  if (!file) return;
  image_path.value = file.join(", ");
  greetMsg.value = await invoke("greet", {image_path: image_path.value});
  await invoke("capture_screen",);
}
// @ts-ignore
const imgurl: any = ref('');

// 删除临时图片
async function removeImg() {
  await invoke("delete_temp_file",);
}

// 测试paddocr
async function ps_ocr_pd() {
  const result = await invoke("ps_ocr_pd", {image_path: "D:\\CodeProject\\OptCut\\src-tauri\\tools\\img.png"});
  console.log(result);

}
async function query_database_info() {
  const result = await invoke("query_database_info", );
  console.log(result);

}


// 弹窗提升配置文件
// @ts-ignore
async function read_conf_file() {
  try {
    const result = await invoke('read_config');
    console.log('Config result:', result);
  } catch (error) {
    console.error('Error reading config:', error);
  }
}

// 查看窗口池
// @ts-ignore
const logWindowPool = () => {
  const windowPool = queryAuth('windowPool');
  console.log(windowPool);
}

</script>

<template>
  <div class="flex h-screen bg-gray-900 text-gray-200">
    <!-- 左侧菜单 -->
    <div class="w-1/6 bg-gray-800 p-1">
      <h2 class="text-lg font-bold mb-4">系统</h2>
      <ul class="menu list-none p-0">
        <li>
          <a >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            header
          </a>
        </li>
        <li>
          <a>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            convention
          </a>
        </li>
        <li>
          <a>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            shortcutKey
          </a>
        </li>
        <li @click="switchMenu('test')">
          <a>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            test
          </a>
        </li>
      </ul>
    </div>

    <!-- 右侧内容 -->
    <div class="w-5/6 p-4 bg-gray-700 ">
      <h1 class="text-2xl font-bold mb-4 ">测试功能区</h1>
<!--      <p class="mb-4">测试功能区。</p>-->
      <div class="bg-gray-600 p-4 rounded shadow space-x-1">
        <h2 class="text-xl font-semibold">示例内容 1</h2>
        <button class="btn btn-info" @click="() => captureScreenshot()">
          <span class="button-title">截图</span>
<!--          <span class="button-desc">捕获当前屏幕内容</span>-->
        </button>
        <button class="btn btn-info" @click="openDialog">
          <span class="button-title">打开文件</span>
<!--          <span class="button-desc">选择并打开本地文件</span>-->
        </button>
        <button class="btn btn-info" @click="removeImg">
          <span class="button-title">删除图片</span>
<!--          <span class="button-desc">清理临时图片文件</span>-->
        </button>
        <button class="btn btn-info" @click="ps_ocr_pd">
          <span class="button-title">测试paddocr</span>
          <!--          <span class="button-desc">清理临时图片文件</span>-->
        </button>
        <button class="btn btn-info" @click="query_database_info">
          <span class="button-title">测试rust数据查询</span>
          <!--          <span class="button-desc">清理临时图片文件</span>-->
        </button>

      </div>
<!--      <p>这是第一个示例内容的描述。</p>-->
      <div class="bg-gray-600 p-4 rounded shadow mt-4">
        <h2 class="text-xl font-semibold">示例内容 2</h2>
        <p>这是第二个示例内容的描述。</p>
      </div>
    </div>
  </div>
<!--    &lt;!&ndash; 左侧导航菜单 &ndash;&gt;-->
<!--    <div class="nav-menu">-->
<!--      <div class="menu-item"-->
<!--           :class="{ active: currentMenu === 'header' }"-->
<!--           @click="switchMenu('header')">header-->
<!--      </div>-->
<!--      <div class="menu-item"-->
<!--           :class="{ active: currentMenu === 'convention' }"-->
<!--           @click="switchMenu('convention')">convention-->
<!--      </div>-->
<!--      <div class="menu-item"-->
<!--           :class="{ active: currentMenu === 'shortcutKey' }"-->
<!--           @click="switchMenu('shortcutKey')">shortcutKey-->
<!--      </div>-->
<!--      <div class="menu-item"-->
<!--           :class="{ active: currentMenu === 'test' }"-->
<!--           @click="switchMenu('test')">test-->
<!--      </div>-->
<!--    </div>-->

<!--    &lt;!&ndash; 右侧内容区 &ndash;&gt;-->
<!--    <div class="content-area">-->
<!--      <div v-if="currentMenu === 'test'">-->
<!--        <div class="content-header">-->
<!--          <h2>测试功能区</h2>-->
<!--          <span class="subtitle">用于测试各项功能是否正常</span>-->
<!--        </div>-->

<!--        <div class="section-container">-->
<!--          <div class="section-group">-->
<!--            <div class="section-title">基础功能</div>-->
<!--            <button class="setting-button" @click="() => captureScreenshot()">-->
<!--              <span class="button-title">截图</span>-->
<!--              <span class="button-desc">捕获当前屏幕内容</span>-->
<!--            </button>-->
<!--            <button class="setting-button" @click="openDialog">-->
<!--              <span class="button-title">打开文件</span>-->
<!--              <span class="button-desc">选择并打开本地文件</span>-->
<!--            </button>-->
<!--            <button class="setting-button" @click="removeImg">-->
<!--              <span class="button-title">删除图片</span>-->
<!--              <span class="button-desc">清理临时图片文件</span>-->
<!--            </button>-->
<!--          </div>-->

<!--          <div class="section-group">-->
<!--            <div class="section-title">系统功能</div>-->
<!--            <button class="setting-button" @click="() => tray_close()">-->
<!--              <span class="button-title">关闭托盘</span>-->
<!--              <span class="button-desc">关闭系统托盘图标</span>-->
<!--            </button>-->
<!--            <button class="setting-button" @click="() => read_conf_file()">-->
<!--              <span class="button-title">测试配置</span>-->
<!--              <span class="button-desc">读取系统配置文件</span>-->
<!--            </button>-->
<!--            <button class="setting-button" @click="logWindowPool">-->
<!--              <span class="button-title">查看窗口池</span>-->
<!--              <span class="button-desc">显示当前窗口池状态</span>-->
<!--            </button>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
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