import {ref} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {Image} from "@tauri-apps/api/image";
import {writeImage} from "@tauri-apps/plugin-clipboard-manager";
const image_path = ref("");

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
export default {
    openDialog,
    readFileImage,
    copyImage
};