<script setup lang="ts">
import {Windows,} from '@/windows/create'

// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')
console.log('截图路径', path)

const win = new Windows()
const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault(); // 阻止默认的右键菜单
  console.log('开始截图', e);
  if (e.button === 2) {  // 2 表示右键点击
    console.log('关闭截图窗口');
    await win.closeWin('fixed');
    document.removeEventListener('contextmenu', handleContextMenu); // 移除事件监听
  }
};

document.addEventListener('contextmenu', handleContextMenu); // 监听右键点击事件

</script>
<template>
<!--  <div class="screenshot-container">-->
      <img :src="path" alt="Screenshot">
<!--    </div>-->

</template>

<style scoped>
/* 重置所有默认样式 */
:root {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}


img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 确保图片覆盖整个容器 */
  object-position: center center;
  /* 图片居中 */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

}

.screenshot-container {
  display: flex;
  justify-content: center;
  overflow: hidden !important; /* 禁用滚动 */
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}
</style>