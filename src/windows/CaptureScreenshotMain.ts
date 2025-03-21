// 快捷键执行截图
import {captureScreenshot} from "@/windows/screenshot.ts";

export async function captureScreenshotMain(controller: any = 'default') {
    if (controller === 'fixed_copy') {
        await captureScreenshot('fixed_copy');
    } else if (controller === 'default') {
        await captureScreenshot('default');
    } else if (controller === 'fixed_ocr') {
        await captureScreenshot('fixed_ocr');
    } else {
        await captureScreenshot(controller);
    }
}