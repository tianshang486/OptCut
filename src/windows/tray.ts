import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';
import { captureScreenshot } from '@/utils/screenshot';
import { Windows } from '@/windows/create';

const TRAY_ID = 'OptCutTray';

// 全局单例
let trayInstance: TrayIcon | null = null;
let menuInstance: Menu | null = null;

// 显示主窗口
async function showMainWindow() {
    const NewWindow = new Windows();
    const mainWindow = await NewWindow.getWin('main');
    if (mainWindow) {
        await mainWindow.show();
        await mainWindow.unminimize();
        await mainWindow.setFocus();
    }
}

// 退出程序
async function main_close() {
    try {
        await tray_close();
        const NewWindow = new Windows();
        const allWin = await NewWindow.getAllWin();
        for (const win of allWin) {
            await NewWindow.closeWin(win.label);
        }
    } catch (error) {
        console.error('Error during main_close:', error);
    }
}

// 创建菜单项
async function createMenu() {
    return await Menu.new({
        items: [{
            text: '显示主窗口',
            action: () => showMainWindow().catch(console.error)
        }, {
            text: '截图',
            action: async () => {
                try {
                    if (trayInstance) {
                        await trayInstance.setVisible(false);
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await captureScreenshot();
                } catch (error) {
                    console.error('Error during screenshot:', error);
                } finally {
                    if (trayInstance) {
                        await trayInstance.setVisible(true);
                    }
                }
            }
        }, {
            text: '退出',
            action: () => main_close().catch(console.error)
        }]
    });
}

// 托盘初始化函数
export async function initializeTray() {
    if (trayInstance) {
        console.log('Tray already exists, skipping initialization');
        return;
    }

    try {
        // 确保清理任何可能存在的托盘
        await tray_close();

        // 创建菜单
        menuInstance = await createMenu();

        // 创建托盘
        trayInstance = await TrayIcon.new({
            id: TRAY_ID,
            icon: 'icons/aa.ico',
            title: 'OptCutTray',
            action: async (event: TrayIconEvent) => {
                if (event.type === 'Click' && event.button === 'Left') {
                    try {
                        if (trayInstance) {
                            await trayInstance.setVisible(false);
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await captureScreenshot();
                    } catch (error) {
                        console.error('Error during left click action:', error);
                    } finally {
                        if (trayInstance) {
                            await trayInstance.setVisible(true);
                        }
                    }
                } else if (event.type === 'Click' && event.button === 'Right') {
                    menuInstance?.popup().catch(console.error);
                }
            }
        });

        console.log('Tray initialized successfully');
    } catch (error) {
        console.error('Failed to initialize tray:', error);
        await tray_close();
    }
}

// 关闭托盘
export async function tray_close() {
    try {
        // 先关闭当前实例
        if (trayInstance) {
            try {
                await trayInstance.close();
            } catch (e) {
                console.error('Failed to close tray instance:', e);
            } finally {
                trayInstance = null;
            }
        }

        // 尝试通过ID清理任何残留的托盘
        try {
            const existingTray = await TrayIcon.getById(TRAY_ID);
            if (existingTray) {
                await existingTray.close();
                await TrayIcon.removeById(TRAY_ID);
            }
        } catch (e) {
            // 忽略错误，可能是因为托盘不存在
        }

        menuInstance = null;
    } catch (error) {
        console.error('Failed to close tray:', error);
    }
}

// 添加页面卸载时的清理
window.addEventListener('beforeunload', async () => {
    await tray_close();
});

// 修改现有的 tray_main 函数
export async function tray_main() {
    // 如果托盘不存在，重新初始化
    if (!trayInstance) {
        await initializeTray();
    }
}
