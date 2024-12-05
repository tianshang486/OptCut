// globalVariables.ts
// 捕获修改
import { listen } from '@tauri-apps/api/event'
import {reactive} from 'vue'

export const globalState = reactive({
    windowPool: [
        'fixed_0', 'fixed_1', 'fixed_2', 'fixed_3', 'fixed_4',
        'fixed_5', 'fixed_6', 'fixed_7', 'fixed_8', 'fixed_9',
        'fixed_10', 'fixed_11', 'fixed_12', 'fixed_13', 'fixed_14',
        'fixed_15', 'fixed_16', 'fixed_17', 'fixed_18', 'fixed_19', 'fixed_20'
    ]


})
//   监听修改
listen('windowPoolChanged', (event) => {
    globalState.windowPool = event.payload as string[]
}).then(() => console.log('globalState windowPoolChanged listener registered'))
