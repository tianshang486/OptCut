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
    const img: any = await readFileImage(path);
    await writeImage(img);
};

export default {
    openDialog,
    readFileImage,
    copyImage
};