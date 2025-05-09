// globalVariables.ts
import { reactive } from 'vue'

// 使用一个立即执行函数来创建单例
const createGlobalState = () => {
    // 检查是否已经存在全局实例
    if ((window as any).__GLOBAL_STATE__) {
        return (window as any).__GLOBAL_STATE__
    }

    const state = reactive({
        windowPool: [
            'fixed_1', 'fixed_2', 'fixed_3', 'fixed_4', 'fixed_5',
            'fixed_6', 'fixed_7', 'fixed_8', 'fixed_9', 'fixed_10',
            'fixed_11', 'fixed_12', 'fixed_13', 'fixed_14', 'fixed_15',
            'fixed_16', 'fixed_17', 'fixed_18', 'fixed_19', 'fixed_20'
        ] as string[],
        
        addWindow(windowName: string) {
            this.windowPool.push(windowName)
            console.log('窗口已添加:', this.windowPool)
        },
        
        removeWindow(windowName: string) {
            this.windowPool = this.windowPool.filter((name: string) => name !== windowName)
            console.log('窗口已删除:', this.windowPool)
        },
        
        getFirstWindow() {
            return this.windowPool[0]
        }
    })

    // 将实例保存到全局
    ;(window as any).__GLOBAL_STATE__ = state
    return state
}

export const globalState = createGlobalState()
