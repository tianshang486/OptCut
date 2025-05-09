// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod font;
mod migrations;
mod utils;

use crate::commands::{
    baidu_translate, baidu_translate_test, delete_temp_file, get_all_monitors, get_color_at,
    get_mouse_position, get_selected_text,  query_database_info, read_config,
    restart_app, save_shortcuts, stop_mouse_tracking, tencent_ocr, tencent_ocr_test,
    track_mouse_position, write_image, jieba_cut, save_canvas_image, save_canvas_base64
};
use crate::utils::capture_screen::{capture_screen_fixed, capture_screen_one};
use crate::utils::offline_ocr::{ps_ocr, ps_ocr_pd};
use font::get_system_fonts;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_sql::Builder;
use utils::tray;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--flag1", "--flag2"])
                .build(),
        )
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            Builder::default()
                .add_migrations("sqlite:OptCut.db", migrations::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            capture_screen_one,
            capture_screen_fixed,
            ps_ocr,
            delete_temp_file,
            get_color_at,
            read_config,
            ps_ocr_pd,
            query_database_info,
            save_shortcuts,
            restart_app,
            tencent_ocr,
            tencent_ocr_test,
            baidu_translate,
            baidu_translate_test,
            get_all_monitors,
            track_mouse_position,
            stop_mouse_tracking,
            get_system_fonts,
            write_image,
            get_mouse_position,
            get_selected_text,
            jieba_cut,
            save_canvas_image,
            save_canvas_base64,
        ])
        // 阻止默认关闭事件,弹窗提示是否关闭窗口
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // 只对主窗口应用关闭确认
                if window.label() == "main" {
                    api.prevent_close();
                    let window = window.clone();

                    tauri::async_runtime::spawn(async move {
                        let result = window
                            .dialog()
                            .message("确认关闭")
                            .title("提示")
                            .kind(MessageDialogKind::Error)
                            .buttons(MessageDialogButtons::YesNo)
                            .blocking_show();
                        if result {
                            window.app_handle().exit(0);
                        }
                    });
                }
            }
            // 修改最小化事件处理
            tauri::WindowEvent::Resized(_) => {
                if window.label() == "main" && window.is_minimized().unwrap_or(false) {
                    window.hide().unwrap();
                }
            }
            _ => {}
        })
        .setup(|app| {
            #[cfg(all(desktop))]
            {
                println!("Initializing tray and shortcuts...");
                let handle = app.handle();
                tray::create_tray(handle)?;
                println!("Tray created");
                // use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
                // let _ = app.emit("shortcutEvent", "default");
                // handle.plugin(
                //     tauri_plugin_global_shortcut::Builder::new()
                //         .with_shortcuts(["ctrl+alt+q","ctrl+alt+w", "ctrl+alt+e"])?
                //         .with_handler(|app, shortcut, event| {
                //             if event.state == ShortcutState::Pressed {
                //                 // 三个按键的组合: Ctrl+Alt+Shift+Q
                //                 if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyQ)
                //                 {
                //                     let _ = app.emit("shortcut_event", "default");
                //                     println!("ctrl+alt+q");
                //                 }
                //                 if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyW)
                //                 {
                //                     let _ = app.emit("shortcut_event", "fixed_ocr");
                //                     println!("ctrl+alt+w");
                //                 }
                //                 // 两个按键的组合: Ctrl+Alt+E
                //                 if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyE)
                //                 {
                //                     let _ = app.emit("shortcut_event", "fixed_copy");
                //                     println!("ctrl+alt pub(crate)+e");
                //                 }
                //             }
                //         })
                //         .build(),
                // )?;
            }
            // TrayIconBuilder::new()
            //     .on_tray_icon_event(|app, event| {
            //         tauri_plugin_positioner::on_tray_event(app.app_handle(), &event);
            //     })
            //     .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
