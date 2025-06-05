<script setup lang="ts">
import {Windows,} from '@/windows/create'
import { createScreenshotWindow,} from '@/utils/method'
import {computed, onMounted, onUnmounted, ref} from "vue";
import {PhysicalPosition} from '@tauri-apps/api/window';
import {invoke} from "@tauri-apps/api/core";
// 从url中获取截图路径?path=' + result.path,
const urlParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
const path: any = urlParams.get('path');
const operationalID:any = urlParams.get('operationalID');
const monitorId = urlParams.get('monitorId');
console.log('截图路径', path)

// 读取窗口池中的窗口信息
// 将异步操作移到 ref 中
const windowPool = ref<any>([]);
const currentMonitorId = ref<number>(0);

// 从 URL 参数中获取显示器 ID
if (monitorId) {
  currentMonitorId.value = parseInt(monitorId);
}

console.log('窗口池', windowPool)
console.log('当前显示器ID', currentMonitorId.value)

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
const isAltPressed = ref(false)  // Alt 键状态
const isBoxDragging = ref(false)  // 框拖动状态
const isResizing = ref(false)    // 调整大小状态
const resizeDirection = ref('')  // 调整方向
const originalBox = ref({        // 原始框的位置和大小
  left: 0,
  top: 0,
  width: 0,
  height: 0
})
const showToolbar = ref(false)   // 显示工具栏
const coordinatesInfo = ref({    // 尺寸信息的位置
  left: '0px',
  top: '0px',
  transform: 'none'
})

interface SelectionStyle {
  width: string;
  height: string;
  left: string;
  top: string;
  display: string;
  border: string;
}

let selectionStyle = ref<SelectionStyle>({
  width: '0px',
  height: '0px',
  left: '0px',
  top: '0px',
  display: 'none',
  border: '1px solid #1e90ff'
})

const mousePos = ref({x: 0, y: 0});
const currentColor = ref('#000000')

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

// 判断鼠标是否在框的边缘
const isNearEdge = (x: number, y: number, box: any) => {
  const edgeSize = 8; // 边缘检测范围
  const left = box.left;
  const top = box.top;
  const right = left + box.width;
  const bottom = top + box.height;

  // 检查是否在左边缘
  if (Math.abs(x - left) <= edgeSize && y >= top && y <= bottom) {
    return 'left';
  }
  // 检查是否在右边缘
  if (Math.abs(x - right) <= edgeSize && y >= top && y <= bottom) {
    return 'right';
  }
  // 检查是否在上边缘
  if (Math.abs(y - top) <= edgeSize && x >= left && x <= right) {
    return 'top';
  }
  // 检查是否在下边缘
  if (Math.abs(y - bottom) <= edgeSize && x >= left && x <= right) {
    return 'bottom';
  }
  return '';
}

// 添加双击检测变量
const lastClickTime = ref(0);
const doubleClickDelay = 300; // 双击间隔时间（毫秒）

// 修改鼠标按下事件处理
const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  isMouseDown = true;

  if (isDragging.value) {
    // 如果已经画了框，检查是否在框内或边缘
    const box = {
      left: parseInt(selectionStyle.value.left),
      top: parseInt(selectionStyle.value.top),
      width: parseInt(selectionStyle.value.width),
      height: parseInt(selectionStyle.value.height)
    };

    const direction = isNearEdge(e.clientX, e.clientY, box);
    if (direction) {
      // 如果在边缘，开始调整大小
      isResizing.value = true;
      resizeDirection.value = direction;
      originalBox.value = { ...box };
      startPos.value = {x: e.clientX, y: e.clientY}; // 更新起始位置
    } else if (
      e.clientX >= box.left &&
      e.clientX <= box.left + box.width &&
      e.clientY >= box.top &&
      e.clientY <= box.top + box.height
    ) {
      // 如果在框内，开始拖动
      isBoxDragging.value = true;
      originalBox.value = { ...box };
      startPos.value = {x: e.clientX, y: e.clientY}; // 更新起始位置
    }
    return;
  }

  isDragging.value = true;
  startPos.value = {x: e.clientX, y: e.clientY};
  currentPos.value = {x: e.clientX, y: e.clientY};

  selectionStyle.value = {
    left: `${e.clientX}px`,
    top: `${e.clientY}px`,
    width: '0px',
    height: '0px',
    display: 'block',
    border: '1px solid #1e90ff'
  };

  overlayStyle.value = {
    clipPath: 'inset(0 0 0 0)'
  };

  mouseUpPos.value = new PhysicalPosition(
    e.screenX,
    e.screenY
  );
};

