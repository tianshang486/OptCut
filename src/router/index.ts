import {createRouter, createWebHashHistory} from 'vue-router'
import screenshot from "@/views/screenshot.vue"
import home from "@/views/home.vue"
import fixed from "@/views/fixed.vue"
import PaintingToolbar from "@/views/PaintingToolbar.vue"
import Contextmenu from "@/components/contextmenu.vue"
import Notification from "@/components/Notification.vue"
import TranslateSettings from '@/components/translate-settings.vue'
import TranslateInterfaces from '@/views/translate_interfaces.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: home
    },
    {
        path: '/screenshot',
        name: 'Screenshot',
        component: screenshot
    },
    {
        path: '/fixed',
        name: 'Fixed',
        component: fixed
    },
    {
        path: '/contextmenu',
        name: 'ContextMenu',
        component: Contextmenu
    },
    {
        path: '/painting-toolbar',
        name: 'painting-toolbar',
        component: PaintingToolbar
    },
    {
        path: '/notification',
        name: 'Notification',
        component: Notification
    },
    {
        path: '/translate-settings',
        name: 'translate-settings',
        component: TranslateSettings
    },
    {
        path: '/translate-interfaces',
        name: 'translate-interfaces',
        component: TranslateInterfaces
    }
]

export default createRouter({
    history: createWebHashHistory(),
    routes
})