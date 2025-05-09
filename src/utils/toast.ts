import { Windows } from '@/windows/create'
import {invoke} from "@tauri-apps/api/core";


export const showToast = async (message: string, type: 'success' | 'error' = 'success') => {
    const win = new Windows()
    
    try {
        // 获取鼠标位置
        const mousePositionStr = await invoke('get_mouse_position');
        const mousePosition = JSON.parse(mousePositionStr as string);
        
        // 获取所有显示器信息
        const monitorsStr = await invoke('get_all_monitors');
        const monitors = JSON.parse(monitorsStr as string);
        
        // 找到鼠标所在的显示器
        const currentMonitor = monitors.find((monitor: any) => {
            return mousePosition.x >= monitor.x 
                && mousePosition.x < (monitor.x + monitor.width)
                && mousePosition.y >= monitor.y 
                && mousePosition.y < (monitor.y + monitor.height);
        });

        if (!currentMonitor) {
            throw new Error('找不到当前显示器');
        }

        // 计算通知窗口在当前显示器右上角的位置
        const x = currentMonitor.x + currentMonitor.width - 320; // 窗口宽度为300，加上一些边距
        const y = currentMonitor.y + 20; // 距离顶部20像素
    
        // 创建通知窗口
        await win.createWin({
            label: 'notification',
            url: `/#/notification?message=${encodeURIComponent(message)}&type=${type}`,
            width: 300,
            height: 56,
            x,
            y,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            focus: false,
            theme: 'dark',
            shadow: false,
        }, {});

        // 5秒后自动关闭
        setTimeout(async () => {
            await win.closeWin('notification')
        }, 5000)
    } catch (error) {
        console.error('显示通知失败:', error);
    }
} 