import {captureScreenshot, listenMonitorSwitch} from '@/utils/screenshot.ts'
import {Windows} from '@/windows/create.ts'
import {listen} from "@tauri-apps/api/event";
import {updateAuth} from '@/utils/dbsql'
import {isRegistered, register, ShortcutEvent, unregister} from "@tauri-apps/plugin-global-shortcut";
import {invoke} from "@tauri-apps/api/core";
import {captureScreenshotMain} from "@/utils/CaptureScreenshotMain.ts";
import {readImage} from "@tauri-apps/plugin-clipboard-manager"
import {copyImage, createScreenshotWindow} from "@/utils/method.ts";
import {translateTheText} from "@/utils/translate.ts";

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
        console.log('注册快捷键:', shortcut_key,)
        // 如果已注册，返回报错信息,已被占用
        if (await isRegistered(shortcut_key)) {
            console.log('快捷键已被占用:', shortcut_key)
            return {message: '快捷键已被占用', code: 1}
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
            return {message: '快捷键注册成功', code: 0}
        }
    } catch (error) {
        console.error('注册快捷键失败:', error);
        return {message: '注册快捷键失败', code: 2}
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
async function get_selected_text() {
    // 延迟5s执行
    // await new Promise(resolve => setTimeout(resolve, 5000));
    const select_text: string = await invoke("get_selected_text",);
    // alert(select_text)
    await translateTheText('translate', select_text)
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
            fixed_ocr: config.shortcut_key.fixed_ocr,
            paste_img: config.shortcut_key.paste_img,
            select_text: config.shortcut_key.select_text,
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
        await registerShortcuts(
            config.shortcut_key.paste_img,
            readClipboardImage,
            'paste_img'
        );
        await registerShortcuts(
            config.shortcut_key.select_text,
            get_selected_text,
            'select_text'
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
                        const unlistenFn = await window.onCloseRequested(() => {
                        });
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
}

export async function listenFixedWindows() {
    try {
        await listen('windowPoolChanged', async (event: any) => {
            const {label} = event.payload;
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
                                const translateWin = await windows.getWin('translate_settings');
                                if (translateWin) {
                                    await windows.closeWin('translate_settings');
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


export async function readClipboardImage() {
    try {
        const clipboardImage = await readImage();
        if (!clipboardImage) {
            console.error('剪贴板中没有图片');
            return;
        }

        // 获取原始 RGBA 数据
        const rgba = await clipboardImage.rgba();
        
        // 获取图片尺寸
        const size = await clipboardImage.size();
        const width = size.width;
        const height = size.height;

        console.log('图片尺寸:', width, 'x', height);
        console.log('RGBA 数据长度:', rgba.length);

        const filePath = await invoke('write_image', { 
            rgbaData: Array.from(rgba),
            width: width,
            height: height
        });
        // 获取鼠标坐标
        const mousePosition = await invoke<string>('get_mouse_position');
        console.log('鼠标坐标:', mousePosition)
        const mousePositionJson = JSON.parse(mousePosition) as { x: number, y: number };
        const mouseX = mousePositionJson.x;
        const mouseY = mousePositionJson.y;
        console.log('图片已保存到:', filePath, '鼠标坐标:', mouseX, mouseY);
        await createScreenshotWindow(mouseX, mouseY, width, height, 'default', {path: filePath});

        return filePath;
    } catch (error) {
        console.error('处理剪贴板图片失败:', error);
        throw error;
    }
}

//监听关闭和复制图片事件
export async function listenClipboardImage() {
    try {
        await listen('copy_image', async (event: any) => {
            const {path} = event.payload;
            await copyImage(path);
        });
        } catch (error) {
            console.error('设置复制图片事件监听器时出错:', error);
        }
        await listen('close_fixed', async (event: any) => {
            const {label} = event.payload;
            try {
                const win = await windows.getWin(label)
                if (win) {
                    await win.close();
                }
            } catch (error) {
                console.error('处理关闭图片窗口事件时出错:', error);
            }
        });
}