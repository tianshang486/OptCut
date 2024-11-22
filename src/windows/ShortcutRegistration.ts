import {isRegistered, register, ShortcutEvent} from '@tauri-apps/plugin-global-shortcut';
import {captureScreenshot} from '@/windows/screenshot.ts'


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