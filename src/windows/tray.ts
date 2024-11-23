import {TrayIcon} from '@tauri-apps/api/tray';
import {Menu, type MenuOptions} from '@tauri-apps/api/menu';

export async function tray_main() {
    const tray: TrayIcon = await TrayIcon.new({tooltip: 'OptCut'});
    await tray.setIcon("icons/aa.ico")
    await tray.setTitle('OptCut')
    
    const menuOptions: MenuOptions = {
        items: [{
            id: 'test',
            label: 'Test',
            enabled: true,
            click: tray_test_click
        }]
    };
    
    const menu = await Menu.new(menuOptions);
    await tray.setMenu(menu);
}

async function tray_test_click() {
    alert('Tray icon clicked!')
}