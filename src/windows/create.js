import {WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {emitTo} from '@tauri-apps/api/event'
import {PhysicalSize} from "@tauri-apps/api/window";

// 创建窗口参数配置
export const windowConfig = {
    label: 'create-win',            // 窗口唯一label
    title: 'create-win',              // 窗口标题
    url: '/#/screenshot',                // 路由地址url
    width: 1920,            // 窗口宽度
    height: 1080,            // 窗口高度
    x: 0,                // 窗口相对于屏幕左侧坐标
    y: 0,                // 窗口相对于屏幕顶端坐标
    center: false,           // 窗口居中显示
    resizable: false,        // 是否支持缩放
    maximized: true,       // 最大化窗口
    decorations: true,     // 窗口是否装饰边框及导航条
    alwaysOnTop: true,     // 置顶窗口
    dragDropEnabled: true, // 禁止系统拖放
    visible: false,         // 隐藏窗口
    transparent: true,    // 窗口背景是否透明
    fullscreen: true,    // 全屏窗口
    skipTaskbar: true,   // 任务栏中不显示窗口
    focus: false,         // 窗口是否获得焦点
    contentProtected: false, // 窗口内容是否受保护
    shadow: true,         // 窗口是否有阴影
    theme: 'dark',         // 窗口主题
    hiddenTitle: true,    // 窗口标题栏是否隐藏

}

export class Windows {
    // constructor() {
    //     this.mainWin = null;
    // }


    // 创建新窗口
    async createWin(options, url_parameters) {
        const args = Object.assign({}, windowConfig, options)

        // 判断窗口是否存在
        const existWin = await this.getWin(args.label)
        if (existWin) {
            console.log('窗口已存在>>', existWin)
        }
        // 创建窗口对象
        const win = new WebviewWindow(args.label, args)

        await win.once('tauri://created', async () => {
            console.log('tauri://created', url_parameters)
            // this.sendMsgToWin(args.label, url_parameters)

            // // 是否主窗口
            // if (args.label.indexOf('main') > -1) {
            //     console.log('is-main-win')
            //     this.mainWin = win
            // }

            // 是否最大化
            if (args.maximized && args.resizable) {
                console.log('is-maximized')
                // await win.maximize()
            }
            await win.show()

        })

        await win.once('tauri://error', async (error) => {
            console.log('window create error!', error)
        })
    }

    // 发送自定义消息给窗口
    async sendMsgToWin(label, msg) {
        const win = await this.getWin(label)
        if (win) {

            await emitTo(label, 'screenshot', msg)

            console.log(`发送消息给窗口: ${label}, msg: ${msg}`);
        } else {
            console.log(`未找到窗口: ${label}`);
        }
    }

    // 获取窗口
    async getWin(label) {
        return await WebviewWindow.getByLabel(label)
    }

    // 获取所有窗口
    async getAllWin() {
        return await getAllWebviewWindows()
    }

    // 调整窗口大小
    async resizeWin(label, size) {
        const win = await this.getWin(label);
        if (win) {
            console.log(`尝试调整窗口: ${label} 大小`);
            if (size.width && size.height && Number.isInteger(size.width) && Number.isInteger(size.height) && size.width > 0 && size.height > 0) {
                await win.setSize(new PhysicalSize(size.width, size.height));
                console.log(`窗口 ${label} 大小已调整`);
            } else {
                console.error('提供的尺寸无效，必须是非负整数');
            }
        } else {
            console.log(`未找到窗口: ${label}`);
        }
    }

    // 获取窗口大小
    async getWinSize(label) {
        const win = await this.getWin(label);
        if (win) {
            const size = await win.innerSize();
            console.log(`窗口 ${label} 大小: ${size.width} x ${size.height}`);

            return { width: size.width, height: size.height };
        } else {
            console.log(`未找到窗口: ${label}`);
            return null;
        }
    }

    //     关闭创建的窗口
    async closeWin(label) {
        const win = await this.getWin(label);
        if (win) {
            console.log(`尝试关闭窗口: ${label}`);
            await win.close();
            console.log(`窗口 ${label} 已关闭`);
        } else {
            console.log(`未找到窗口: ${label}`);
        }
    }

}


export default {Windows, windowConfig}