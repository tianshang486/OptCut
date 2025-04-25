import {ref} from "vue";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {Image} from "@tauri-apps/api/image";
import {writeImage} from "@tauri-apps/plugin-clipboard-manager";
import {Windows} from "@/windows/create.ts";
import {queryAuth, updateAuth} from '@/windows/dbsql'
import {emit} from "@tauri-apps/api/event";
const image_path = ref("");

const win: any = new Windows()
const greetMsg = ref("");
// Open a dialog
export async function openDialog() {
    const file: Array<string> | null = await open({
        multiple: true,
        directory: false,
    });
    console.log(file);
    if (!file) return;
    image_path.value = file.join(", ");
    greetMsg.value = await invoke("greet", {image_path: image_path.value});
    await invoke("capture_screen",);
}

export async function readFileImage(path: string) {
    return await Image.fromPath(path)
}

// 复制图片到剪贴板
export const copyImage = async (path: string) => {
    // await invoke("copied_to_clipboard", {image_path: path});
    try {
        const img: any = await readFileImage(path.replace('http://asset.localhost/', ''));
        // 如果失败则重试,如果提示线程没有打开的粘贴板，则需要打开粘贴板
        try {
            await writeImage(img);
            // alert(path + " 复制成功");
        } catch (e) {
            console.error(e);
            //   延迟2秒重试
            setTimeout(() => {
                copyImage(path);
            }, 3000);
        }
    } catch (e) {
        console.error('图片读取失败');
        return;
    }

};


// 初始化函数
// 读取窗口池中的窗口信息
// 将异步操作移到 ref 中
const windowPool = ref<any>([]);

// 删除窗口的函数,将state设置为0
const removeWindowFromPool = (windowName: string) => {
    updateAuth('windowPool', {state: 1, windowName: windowName}, {windowName: windowName})
}


console.log('窗口池', windowPool)

const initWindowPool = async () => {
    try {
        windowPool.value = await queryAuth('windowPool', 'SELECT windowName FROM windowPool WHERE state = 0');
        console.log('窗口池', windowPool.value);
    } catch (error) {
        console.error('查询窗口池失败:', error);
        windowPool.value = [];
    }
};
// 创建截图窗口
 export const createScreenshotWindow = async (x: number, y: number, width: number, height: number,operationalID: string,result: any) => {

    const imgUrl = convertFileSrc(result.path);
    // 刷新窗口池

    const win_fixed = new Windows();
    // 注入全局状态
    await initWindowPool();

    const fixed_label = windowPool.value[0]?.windowName;  // 安全地获取第一个窗口名
    if (fixed_label) {
        removeWindowFromPool(fixed_label)
        console.log('窗口池选择', fixed_label)

        const url = `/#/fixed?path=${imgUrl}&operationalID=${operationalID}&label=${fixed_label}`;
        console.log('窗口大小', width, height, '窗口位置', x, y, '图片路径', result.path)

        const windowOptions = {
            label: fixed_label,
            title: fixed_label,
            url: url,
            width: width,
            height: height,
            x: x,
            y: y ,
            resizable: true,
            fullscreen: false,
            maximized: false,
            transparent: true,
            center: false,
            decorations: false,
            focus: true,

        };

        // 先创建窗口
        await win_fixed.createWin(windowOptions, result.path);

        // 等待窗口创建完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 再发送事件
        await emit('windowPoolChanged', {
            label: fixed_label
        });
        // 关闭当前窗口
        await win.closeWin('screenshot')
    }
}


export default {
    openDialog,
    readFileImage,
    createScreenshotWindow,
    copyImage
};