import {createApp} from "vue";
import App from "./App.vue";
import router from './router/index';
import {listenShortcuts,  listenFixedWindows} from "@/windows/ShortcutRegistration";
import pinia from './stores'  //引入
import './app.css';
import i18n from './i18n';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { queryAuth } from '@/utils/dbsql';

// 初始化字体
async function initFont() {
    try {
        const result = await queryAuth(
            'system_config',
            "SELECT config_value FROM system_config WHERE config_key = 'font'"
        ) as { config_value: string }[];
        
        if (result[0]?.config_value) {
            document.documentElement.style.setProperty('--custom-font', result[0].config_value);
        }
    } catch (error) {
        console.error('初始化字体失败:', error);
    }
}

// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(router).use(pinia).use(i18n).mount("#app");

// 初始化自启动状态
async function initAutoStart() {
    try {
        // 从数据库加载状态
        const result = await queryAuth(
            'system_config',
            "SELECT config_value FROM system_config WHERE config_key = 'autostart'"
        ) as { config_value: string }[];

        const savedStatus = result[0]?.config_value === 'true';
        const systemStatus = await isEnabled();

        // 如果数据库中保存的状态是启用，但系统中未启用，则启用自启动
        if (savedStatus && !systemStatus) {
            await enable();
            console.log('自启动已启用');
        }
    } catch (error) {
        console.error('初始化自启动状态失败:', error);
    }
}

// 将所有异步初始化操作包装在立即执行的异步函数中
(async () => {
    try {
        await Promise.all([
            registerShortcutsAll(),
            initAutoStart(),
            initFont()
        ]);
    } catch (error) {
        console.error('初始化失败:', error);
    }
})();

async function registerShortcutsAll() {
    await listenShortcuts();
    await listenFixedWindows();
}

