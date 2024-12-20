import {createRouter, createWebHashHistory} from 'vue-router'
import screenshot from "@/views/screenshot.vue"
import home from "@/views/home.vue"
import fixed from "@/views/fixed.vue"
import PaintingToolbar from "@/views/PaintingToolbar.vue"
import Contextmenu from "@/components/contextmenu.vue"

const routes: Array<any> = [
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
    }
]

export default createRouter({
    history: createWebHashHistory(),
    routes ,
})
