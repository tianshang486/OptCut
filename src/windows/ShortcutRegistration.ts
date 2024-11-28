import {isRegistered, register, ShortcutEvent} from '@tauri-apps/plugin-global-shortcut';
import {captureScreenshot} from '@/windows/screenshot.ts'
import {Windows} from '@/windows/create.ts'
import {listen} from "@tauri-apps/api/event";


export async function registerShortcuts() {
    // 注册快捷键，监听释放事件
    if (!await isRegistered('Ctrl+Alt+W')) {
        await register('Ctrl+Alt+W', async (event: ShortcutEvent) => {
            if (event.state === "Pressed") {
                console.log('Ctrl+Alt+W released', event);
                await captureScreenshot();
            }
        });
    }
}

export async function listenShortcuts() {
    const windows = new Windows();
    await listen('screenshots', (event: any) => {
        console.log(event, '截图事件')
        captureScreenshot();
    });
    //监听close_all_screenshots 事件，关闭所有截图窗口
    await listen('close_all_screenshots', async (event: any) => {
        console.log(event, '关闭所有截图窗口')
        try {
            const allWindows = await windows.getAllWin();
            const closePromises = allWindows
                .filter(window => window.label.startsWith('fixed'))
                .map(async window => {
                    try {
                        await window.close();
                        console.log(`Closed window: ${window.label}`);
                    } catch (err) {
                        console.error(`Failed to close window ${window.label}:`, err);
                    }
                });
            
            await Promise.all(closePromises);
            console.log('All fixed windows closed successfully');
        } catch (error) {
            console.error('Error closing windows:', error);
        }
    });
}


