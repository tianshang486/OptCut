import {createApp} from "vue";
import App from "./App.vue";
import router from './router/index';
import {listenShortcuts,  listenFixedWindows} from "@/windows/ShortcutRegistration";
import pinia from './stores'  //引入
import './app.css';
import i18n from './i18n';

// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(router).use(pinia).use(i18n).mount("#app");

// 将异步操作包装在立即执行的异步函数中
(async () => {
    try {
        await registerShortcutsAll();
    } catch (error) {
        console.error('Failed to register shortcuts:', error);
    }
})();

async function registerShortcutsAll() {
    await listenShortcuts();
    await listenFixedWindows();
}

