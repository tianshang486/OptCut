<script setup lang="ts">
import {Windows,} from '@/windows/create'
import {copyImage, createScreenshotWindow,} from '@/windows/method'
import {computed, onMounted, onUnmounted, ref} from "vue";
import {PhysicalPosition} from '@tauri-apps/api/window';
import {invoke} from "@tauri-apps/api/core";
import {emit} from "@tauri-apps/api/event";
// 从url中获取截图路径?path=' + result.path,
const urlParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
const path: any = urlParams.get('path');
const operationalID:any = urlParams.get('operationalID');
console.log('截图路径', path)

// 读取窗口池中的窗口信息
// 将异步操作移到 ref 中
const windowPool = ref<any>([]);



console.log('窗口池', windowPool)


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
const mousePos = ref({x: 0, y: 0});
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
    currentColor.value = await invoke('get_color_at', {x, y})
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
    await createScreenshotWindow(x, y, width, height,operationalID,result);
  } else { // 其他情况忽略
    alert('浮窗数量已达到上限，请关闭部分窗口后再试')
  }
}

// 添加监控鼠标位置和屏幕边界的功能
const monitors = ref<any[]>([]);
const currentMonitorId = ref<number | null>(null);

// 获取所有显示器信息
const fetchMonitors = async () => {
  try {
    const monitorsData = await invoke('get_all_monitors');
    monitors.value = JSON.parse(monitorsData as string);
    console.log('获取到的显示器信息:', monitors.value);
    
    // 确定当前显示器
    const urlParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
    const monitorId = urlParams.get('monitorId');
    if (monitorId) {
      currentMonitorId.value = parseInt(monitorId);
    }
  } catch (error) {
    console.error('获取显示器信息失败:', error);
  }
};

// 检查鼠标是否在当前显示器内
const checkMouseInCurrentMonitor = (x: number, y: number) => {
  if (!monitors.value.length || currentMonitorId.value === null) return true;
  
  const currentMonitor = monitors.value.find(m => m.id === currentMonitorId.value);
  if (!currentMonitor) return true;
  
  // 检查鼠标是否在当前显示器范围内
  return x >= currentMonitor.x && 
         x < (currentMonitor.x + currentMonitor.width) && 
         y >= currentMonitor.y && 
         y < (currentMonitor.y + currentMonitor.height);
};

// 修改全局鼠标移动处理函数
const handleGlobalMouseMove = async (e: MouseEvent) => {
  mousePos.value = {
    x: e.clientX,
    y: e.clientY
  };
  
  // 获取鼠标的全局屏幕坐标并打印
  const screenX = e.screenX;
  const screenY = e.screenY;
  console.log('鼠标全局坐标:', screenX, screenY);
  
  // 打印当前显示器信息
  console.log('当前显示器ID:', currentMonitorId.value);
  console.log('所有显示器:', monitors.value);
  
  // 检查鼠标是否离开当前显示器
  const isInCurrentMonitor = checkMouseInCurrentMonitor(screenX, screenY);
  console.log('是否在当前显示器内:', isInCurrentMonitor);
  
  if (!isInCurrentMonitor) {
    console.log('鼠标移动到其他显示器，准备切换');
    
    // 找出鼠标当前所在的显示器
    const targetMonitor = monitors.value.find(m => 
      screenX >= m.x && 
      screenX < (m.x + m.width) && 
      screenY >= m.y && 
      screenY < (m.y + m.height)
    );
    
    if (targetMonitor) {
      console.log('找到目标显示器:', targetMonitor);
      try {
        // 发送事件通知需要在新显示器上创建截图窗口
        await emit('switch_monitor', {
          monitorId: targetMonitor.id,
          x: screenX,
          y: screenY,
          operationalID: operationalID
        });
        console.log('已发送切换显示器事件');
        
        // 关闭当前窗口
        await win.closeWin('screenshot');
        console.log('已关闭当前窗口');
      } catch (error) {
        console.error('切换显示器过程中出错:', error);
      }
    }
  }
  
  throttledUpdateColor(e.clientX, e.clientY);
};

// 确保在组件挂载时立即获取显示器信息
onMounted(async () => {
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // 立即获取显示器信息
  await fetchMonitors();
  console.log('组件挂载完成，显示器信息:', monitors.value);
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
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
  <div class="screenshot-container space-x-0 space-y-0" @mousemove="handleGlobalMouseMove">
    <img :src="path" alt="Screenshot" class="screenshot-image"/>
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
:root {
  background: transparent !important;
}


.screenshot-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
  pointer-events: auto;
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