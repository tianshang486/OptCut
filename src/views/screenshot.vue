<script setup lang="ts">
import {Windows,} from '@/windows/create'
import {copyImage,} from '@/windows/method'
import {onMounted, onUnmounted, ref, computed} from "vue";
import {PhysicalPosition} from '@tauri-apps/api/window';
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
// 从url中获取截图路径?path=' + result.path,
const url: any = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
const path: any = new URLSearchParams(url).get('path')
console.log('截图路径', path)

const win: any = new Windows()

let isMouseDown = false;

// 右键单击关闭事件处理
const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault(); // 阻止默认右键菜单
//   如果是右键单击，关闭窗口
  if (e.button === 2) {
    await win.closeWin('screenshot')
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
let selectionStyle: any = computed(() => {
  if (!isDragging.value) {
    return {
      width: '0px',
      height: '0px',
      display: 'none'
    }
  }

  const width = Math.abs(currentPos.value.x - startPos.value.x)
  const height = Math.abs(currentPos.value.y - startPos.value.y)
  const left = Math.min(currentPos.value.x, startPos.value.x)
  const top = Math.min(currentPos.value.y, startPos.value.y)

  return {
    width: width + 'px',
    height: height + 'px',
    left: left + 'px',
    top: top + 'px',
    border: '1px solid #1e90ff'
  }
})
const mousePos = ref({ x: 0, y: 0 });
const currentColor = ref('#000000')

// 添加双击检测变量
const lastClickTime = ref(0);
const doubleClickDelay = 300; // 双击间隔时间（毫秒）

// 节流函数，限制执行频率
const throttle = (fn: Function, delay: number) => {
  let lastTime = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn(...args);
      lastTime = now;
    }
  };
};

// 获取颜色的函数
const updateColor = async (x: number, y: number) => {
  try {
    currentColor.value = await invoke('get_color_at', { x, y })
  } catch (error) {
    console.error('获取颜色失败:', error)
  }
};

// 使用节流包装的颜色更新函数
const throttledUpdateColor = throttle(updateColor, 500);

// 添加鼠标事件处理函数
// 在 handleMouseDown 中初始化
const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  isMouseDown = true;
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
  
  // 更新当前位置
  currentPos.value = {
    x: Math.round(e.clientX), // 取整以避免小数点导致的抖动
    y: Math.round(e.clientY)
  };

  // 计算选择框的位置和大小
  const left = Math.min(startPos.value.x, currentPos.value.x);
  const top = Math.min(startPos.value.y, currentPos.value.y);
  const width = Math.abs(currentPos.value.x - startPos.value.x);
  const height = Math.abs(currentPos.value.y - startPos.value.y);

  // 更新选择框样式
  selectionStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    display: 'block'
  };

  // 更新遮罩层的 clipPath
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

async function handleCopyImage() {
  try {
    console.log('开始复制图片')
    // await copyImage(path.replace('http://asset.localhost/', ''))
    // const transformedImage: any = transformImage(result);
    // // 写入剪切板
    // await writeImage(transformedImage);
    // js将url图片写到剪切板
    // const imgUrl = convertFileSrc(transformedImage);
    // await win.closeWin('screenshot');
  } catch (e) {
    console.error(e, '图片转换失败')
    // await win.closeWin('screenshot');
    return
  }
}

// 修改鼠标抬起事件处理
const handleMouseUp = async (e: MouseEvent) => {
  if (!isMouseDown) return;
  
  // 如果是右键，直接返回，不执行任何截图操作
  if (e.button === 2) {
    isMouseDown = false;
    return;
  }

  e.preventDefault();
  isDragging.value = false;
  
  // 检测双击
  const currentTime = new Date().getTime();
  const timeDiff = currentTime - lastClickTime.value;
  
  if (e.button === 0 && timeDiff < doubleClickDelay) {
    await copyImage(path.replace('http://asset.localhost/', ''))
    console.log('触发双击全屏截图');
    isMouseDown = false;
    lastClickTime.value = 0; // 重置点击时间
    return;
  }
  
  lastClickTime.value = currentTime;
  
  selectionStyle.value = {
    width: '0px',
    height: '0px',
    display: 'none'
  };
  overlayStyle.value = {};
  mouseDownPos.value = new PhysicalPosition(
      e.screenX,
      e.screenY
  )
  console.log('鼠标位置结束', mouseUpPos.value.x, mouseUpPos.value.y);
  let width = Math.abs(Math.abs(mouseUpPos.value.x) - Math.abs(mouseDownPos.value.x));
  let height = Math.abs(Math.abs(mouseUpPos.value.y) - Math.abs(mouseDownPos.value.y));
  // 判断起始点和结束点,绝对值更小的为坐标轴的方向
  let x = Math.min(mouseUpPos.value.x, mouseDownPos.value.x);
  let y = Math.min(mouseUpPos.value.y, mouseDownPos.value.y);
  isMouseDown = false;

  // 只在左键点击且移动距离小于2px时执行全屏截图
  if (width <= 2 && height <= 2) {
    console.log('误操作忽律');
  } else if (e.button === 0) { // 只在左键点击时执行区域截图
    console.log('截图区域');
    const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_fixed', {
      x: x,
      y: y,
      width: width,
      height: height,
    }));
    const imgUrl = convertFileSrc(result.path);
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
      x: x - 8,
      y: y - 32,
      resizable: true,
      fullscreen: false,
      maximized: false,
      transparent: true,
      center: false,
      decorations: true,
      focus: false
    };
    console.log('创建窗口', windowOptions)
    await win_fixed.createWin(windowOptions, result.path);
    await win.closeWin('screenshot');
  }
}

// 全局鼠标移动处理
const handleGlobalMouseMove = (e: MouseEvent) => {
  mousePos.value = {
    x: e.clientX,
    y: e.clientY
  };
  throttledUpdateColor(e.clientX, e.clientY);
};

// 添加事件监听
onMounted(() => {
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mousemove', handleGlobalMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
})

// 添加计算属性
const selectionWidth = computed(() => {
  return Math.abs(currentPos.value.x - startPos.value.x)
})

const selectionHeight = computed(() => {
  return Math.abs(currentPos.value.y - startPos.value.y)
})
</script>
<template>
  <div class="screenshot-container" @mousemove="handleGlobalMouseMove">
    <img :src="path" alt="Screenshot" class="screenshot-image" />
    <div class="selection-box" :style="selectionStyle"></div>
    <div class="overlay" :style="overlayStyle"></div>
    <div class="coordinates-info" v-if="isDragging" 
         :style="{ 
           left: startPos.x + 'px', 
           top: (startPos.y - 45) + 'px',
           transform: startPos.y < 60 ? 'translateY(60px)' : 'none'
         }">
      <span>起点: ({{ startPos.x }}, {{ startPos.y }})</span>
      <span>大小: {{ selectionWidth }} x {{ selectionHeight }}</span>
    </div>
    <div class="color-indicator" :style="{ left: mousePos.x + 15 + 'px', top: mousePos.y + 15 + 'px' }">
      <div class="color-preview" :style="{ backgroundColor: currentColor }"></div>
      <div class="color-value">{{ currentColor }}</div>
    </div>
  </div>
</template>

<style scoped>
.screenshot-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.screenshot-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  padding: 0;
  z-index: 1;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
  pointer-events: none;
}

.selection-box {
  position: fixed;
  background: transparent;
  border: 1px solid #1e90ff;
  z-index: 3;
  pointer-events: none;
}

.coordinates-info {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  gap: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-indicator {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  padding: 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.color-value {
  color: white;
  font-size: 12px;
  font-family: monospace;
}
</style>