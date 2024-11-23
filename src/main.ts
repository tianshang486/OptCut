import {createApp} from "vue";
import App from "./App.vue";
import router from './router/index'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'
import {registerShortcuts} from '@/windows/ShortcutRegistration';
import VueKonva from 'vue-konva';
import {tray_main} from "@/windows/tray"

tray_main().then(r => {
    console.log('Tray initialized successfully', r)
})

registerShortcuts().then(r => {
    console.log('Shortcuts registered successfully', r)
})
createApp(App).use(VueKonva).use(ContextMenu).use(router).mount("#app");
