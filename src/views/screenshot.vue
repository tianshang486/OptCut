<script setup lang="ts">
import {Windows,} from '@/windows/create'
import {onMounted, onUnmounted, ref} from "vue";
import {PhysicalPosition} from '@tauri-apps/api/window';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";

// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')
console.log('截图路径', path)

const win: any = new Windows()
const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault(); // 阻止默认的右键菜单
  console.log('开始截图', e);
  if (e.button === 2) {  // 2 表示右键点击
    console.log('关闭截图窗口');
    await win.closeWin('screenshot');
    document.removeEventListener('contextmenu', handleContextMenu); // 移除事件监听
  }
};

document.addEventListener('contextmenu', handleContextMenu); // 监听右键点击事件

// 添加必要的响应式变量
const isDragging = ref(false)
const startPos = ref({x: 0, y: 0})
const currentPos = ref({x: 0, y: 0})
const overlayStyle = ref({})
const mouseUpPos = ref({x: 0, y: 0})
const mouseDownPos = ref({x: 0, y: 0})


const selectionStyle = ref({
  left: '0px',
  top: '0px',
  width: '0px',
  height: '0px',
  display: 'none'
})

// 添加鼠标事件处理函数
// 在 handleMouseDown 中初始化
const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  isDragging.value = true;
  startPos.value = {x: e.clientX, y: e.clientY};
  currentPos.value = {x: e.clientX, y: e.clientY};

  selectionStyle.value = {
    left: `${e.clientX}px`,
    top: `${e.clientY}px`,
    width: '0px',
    height: '0px',
    display: 'block'
  };

  // 初始化遮罩
  overlayStyle.value = {
    clipPath: 'inset(0 0 0 0)'
  };
  // 使用物理像素位置
  // 正确创建 PhysicalPosition 实例
  mouseUpPos.value = new PhysicalPosition(
      e.screenX,
      e.screenY
  )
  console.log('鼠标位置开始', mouseUpPos.value.x, mouseUpPos.value.y);
}

const handleMouseMove = async (e: MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
  currentPos.value = {x: e.clientX, y: e.clientY};
  // 计算选择框的位置和大小
  const left = Math.min(startPos.value.x, currentPos.value.x);
  const top = Math.min(startPos.value.y, currentPos.value.y);
  const width = Math.abs(currentPos.value.x - startPos.value.x);
  const height = Math.abs(currentPos.value.y - startPos.value.y);

  selectionStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    display: 'block'
  };
  console.log('移动', left, top, width, height)
  // 修改遮罩层的 clipPath
  overlayStyle.value = {
    clipPath: `polygon(
      0 0, 100% 0, 100% 100%, 0 100%,
      0 0,
      ${left}px ${top}px,
      ${left}px ${top + height}px,
      ${left + width}px ${top + height}px,
      ${left + width}px ${top}px,
      ${left}px ${top}px
    )`
  };

}

interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  window_x: number;
  window_y: number;
}

// 在 handleMouseUp 中重置
const handleMouseUp = async (e: MouseEvent) => {
  e.preventDefault();
  isDragging.value = false;
  selectionStyle.value.display = 'none';
  overlayStyle.value = {};
  mouseDownPos.value = new PhysicalPosition(
      e.screenX,
      e.screenY
  )
  console.log('鼠标位置结束', mouseDownPos.value.x, mouseDownPos.value.y);
  let width = Math.abs(Math.abs(mouseUpPos.value.x) - Math.abs(mouseDownPos.value.x));
  let height = Math.abs(Math.abs(mouseUpPos.value.y) - Math.abs(mouseDownPos.value.y));
  // 判断起始点和结束点,绝对值更小的为坐标轴的方向
  let x = Math.min(mouseUpPos.value.x, mouseDownPos.value.x);
  let y = Math.min(mouseUpPos.value.y, mouseDownPos.value.y);
  // 如果鼠标位置结束和开始相差2px以内视为截图全屏
  if (width > 2 || height > 2) {
    console.log('截图全屏');
    // 根据鼠标移动两个点的坐标获取图片的截图坐标
    const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_fixed', {
      x: mouseUpPos.value.x,
      y: mouseUpPos.value.y,
      width: width,
      height: height,
    }));
    const imgUrl = convertFileSrc(result.path);
    console.log('截图成功', imgUrl)
    const win_fixed = new Windows();
    const url = `/#/fixed?path=${imgUrl}`;
    console.log('窗口大小', width, height, '窗口位置', x, y, '图片路径', result.path)
    // 计算窗口位置
    const windowOptions = {
      label: 'fixed',
      title: 'fixed',
      url: url,
      width: width,
      height: height,
      x: x,
      y: y,
      resizable: true,
      fullscreen: false,
      maximized: false,
      transparent: true,
      center: false,
    };
    await win_fixed.createWin(windowOptions, result.path);
    // await win.closeWin('screenshot');
  } else {
    console.log('截图全屏');
    // await win.closeWin('screenshot');
  }
}

// 添加事件监听
onMounted(() => {
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>
<template>
  <div class="screenshot-container">
    <img :src="path" alt="Screenshot" class="screenshot-image">
    <div class="overlay" v-show="isDragging" :style="overlayStyle"></div>
    <div class="selection" :style="selectionStyle"></div>
  </div>
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
  object-position: center;
  /* 图片居中 */
  position: absolute;
  top: 0;
  left: 0;
}

.screenshot-container {
  position: fixed;
  /* 改为 fixed */
  width: 100vw;
  /* 使用 vw 单位 */
  height: 100vh;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
}

.screenshot-image {
  width: 100vw;
  /* 使用 vw 单位 */
  height: 100vh;
  object-fit: cover;
  position: fixed;
  /* 改为 fixed */
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.selection {
  position: fixed;
  border: 1px solid #1890ff;
  background: transparent;
  pointer-events: none;
  z-index: 1000;
}
</style>