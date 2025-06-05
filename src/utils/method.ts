import { ref } from "vue";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { Image } from "@tauri-apps/api/image";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Windows } from "@/windows/create.ts";
import { queryAuth, updateAuth } from '@/utils/dbsql'
import { emit } from "@tauri-apps/api/event";
import {showToast} from "@/utils/toast.ts";

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
    greetMsg.value = await invoke("greet", { image_path: image_path.value });
    await invoke("capture_screen",);
}

export async function readFileImage(path: string) {
    return await Image.fromPath(path)
}

// 复制图片到剪贴板
export async function copyImage(path?: string) {  // 使path参数可选
  try {
    // 获取当前活动的画布
    // @ts-ignore
    const paintingTools = window.activePaintingTools;
    
    // 如果有画布实例且有绘图内容，使用画布内容
    if (paintingTools && paintingTools.hasDrawings()) {
      console.log('检测到有绘画内容，使用画布内容');
      const canvas = paintingTools.canvas;
      
      // 创建一个临时画布来合并背景图片和绘图内容
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        console.error('无法创建临时画布上下文');
        return false;
      }

      // 设置临时画布尺寸与原始画布相同
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      // 将原始画布内容绘制到临时画布
      tempCtx.drawImage(canvas.lowerCanvasEl, 0, 0);

      // 将临时画布转换为blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('无法创建图片blob'));
          }
        }, 'image/png');
      });

      // 将blob转换为ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // 使用Tauri的clipboard API复制图片
      await writeImage(new Uint8Array(arrayBuffer));
      await showToast('复制成功', 'success')
    } 
    // 如果没有画布实例或没有绘图内容，使用原始图片

    else if (path) {
      console.log('使用原始图片路径');
      // 清理路径
      const cleanPath = path.replace('http://asset.localhost/', '');
      
      // 读取原始图片
      const img = await readFileImage(cleanPath);
      
      // 复制到剪贴板
      await writeImage(img);
        //  通知窗口
        await showToast('复制成功',  'success')
    } else {
      console.error('既没有画布内容也没有图片路径');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('复制图片失败:', error);
    return false;
  }
}


// 初始化函数
// 读取窗口池中的窗口信息
// 将异步操作移到 ref 中
const windowPool = ref<any>([]);

// 删除窗口的函数,将state设置为0
const removeWindowFromPool = (windowName: string) => {
    updateAuth('windowPool', {state: 1, windowName: windowName}, {windowName: windowName}).then(() => {
        console.log('删除窗口成功', windowName)
    })
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
export const createScreenshotWindow = async (x: number, y: number, width: number, height: number, operationalID: string, result: any) => {

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
            y: y,
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
    createScreenshotWindow,
};