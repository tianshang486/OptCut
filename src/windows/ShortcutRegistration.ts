import {captureScreenshot} from '@/windows/screenshot.ts'
import {Windows} from '@/windows/create.ts'
import {listen} from "@tauri-apps/api/event";
import {updateAuth} from '@/windows/dbsql'
import {isRegistered, register, ShortcutEvent} from "@tauri-apps/plugin-global-shortcut";
import {invoke} from "@tauri-apps/api/core";

const windows = new Windows();
// 读取快捷键配置


// 注销快捷键
// async function unregisterShortcuts(shortcut_key: string) {
//     if (await isRegistered(shortcut_key)) {
//         await unregister(shortcut_key);
//         console.log('快捷键已注销:', shortcut_key);
//     }
// }

// 注册快捷键
export async function registerShortcuts(shortcut_key: string, method: Function, controller: any = 'default') {
    try {
        console.log('注册快捷键:', shortcut_key, )
        // 如果已注册，返回报错信息,已被占用
        if (await isRegistered(shortcut_key)) {
            return { message: '快捷键已被占用' , code: 1 }
        } else {

            // 重新注册快捷键，保持监听状态
            await register(shortcut_key, async (event: ShortcutEvent) => {
                if (event.state === "Pressed") {
                    console.log('截图快捷键触发', shortcut_key);
                    try {
                        await method(controller);
                    } catch (error) {
                        console.error('执行快捷键功能时出错:', error);
                    }
                }
            });

            console.log('快捷键注册成功:', shortcut_key);
            return { message: '快捷键注册成功', code: 0 }
        }
    } catch (error) {
        console.error('注册快捷键失败:', error);
        return { message: '注册快捷键失败', code: 2 }
    }

}

async function readShortcutConfig() {
    return invoke('read_config');
}

export async function registerShortcutsMain(controller: any = 'default') {
    try {
        const config = await JSON.parse(<string>await readShortcutConfig());
        console.log('读取到的快捷键配置:', config);

        // 注册固定截图快捷键
        await registerShortcuts(
            config.shortcut_key.default,
            captureScreenshot,
            'default'
        );

        // 注册复制截图快捷键
        await registerShortcuts(
            config.shortcut_key.fixed_copy,
            captureScreenshot,
            'fixed_copy'
        );
        console.log(controller, '注册快捷键成功');
    } catch (error) {
        console.error('注册主快捷键失败:', error);
    }
}

// 快捷键执行截图
async function captureScreenshotMain(controller: any = 'default') {
    if (controller === 'fixed_copy') {
        await captureScreenshot('fixed_copy');
    } else if (controller === 'default') {
        await captureScreenshot('fixed_ocr');
    } else if (controller === 'fixed_ocr') {
        await captureScreenshot('default');
    } else {
        await captureScreenshot(controller);
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
                .filter(window => window.label.startsWith('fixed') || window.label === 'Toolbar')
                .map(async window => {
                    try {
                        const unlistenFn = await window.onCloseRequested(() => {});
                        unlistenFn();
                        
                        await window.close();
                        console.log(`Closed window: ${window.label}`);
                    } catch (err) {
                        console.error(`Failed to close window ${window.label}:`, err);
                    }
                });

            await Promise.all(closePromises);
            console.log('All fixed windows and toolbars closed successfully');
            
            // 将库中所有窗口状态设置为0
            await updateAuth('windowPool', {state: 0}, {1: 1});
        } catch (error) {
            console.error('Error closing windows:', error);
        }
    });

    // 添加新的快捷键监听
    await listen('shortcut_event', async (event: any) => {
        console.log('快捷键事件触发', event.payload);
        await captureScreenshotMain(event.payload);
    });
}

export async function listenFixedWindows() {
    console.log('开始监听固定窗口事件');
    try {
        await listen('windowPoolChanged', async (event: any) => {
            const { label } = event.payload;
            console.log('收到固定窗口创建事件:', label);
            try {
                const win = await windows.getWin(label)
                console.log(win);
                if (win) {
                    console.log('成功获取窗口实例:', label);
                    try {
                        // 使用 onCloseRequested 处理关闭事件
                        const unlistenFn = await win.onCloseRequested(async () => {
                            console.log('触发窗口关闭事件:', label);
                            try {
                                // 添加窗口标签回到窗口池
                                await updateAuth('windowPool', {state: 0, windowName: label}, {windowName: label})
                            } catch (error) {
                                console.error('处理窗口关闭事件时出错:', error);
                            }
                        });

                        // 监听窗口销毁事件来清理监听器
                        await win.once('tauri://destroyed', () => {
                            // 移除 await，直接调用 unlistenFn
                            unlistenFn();
                        });

                        console.log('关闭事件监听器设置完成:', label);
                    } catch (error) {
                        console.error('设置窗口关闭事件监听器时出错:', error);
                    }
                } else {
                    console.error(`未能获取窗口实例: ${label}`);
                }
            } catch (error) {
                console.error('处理固定窗口创建事件时出错:', error);
            }
        });
        console.log('固定窗口事件监听器设置完成');
    } catch (error) {
        console.error('设置固定窗口事件监听器时出错:', error);
    }
}