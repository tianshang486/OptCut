<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePaintingStore } from '@/stores/paintingStore'
import { emit } from '@tauri-apps/api/event'

const store = usePaintingStore()
const showArrowDropdown = ref(false)
const showLineDropdown = ref(false)

// 工具配置
const tools = [
  { name: 'rect', icon: '⬜', label: '矩形' },
  { 
    name: 'arrow', 
    icon: '➡', 
    label: '箭头',
    hasDropdown: true,
    dropdownItems: [
      { value: 'arrow1', icon: '→' },
      { value: 'arrow2', icon: '⟶' }
    ]
  },
  { 
    name: 'line', 
    icon: '—', 
    label: '直线',
    hasDropdown: true,
    dropdownItems: [
      { value: 'line1', icon: '—' },
      { value: 'line2', icon: '┄' }
    ]
  }
]

// 颜色选项
const colors = [
  { value: '#FF0000', label: '红色' },
  { value: '#000000', label: '黑色' },
  { value: '#FFD700', label: '黄色' },
  { value: '#008000', label: '绿色' },
  { value: '#0000FF', label: '蓝色' },
  { value: '#FFFFFF', label: '白色' }
]

// 切换工具
const switchTool = async (toolName: string) => {
  store.setTool(toolName)
  const sourceLabel = new URLSearchParams(window.location.search).get('sourceLabel')
  await emit('toolbar-tool-change', {
    tool: toolName,
    targetLabel: sourceLabel
  })
}

// 切换颜色
const switchColor = async (color: string) => {
  store.setColor(color)
  const sourceLabel = new URLSearchParams(window.location.search).get('sourceLabel')
  await emit('toolbar-color-change', {
    color: color,
    targetLabel: sourceLabel
  })
}
</script>

<template>
  <div class="toolbar-container">
    <div class="main-toolbar">
      <!-- 工具组 -->
      <div class="tools-group">
        <div 
          v-for="tool in tools" 
          :key="tool.name"
          class="tool-wrapper"
        >
          <div
            class="tool-item"
            :class="{ active: store.currentTool === tool.name }"
            @click.stop="switchTool(tool.name)"
            :title="tool.label"
          >
            {{ tool.icon }}
          </div>
          <div 
            v-if="tool.hasDropdown"
            class="dropdown-trigger"
            @click.stop="tool.name === 'arrow' ? showArrowDropdown = !showArrowDropdown : showLineDropdown = !showLineDropdown"
          >
            ▼
          </div>
          <!-- 下拉菜单 -->
          <div 
            v-if="tool.hasDropdown && ((tool.name === 'arrow' && showArrowDropdown) || (tool.name === 'line' && showLineDropdown))"
            class="dropdown-menu"
          >
            <div
              v-for="item in tool.dropdownItems"
              :key="item.value"
              class="dropdown-item"
              @click.stop="switchTool(item.value)"
            >
              {{ item.icon }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="divider"></div>

      <!-- 颜色选择器 -->
      <div class="colors-group">
        <div 
          v-for="color in colors" 
          :key="color.value"
          class="color-item"
          :class="{ active: store.currentColor === color.value }"
          :style="{ backgroundColor: color.value, border: color.value === '#FFFFFF' ? '1px solid #ddd' : 'none' }"
          @click.stop="switchColor(color.value)"
          :title="color.label"
        />
      </div>
    </div>
  </div>
</template>

<style>
:root, html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.toolbar-container {
  padding: 4px;
}

.main-toolbar {
  background: #2b2b2b;
  border-radius: 6px;
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.tools-group, .colors-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.tool-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.tool-item {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 16px;
  color: #fff;
}

.dropdown-trigger {
  width: 12px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 8px;
  opacity: 0.6;
}

.dropdown-trigger:hover {
  opacity: 1;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: #2b2b2b;
  border-radius: 4px;
  padding: 4px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.dropdown-item {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  border-radius: 4px;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.divider {
  width: 1px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.color-item {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tool-item.active {
  background: rgba(255, 255, 255, 0.2);
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.active {
  box-shadow: 0 0 0 2px #fff;
}
</style>