import { getAllWindows, getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import { emit, listen } from '@tauri-apps/api/event'


const appWindow = getCurrentWindow()

// 创建窗口参数配置
export const windowConfig = {
    label: 'create-win',            // 窗口唯一label
    title: 'create-win',              // 窗口标题
    url: ' http://localhost:1420/',                // 路由地址url
    width: 1000,            // 窗口宽度
    height: 640,            // 窗口高度
    minWidth: 300,         // 窗口最小宽度
    minHeight: 200,        // 窗口最小高度,        // 窗口最小高度
    x: null,                // 窗口相对于屏幕左侧坐标
    y: null,                // 窗口相对于屏幕顶端坐标
    center: true,           // 窗口居中显示
    resizable: true,        // 是否支持缩放
    maximized: false,       // 最大化窗口
    decorations: false,     // 窗口是否装饰边框及导航条
    alwaysOnTop: false,     // 置顶窗口
    dragDropEnabled: false, // 禁止系统拖放
    visible: true,         // 隐藏窗口

}

export class Windows {
    constructor() {
        // 主窗口
        this.mainWin = null
    }

    // 创建新窗口
    async createWin(options) {
        console.log('-=-=-=-=-=开始创建窗口')

        const args = Object.assign({}, windowConfig, options)

        // 判断窗口是否存在
        const existWin = await this.getWin(args.label)
        if(existWin) {
            console.log('窗口已存在>>', existWin)
            // ...
        }
        // 创建窗口对象
        const win = new WebviewWindow(args.label, args)

        // 窗口创建完毕/失败
        win.once('tauri://created', async() => {
            console.log('tauri://created')
            // 是否主窗口
            if(args.label.indexOf('main') > -1) {
                console.log('is-main-win')
                this.mainWin = win
            }

            // 是否最大化
            if(args.maximized && args.resizable) {
                console.log('is-maximized')
                await win.maximize()
            }
        })

        win.once('tauri://error', async(error) => {
            console.log('window create error!', error)
        })
        //
        // await appWindow.show()

    }

    // 获取窗口
    async getWin(label) {
        return await WebviewWindow.getByLabel(label)
    }

    // 获取全部窗口
    async getAllWin() {
        //  return getAll()
        return await getAllWindows()
    }

    // 开启主进程监听事件
    async listen() {
        console.log('——+——+——+——+——+开始监听窗口')

        // 创建新窗体
        await listen('win-create', (event) => {
            console.log(event)
            this.createWin(event.payload)
        })

        // 显示窗体
        await listen('win-show', async(event) => {
            if(appWindow.label.indexOf('main') == -1) return
            await appWindow.show()
            await appWindow.unminimize()
            await appWindow.setFocus()
        })

        // 隐藏窗体
        await listen('win-hide', async(event) => {
            if(appWindow.label.indexOf('main') == -1) return
            await appWindow.hide()
        })

        // 关闭窗体
        await listen('win-close', async(event) => {
            await appWindow.close()
        })

    }
}

export default {Windows,windowConfig}