// 更新尺寸信息的位置
const updateCoordinatesInfo = (left: number, top: number) => {
  const infoTop = top - 45;
  coordinatesInfo.value = {
    left: `${left}px`,
    top: `${infoTop}px`,
    transform: infoTop < 60 ? 'translateY(60px)' : 'none'
  };
};

// 修改鼠标移动事件处理
const handleMouseMove = async (e: MouseEvent) => {
  if (!isMouseDown) return;
  e.preventDefault();

  if (isDragging.value && (isBoxDragging.value || isResizing.value)) {
    const deltaX = e.clientX - startPos.value.x;
    const deltaY = e.clientY - startPos.value.y;

    if (isBoxDragging.value) {
      // 拖动整个框
      const newLeft = originalBox.value.left + deltaX;
      const newTop = originalBox.value.top + deltaY;
      selectionStyle.value = {
        ...selectionStyle.value,
        left: `${newLeft}px`,
        top: `${newTop}px`,
        border: '1px solid #1e90ff'
      };
      // 更新遮罩层
      updateOverlay(newLeft, newTop, originalBox.value.width, originalBox.value.height);
      // 更新尺寸信息位置
      updateCoordinatesInfo(newLeft, newTop);
    } else if (isResizing.value) {
      // 调整框的大小
      const newBox = { ...originalBox.value };
      switch (resizeDirection.value) {
        case 'left':
          newBox.left = originalBox.value.left + deltaX;
          newBox.width = originalBox.value.width - deltaX;
          break;
        case 'right':
          newBox.width = originalBox.value.width + deltaX;
          break;
        case 'top':
          newBox.top = originalBox.value.top + deltaY;
          newBox.height = originalBox.value.height - deltaY;
          break;
        case 'bottom':
          newBox.height = originalBox.value.height + deltaY;
          break;
      }
      selectionStyle.value = {
        left: `${newBox.left}px`,
        top: `${newBox.top}px`,
        width: `${newBox.width}px`,
        height: `${newBox.height}px`,
        display: 'block',
        border: '1px solid #1e90ff'
      };
      // 更新遮罩层
      updateOverlay(newBox.left, newBox.top, newBox.width, newBox.height);
      // 更新尺寸信息位置
      updateCoordinatesInfo(newBox.left, newBox.top);
    }
    return;
  }

  if (!isDragging.value) return;

  currentPos.value = {
    x: Math.round(e.clientX),
    y: Math.round(e.clientY)
  };

  const left = Math.min(startPos.value.x, currentPos.value.x);
  const top = Math.min(startPos.value.y, currentPos.value.y);
  const width = Math.abs(currentPos.value.x - startPos.value.x);
  const height = Math.abs(currentPos.value.y - startPos.value.y);

  selectionStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    display: 'block',
    border: '1px solid #1e90ff'
  };

  updateOverlay(left, top, width, height);
  // 更新尺寸信息位置
  updateCoordinatesInfo(left, top);
};

// 添加更新遮罩层的函数
const updateOverlay = (left: number, top: number, width: number, height: number) => {
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
};

// 修改鼠标抬起事件处理
const handleMouseUp = async (e: MouseEvent) => {
  if (!isMouseDown) return;

  if (e.button === 2) {
    isMouseDown = false;
    return;
  }

  e.preventDefault();

  // 检测双击
  const currentTime = new Date().getTime();
  const timeDiff = currentTime - lastClickTime.value;

  if (e.button === 0 && timeDiff < doubleClickDelay && selectionStyle.value.display === 'block') {
    await handleScreenshot();
    isMouseDown = false;
    lastClickTime.value = 0; // 重置点击时间
    return;
  }

  lastClickTime.value = currentTime;

  if (isDragging.value && !isBoxDragging.value && !isResizing.value) {
    // 如果是新画的框，显示工具栏
    showToolbar.value = true;
  }

  isBoxDragging.value = false;
  isResizing.value = false;
  isMouseDown = false;
};

