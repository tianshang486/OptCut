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

// 复制图片到剪贴板 - 优化版本（带重试机制）
export async function copyImage(path?: string, forceOriginal: boolean = false) {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`复制尝试 ${attempt}/${maxRetries}`);

      // 在每次尝试前稍微延迟，让剪贴板准备好
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }

      // 获取当前活动的画布
      // @ts-ignore
      const paintingTools = window.activePaintingTools;

      // 情况1: 强制使用原始图片
      if (forceOriginal && path) {
        console.log('强制使用原始图片，forceOriginal:', forceOriginal, 'path:', path);
        return await copyOriginalImageWithRetry(path, attempt);
      }

      // 情况2: 有画布实例且有绘图内容，使用画布内容
      if (paintingTools && paintingTools.hasDrawings()) {
        console.log('检测到有绘画内容，使用高性能画布导出');
        return await copyCanvasContentOptimizedWithRetry(paintingTools, attempt);
      }

      // 情况3: 没有绘图内容，使用原始图片
      else if (path) {
        console.log('无绘图内容，使用原始图片');
        return await copyOriginalImageWithRetry(path, attempt);
      }

      // 情况4: 既没有画布内容也没有图片路径
      else {
        console.error('既没有画布内容也没有图片路径');
        await showToast('复制失败：无可复制内容', 'error');
        return false;
      }
    } catch (error) {
      lastError = error;
      console.error(`复制尝试 ${attempt} 失败:`, error);

      // 如果是剪贴板错误且还有重试机会，继续尝试
      if (attempt < maxRetries && isClipboardError(error)) {
        console.log(`剪贴板错误，将在 ${100 * attempt}ms 后重试...`);
        continue;
      }

      // 如果不是剪贴板错误或已达到最大重试次数，直接失败
      break;
    }
  }

  console.error('所有复制尝试都失败了:', lastError);
  await showToast('复制失败', 'error');
  return false;
}

// 复制画布内容（包含绘图）- 高性能版本
// 方法1: 使用 Canvas Element 直接复制（最高性能）
// 方法2: 使用优化的 DataURL 方法
// 方法3: 基础降级方法
// 这些方法已被带重试的版本替代，保留作为降级选项


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


// 检测是否为剪贴板相关错误
function isClipboardError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return errorMessage.includes('clipboard') ||
         errorMessage.includes('剪贴板') ||
         errorMessage.includes('1418') ||
         errorMessage.includes('SetClipboardData');
}

// 带重试的原始图片复制
async function copyOriginalImageWithRetry(path: string, attempt: number): Promise<boolean> {
  try {
    console.log(`原始图片复制尝试 ${attempt}`);

    // 清理路径
    const cleanPath = path.replace('http://asset.localhost/', '');

    // 读取原始图片 - 直接使用 Image 对象
    const img = await readFileImage(cleanPath);

    console.log('图片对象创建成功，准备写入剪贴板');

    // 直接使用 Image 对象写入剪贴板
    await safeWriteImageDirect(img, attempt);
    await showToast('复制原图成功', 'success');
    return true;
  } catch (error) {
    console.error(`原始图片复制尝试 ${attempt} 失败:`, error);
    throw error;
  }
}

// 带重试的画布内容复制
async function copyCanvasContentOptimizedWithRetry(paintingTools: any, attempt: number): Promise<boolean> {
  try {
    console.log(`画布内容复制尝试 ${attempt}`);

    let imageData: Uint8Array;

    // 检查是否需要内存优化
    if (paintingTools.shouldUseMemoryOptimization && paintingTools.shouldUseMemoryOptimization()) {
      console.log('使用内存优化导出方法');
      imageData = await paintingTools.exportCanvasMemoryOptimized();
    } else {
      console.log('使用标准优化导出方法');
      imageData = await paintingTools.exportCanvasOptimized();
    }

    // 使用安全的剪贴板写入
    await safeWriteImage(imageData, attempt);

    console.log(`画布复制尝试 ${attempt} 成功，数据大小: ${imageData.length} bytes`);
    await showToast('复制绘图成功', 'success');
    return true;
  } catch (error) {
    console.error(`画布复制尝试 ${attempt} 失败:`, error);
    throw error;
  }
}

// 安全的剪贴板写入（带延迟和重试）- 用于 Uint8Array
async function safeWriteImage(imageData: Uint8Array, attempt: number): Promise<void> {
  try {
    // 在写入前稍微延迟，确保剪贴板准备好
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 尝试写入剪贴板
    await writeImage(imageData);

    console.log(`剪贴板写入成功 (尝试 ${attempt})`);
  } catch (error) {
    console.error(`剪贴板写入失败 (尝试 ${attempt}):`, error);

    // 如果是剪贴板线程错误，稍微延迟后重试
    if (isClipboardError(error) && attempt <= 2) {
      console.log('检测到剪贴板线程错误，延迟后重试...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 再次尝试
      await writeImage(imageData);
      console.log(`剪贴板写入重试成功 (尝试 ${attempt})`);
    } else {
      throw error;
    }
  }
}

// 安全的剪贴板写入（带延迟和重试）- 用于 Image 对象
async function safeWriteImageDirect(image: any, attempt: number): Promise<void> {
  try {
    // 在写入前稍微延迟，确保剪贴板准备好
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('尝试直接写入 Image 对象到剪贴板');

    // 直接使用 Image 对象写入剪贴板
    await writeImage(image);

    console.log(`Image 对象剪贴板写入成功 (尝试 ${attempt})`);
  } catch (error) {
    console.error(`Image 对象剪贴板写入失败 (尝试 ${attempt}):`, error);

    // 如果是剪贴板线程错误，稍微延迟后重试
    if (isClipboardError(error) && attempt <= 2) {
      console.log('检测到剪贴板线程错误，延迟后重试...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 再次尝试
      await writeImage(image);
      console.log(`Image 对象剪贴板写入重试成功 (尝试 ${attempt})`);
    } else {
      throw error;
    }
  }
}