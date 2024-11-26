import {createRouter, createWebHashHistory} from 'vue-router'
import screenshot from "@/views/screenshot.vue"
import home from "@/views/home.vue"
import fixed from "@/views/fixed.vue"
import Contextmenu from "@/views/contextmenu.vue"

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
        // route level code-splitting
    },
    {
        path: '/contextmenu',
        name: 'ContextMenu',
        component: Contextmenu
    }
]

export default createRouter({
    history: createWebHashHistory(),
    routes ,
})
