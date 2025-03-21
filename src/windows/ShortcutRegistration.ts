import {captureScreenshot, listenMonitorSwitch} from '@/windows/screenshot.ts'
import {Windows} from '@/windows/create.ts'
import {listen} from "@tauri-apps/api/event";
import {updateAuth} from '@/windows/dbsql'
import {isRegistered, register, ShortcutEvent, unregister} from "@tauri-apps/plugin-global-shortcut";
import {invoke} from "@tauri-apps/api/core";
import {captureScreenshotMain} from "@/windows/CaptureScreenshotMain.ts";

const windows = new Windows();
let shortcutsRegistered = false; // 添加标志来防止重复注册

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
            console.log('快捷键已被占用:', shortcut_key)
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

// 添加取消注册快捷键的函数
async function unregisterShortcut(shortcut: string) {
  try {
    if (await isRegistered(shortcut)) {
      await unregister(shortcut);
      console.log('快捷键已注销:', shortcut);
    }
  } catch (error) {
    console.error('注销快捷键失败:', shortcut, error);
    throw error;
  }
}

// 修改 registerShortcutsMain 函数，添加注销旧快捷键的逻辑
export async function registerShortcutsMain(controller: any = 'default') {
    if (shortcutsRegistered) {
        return;
    }

    try {
        // 先读取当前配置
        const config = await JSON.parse(<string>await readShortcutConfig());
        console.log('读取到的快捷键配置:', config);

        // 获取旧的快捷键配置
        const oldConfig = {
            default: config.shortcut_key.default,
            fixed_copy: config.shortcut_key.fixed_copy,
            fixed_ocr: config.shortcut_key.fixed_ocr
        };

        // 注销所有旧的快捷键
        for (const key of Object.values(oldConfig)) {
            if (key) {
                try {
                    await unregisterShortcut(key);
                } catch (error) {
                    console.error('注销旧快捷键失败:', key, error);
                    // 继续处理其他快捷键
                }
            }
        }

        // 注册新的快捷键
        await registerShortcuts(
            config.shortcut_key.default,
            captureScreenshot,
            'default'
        );

        await registerShortcuts(
            config.shortcut_key.fixed_copy,
            captureScreenshot,
            'fixed_copy'
        );
        await registerShortcuts(
            config.shortcut_key.fixed_ocr,
            captureScreenshot,
            'fixed_ocr'
        );

        shortcutsRegistered = true;
        console.log(controller, '注册快捷键成功');
        return true;
    } catch (error) {
        console.error('注册主快捷键失败:', error);
        throw error;
    }
}

export async function listenShortcuts() {
    if (shortcutsRegistered) {
        return;
    }

    // 注册显示器切换事件监听器
    await listenMonitorSwitch();

    // 读取快捷键配置
    const shortcut_key = await invoke('read_config', {key: 'shortcut_key'}) as string;
    if (!shortcut_key) {
        return;
    }

    // 注册快捷键
    console.log('注册快捷键:', shortcut_key)
    try {
        await register(shortcut_key, async () => {
            await captureScreenshotMain();
        });
        shortcutsRegistered = true;
    } catch (error) {
        console.error('快捷键注册失败:', error);
    }

    // ... 其他事件监听设置 ...
}

export async function listenFixedWindows() {
    try {
        await listen('windowPoolChanged', async (event: any) => {
            const { label } = event.payload;
            try {
                const win = await windows.getWin(label)
                if (win) {
                    const unlistenFn = await win.onCloseRequested(async () => {
                        try {
                            // 这里只更新了数据库状态，没有处理工具栏窗口
                            await updateAuth('windowPool', {state: 0, windowName: label}, {windowName: label})
                            
                            // 需要添加：如果没有其他固定窗口，则关闭工具栏
                            const allWindows = await windows.getAllWin();
                            const hasOtherFixedWindows = allWindows.some(w => 
                                w.label.startsWith('fixed_') && w.label !== label
                            );
                            
                            if (!hasOtherFixedWindows) {
                                const toolbarWin = await windows.getWin('Toolbar');
                                if (toolbarWin) {
                                    await windows.closeWin('Toolbar');
                                }
                            }
                        } catch (error) {
                            console.error('处理窗口关闭事件时出错:', error);
                        }
                    });

                    await win.once('tauri://destroyed', () => {
                        unlistenFn();
                    });
                }
            } catch (error) {
                console.error('处理固定窗口创建事件时出错:', error);
            }
        });
    } catch (error) {
        console.error('设置固定窗口事件监听器时出错:', error);
    }
}