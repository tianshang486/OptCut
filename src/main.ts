import {createApp} from "vue";
import App from "./App.vue";
import router from './router/index';
import {listenShortcuts, listenFixedWindows} from "@/windows/ShortcutRegistration";
// import {createAuthTable} from "@/windows/dbsql";
// import {initializeTray, tray_close} from "@/windows/tray"


// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(router);

// 应用挂载完成后初始化托盘
app.mount("#app");

// 等待DOM加载完成后初始化托盘和快捷键
// await registerShortcuts();
await listenShortcuts();
await listenFixedWindows();
// await createAuthTable();
