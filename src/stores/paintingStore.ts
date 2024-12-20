import { defineStore } from 'pinia'

export const usePaintingStore = defineStore('painting', {
  state: () => ({
    currentTool: 'rect',
    currentColor: 'red',
    currentArrowStyle: 'default'
  }),

  actions: {
    setTool(tool: string) {
      this.currentTool = tool
    },
    setColor(color: string) {
      this.currentColor = color
    },
    setArrowStyle(style: string) {
      this.currentArrowStyle = style
    }
  }
})

// 导出 store 类型
export type PaintingStore = ReturnType<typeof usePaintingStore> 