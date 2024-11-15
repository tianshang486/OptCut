import {register} from '@tauri-apps/plugin-global-shortcut';

export async function registerShortcut(executeFunctions: any) {
    await register('Ctrl+Alt+W', () => {
        executeFunctions()
        console.log('截图快捷键触发');
    });
}

