import {createApp} from "vue";
import App from "./App.vue";
import router from './router/index';
import {registerShortcuts,listenShortcuts} from '@/windows/ShortcutRegistration';

// import {initializeTray, tray_close} from "@/windows/tray"

// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(router);

// 应用挂载完成后初始化托盘
app.mount("#app");

async function main() {
    await registerShortcuts();
    await listenShortcuts();
}

main().then(r => { console.log("main done", r) }); // 调用主函数
