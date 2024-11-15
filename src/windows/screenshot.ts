
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {Windows,} from '@/windows/create'


interface ScreenshotResult {
    path: string;
    width: number;
    height: number;
    window_x: number;
    window_y: number;
}

export async function captureScreenshot() {
    try {
        const result: ScreenshotResult = JSON.parse(await invoke('capture_screen_one'));
        if (!result?.path) {
            console.error('截图失败：未获取到有效结果');
            return;
        }
        console.log('截图成功：', result)
        const imgUrl = convertFileSrc(result.path);
        const win = new Windows();
        const url = `/#/screenshot?path=${imgUrl}`;

        const windowOptions = {
            label: 'screenshot',
            title: 'screenshot',
            url: url,
            width: result.width + 1,
            height: result.height + 1,
            x: result.window_x,
            y: result.window_y,
        };
        console.log('截图成功：', windowOptions)
        await win.createWin(windowOptions, result.path);
    } catch (error) {
        console.error('截图过程发生错误:', error);
    }
}


// 导出方法
export default {captureScreenshot}
