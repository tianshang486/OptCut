import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {Windows,} from '@/windows/create'
import {listen} from "@tauri-apps/api/event";

interface ScreenshotResult {
    path: string;
    width: number;
    height: number;
    window_x: number;
    window_y: number;
}

interface Monitor {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    is_primary: boolean;
}

let currentMonitorId: number | null = null;
let isTracking = false;

export async function listenMonitorSwitch() {
    await listen('switch_monitor', async (event: any) => {
        const { monitor_id } = event.payload;
        
        if (currentMonitorId === monitor_id) {
            return;
        }
        
        const win = new Windows();
        const currentWindow = await win.getWin('screenshot');
        
        if (currentWindow) {
            try {
                await invoke('stop_mouse_tracking');
                await win.closeWin('screenshot');
                currentMonitorId = monitor_id;
                await captureScreenshot('default', monitor_id);
            } catch (error) {
                console.error('切换显示器时出错:', error);
            }
        }
    });
}

export async function captureScreenshot(operationalID: string = 'default', specificMonitorId?: number) {
    try {
        if (isTracking) {
            await invoke('stop_mouse_tracking');
            isTracking = false;
        }

        const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_one'));
        if (!result?.path) {
            return;
        }

        const imgUrl = convertFileSrc(result.path);
        const win = new Windows();
        const monitors: Monitor[] = JSON.parse(await invoke('get_all_monitors') as string);
        
        let targetMonitor = specificMonitorId !== undefined
            ? monitors.find(m => m.id === specificMonitorId)
            : monitors.find(m => {
                const mouseX = result.window_x;
                const mouseY = result.window_y;
                return mouseX >= m.x && 
                       mouseX < (m.x + m.width) && 
                       mouseY >= m.y && 
                       mouseY < (m.y + m.height);
            }) || monitors.find(m => m.is_primary) || monitors[0];

        if (!targetMonitor) {
            return;
        }

        currentMonitorId = targetMonitor.id;

        await win.createWin({
            label: 'screenshot',
            title: 'screenshot',
            url: `/#/screenshot?path=${imgUrl}&operationalID=${operationalID}&monitorId=${targetMonitor.id}`,
            width: targetMonitor.width,
            height: targetMonitor.height,
            fullscreen: true,
            transparent: true,
            maximizable: true,
            decorations: false,
            hiddenTitle: true,
            x: targetMonitor.x,
            y: targetMonitor.y,
        }, result.path);

        await invoke('track_mouse_position');
        isTracking = true;
    } catch (error) {
        console.error('截图过程发生错误:', error);
    }
}

// 导出方法
// export default {captureScreenshot}
