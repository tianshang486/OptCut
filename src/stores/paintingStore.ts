import { defineStore } from 'pinia'

export const usePaintingStore = defineStore('painting', {
  state: () => ({
    currentTool: 'rect',
    currentColor: '#FF0000',
    canDraw: true
  }),

  actions: {
    setTool(tool: string) {
      this.currentTool = tool
    },
    setColor(color: string) {
      console.log('Store: 设置新颜色:', color)
      this.currentColor = color
    }
  }
})

// 导出 store 类型
export type PaintingStore = ReturnType<typeof usePaintingStore> 