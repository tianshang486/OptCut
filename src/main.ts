import { createApp } from "vue";
import App from "./App.vue";
import router from './router/index'
import 'ant-design-vue/dist/reset.css';
import Antd from 'ant-design-vue';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'
createApp(App).use(ContextMenu).use(Antd).use(router).mount("#app");
