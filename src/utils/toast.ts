import { Windows } from '@/windows/create'
import {invoke} from "@tauri-apps/api/core";


// 通知计数器，确保每个通知有唯一的标签
let notificationCounter = 0;
// 活动通知列表，用于管理位置
let activeNotifications: string[] = [];

export const showToast = async (message: string, type: 'success' | 'error' = 'success') => {
    const win = new Windows()

    try {
        // 生成唯一的通知标签
        const notificationLabel = `notification_${++notificationCounter}`;

        // 获取鼠标位置
        const mousePositionStr = await invoke('get_mouse_position');
        const mousePosition = JSON.parse(mousePositionStr as string);

        // 获取所有显示器信息
        const monitorsStr = await invoke('get_all_monitors');
        const monitors = JSON.parse(monitorsStr as string);

        // 找到鼠标所在的显示器
        const currentMonitor = monitors.find((monitor: any) => {
            return mousePosition.x >= monitor.x
                && mousePosition.x < (monitor.x + monitor.width)
                && mousePosition.y >= monitor.y
                && mousePosition.y < (monitor.y + monitor.height);
        });

        if (!currentMonitor) {
            throw new Error('找不到当前显示器');
        }

        // 计算通知窗口在当前显示器右上角的位置
        // 基于当前活动通知的数量来计算位置
        const offsetY = activeNotifications.length * 70; // 每个通知错开70像素
        const x = currentMonitor.x + currentMonitor.width - 320; // 窗口宽度为300，加上一些边距
        const y = currentMonitor.y + 20 + offsetY; // 距离顶部20像素，加上偏移

        // 添加到活动通知列表
        activeNotifications.push(notificationLabel);

        console.log(`创建通知窗口: ${notificationLabel}, 位置: (${x}, ${y})`);

        // 创建通知窗口
        await win.createWin({
            label: notificationLabel,
            url: `/#/notification?message=${encodeURIComponent(message)}&type=${type}`,
            width: 300,
            height: 56,
            x,
            y,
            decorations: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            focus: false,
            theme: 'dark',
            shadow: false,
        }, {});

        // 3秒后自动关闭（缩短时间避免堆积）
        setTimeout(async () => {
            try {
                await win.closeWin(notificationLabel);
                // 从活动通知列表中移除
                const index = activeNotifications.indexOf(notificationLabel);
                if (index > -1) {
                    activeNotifications.splice(index, 1);
                }
                console.log(`通知窗口已关闭: ${notificationLabel}，剩余通知: ${activeNotifications.length}`);
            } catch (error) {
                console.error(`关闭通知窗口失败: ${notificationLabel}`, error);
                // 即使关闭失败也要从列表中移除，避免位置计算错误
                const index = activeNotifications.indexOf(notificationLabel);
                if (index > -1) {
                    activeNotifications.splice(index, 1);
                }
            }
        }, 3000)
    } catch (error) {
        console.error('显示通知失败:', error);
    }
}