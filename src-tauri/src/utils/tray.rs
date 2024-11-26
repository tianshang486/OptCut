use tauri::{menu::{Menu, MenuItem, Submenu}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, Emitter, Manager, Runtime};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "最小化", true, None::<&str>)?;
    let edit_i = MenuItem::with_id(app, "edit_file", "测试点击", true, None::<&str>)?;
    let screenshots_i = MenuItem::with_id(app, "screenshots", "截图", true, None::<&str>)?;
    let a = Submenu::with_id_and_items(app, "File", "文章", true, &[&screenshots_i, &edit_i])?;
    // 分割线
    let menu = Menu::with_items(app, &[&quit_i, &show_i, &hide_i, &screenshots_i])?;

    let _ = TrayIconBuilder::with_id("tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                let window = app.get_webview_window("main").unwrap();
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
            "hide" => {
                let window = app.get_webview_window("main").unwrap();
                let _ = window.hide();
            }
            "edit_file" => {
                println!("edit_file");
            }
            "screenshots" => {
                //  给前端发送截图请求
                app.emit("screenshots", "").expect("TODO: panic message");
            }
            // Add more events here
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    //  给前端发送截图请求
                    app.emit("screenshots", "").expect("TODO: panic message");
                }
            }
        })
        .build(app);

    Ok(())
}