// 修改键盘事件处理函数
const handleKeyDown = async (e: KeyboardEvent) => {
  if (e.key === 'Alt') {
    isAltPressed.value = true;
    // 如果 Alt 键按下且有选择框，执行截图
    if (isDragging.value || (selectionStyle.value.width !== '0px' && selectionStyle.value.height !== '0px')) {
      await handleScreenshot();
    }
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Alt') {
    isAltPressed.value = false;
  }
};

// 执行截图
const handleScreenshot = async () => {
  if (!isDragging.value) return;

  // 获取当前鼠标位置
  const mousePosition = await invoke<string>('get_mouse_position');
  const mousePos = JSON.parse(mousePosition) as { x: number, y: number };

  // 获取所有显示器信息
  const monitors: any[] = JSON.parse(await invoke('get_all_monitors') as string);
  const targetMonitor = monitors.find(m => {
    return mousePos.x >= m.x && 
           mousePos.x < (m.x + m.width) && 
           mousePos.y >= m.y && 
           mousePos.y < (m.y + m.height);
  }) || monitors.find(m => m.is_primary) || monitors[0];

  if (targetMonitor) {
    currentMonitorId.value = targetMonitor.id;
  }

  // 使用 selectionStyle 中的值计算相对于显示器的坐标
  const left = parseInt(selectionStyle.value.left);
  const top = parseInt(selectionStyle.value.top);
  const width = parseInt(selectionStyle.value.width);
  const height = parseInt(selectionStyle.value.height);

  // 计算实际的屏幕坐标
  const screenX = targetMonitor.x + left;
  const screenY = targetMonitor.y + top;

  const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_fixed', {
    x: screenX,
    y: screenY,
    width: width,
    height: height,
  }));

  await createScreenshotWindow(screenX, screenY, width, height, operationalID, result);
  
  // 关闭截图窗口
  const win = new Windows();
  await win.closeWin('screenshot');
};

// 获取当前窗口
const getCurrentWindow = async () => {
  const currentWindow = await win.getWin('screenshot');
  if (currentWindow) {
    // 获取所有显示器信息
    const monitors: any[] = JSON.parse(await invoke('get_all_monitors') as string);
    const targetMonitor = monitors.find(m => m.id === currentMonitorId.value);
    if (targetMonitor) {
      // 设置窗口位置到目标显示器
      await currentWindow.setPosition(new PhysicalPosition(targetMonitor.x, targetMonitor.y));
    }
  }
};

// 修改全局鼠标移动处理函数
const handleGlobalMouseMove = async (e: MouseEvent) => {
  mousePos.value = {
    x: e.clientX,
    y: e.clientY
  };

  throttledUpdateColor(e.clientX, e.clientY);
};

// 确保在组件挂载时立即获取显示器信息
onMounted(async () => {
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // 设置窗口位置到正确的显示器
  await getCurrentWindow();
  console.log('组件挂载完成，当前显示器ID:', currentMonitorId.value);
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
})

// 添加计算属性
const selectionWidth = computed(() => {
  return Math.abs(currentPos.value.x - startPos.value.x)
})

const selectionHeight = computed(() => {
  return Math.abs(currentPos.value.y - startPos.value.y)
})

interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  window_x: number;
  window_y: number;
}
</script>
<template>
  <div class="screenshot-container space-x-0 space-y-0" @mousemove="handleGlobalMouseMove">
    <img :src="path" alt="Screenshot" class="screenshot-image"/>
    <div class="selection-box" :style="selectionStyle"></div>
    <div class="overlay" :style="overlayStyle"></div>
    <div class="coordinates-info" v-if="isDragging"
         :style="coordinatesInfo">
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