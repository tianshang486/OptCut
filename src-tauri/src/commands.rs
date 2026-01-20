use crate::utils::sql::{get_shortcut_keys, init_db, query_tables};
use crate::utils::tencent_ocr::{call_tencent_ocr, get_tencent_config};
use crate::utils::{color, read_conf::read_conf, translate};
use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, Rgba};
use jieba_rs;
use mouse_position::mouse_position::Mouse;
use selection::get_text;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Runtime, Url};
use xcap::{image, Monitor};
static TRACKING: AtomicBool = AtomicBool::new(false);
use std::process::Command;


// 获取颜色的 Tauri 命令
#[tauri::command]
pub fn get_color_at(x: i32, y: i32) -> Result<String, String> {
    color::get_pixel_color(x, y)
}

// 测试 Tauri 命令
#[tauri::command(rename_all = "snake_case")]
pub async fn greet(image_path: String) -> Result<String, String> {
    println!("greet called from: {:?}", std::backtrace::Backtrace::capture()); // 添加调用栈跟踪
    Ok(format!("Hello, World!\n Image path: {}", image_path))
}

// 获取鼠标所在位置
#[tauri::command()]
pub async  fn get_mouse_position() -> Result<String, String> {
    let position = Mouse::get_mouse_position();
    let (x, y) = if let Mouse::Position { x, y } = position {
        (x, y)
    } else {
        return Err("获取鼠标位置失败".to_string());
    };

    Ok(json!({
        "x": x,
        "y": y
    })
    .to_string())
}


// 删除临时文,以AGCut开头的文件
#[tauri::command]
pub fn delete_temp_file() {
    let temp_dir = env::temp_dir();
    let mut entries = temp_dir.read_dir().unwrap();
    while let Some(entry) = entries.next() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_file()
            && path
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .starts_with("AGCut")
        {
            println!("删除临时文件: {}", path.to_string_lossy());
            std::fs::remove_file(path).unwrap();
        }
    }
}

// 添加新的tauri命令
#[tauri::command()]
pub async fn read_config() -> Result<String, String> {
    println!(
        "read_config called from: {:?}",
        std::backtrace::Backtrace::capture()
    ); // 添加调用栈跟踪
    read_conf()
        .await
        .map(|config| serde_json::to_string(&config).unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn query_database_info() -> Result<String, String> {
    let pool = init_db().await?;
    println!("Database initialized");
    // 查询所有表
    let tables = query_tables(&pool).await?;

    // 查询快捷键表数据
    let shortcut_keys = get_shortcut_keys(&pool).await?;

    // 将结果格式化为字符串
    let tables_str = tables.join(", ");
    let shortcuts_str = shortcut_keys
        .iter()
        .map(|sk| format!("{}: {}", sk.shortcut_key, sk.function))
        .collect::<Vec<_>>()
        .join(", ");

    let result = format!("Tables: [{}], Shortcuts: [{}]", tables_str, shortcuts_str);

    // 打印结果
    println!("{}", result);

    Ok(result.to_string())
}

#[derive(Deserialize, Serialize)]
pub struct ShortcutConfig {
    default: String,
    fixed_copy: String,
    fixed_ocr: String,
}

#[tauri::command]
pub async fn save_shortcuts(shortcuts: ShortcutConfig) -> Result<(), String> {
    let pool = init_db().await?;

    // 更新每个快捷键
    sqlx::query("UPDATE shortcutKey SET shortcut_key = ? WHERE function = ?")
        .bind(&shortcuts.default)
        .bind("default")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE shortcutKey SET shortcut_key = ? WHERE function = ?")
        .bind(&shortcuts.fixed_copy)
        .bind("fixed_copy")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE shortcutKey SET shortcut_key = ? WHERE function = ?")
        .bind(&shortcuts.fixed_ocr)
        .bind("fixed_ocr")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn restart_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    // 检查是否是开发环境
    #[cfg(debug_assertions)]
    {
        // 开发环境下只关闭应用，让用户手动重启
        app_handle.exit(0);
        return Ok(());
    }

    #[cfg(not(debug_assertions))]

    {
        // 生产环境下的重启逻辑
        let current_exe =
            env::current_exe().map_err(|e| format!("Failed to get current exe path: {}", e))?;
        use std::process::Command;
        Command::new(&current_exe)
            .spawn()
            .map_err(|e| format!("Failed to start new process: {}", e))?;

        app_handle.exit(0);
    }
    Ok(())
}


#[tauri::command]
pub async fn tencent_ocr(image_path: String) -> Result<String, String> {
    let (secret_id, secret_key) = get_tencent_config().await?;
    call_tencent_ocr(&image_path, &secret_id, &secret_key).await
}

#[tauri::command]
pub async fn tencent_ocr_test(secret_id: String, secret_key: String) -> Result<bool, String> {
    let result = call_tencent_ocr("tools/img.png", &secret_id, &secret_key).await?;
    Ok(!result.contains("Error"))
}

#[tauri::command]
pub async fn baidu_translate(text: String, from: String, to: String) -> Result<String, String> {
    let (app_id, secret_key) = translate::get_baidu_config().await?;
    translate::baidu_translate(text, from, to, app_id, secret_key).await
}

// 添加百度翻译测试接口
#[tauri::command]
pub async fn baidu_translate_test(
    text: String,
    from: String,
    to: String,
    app_id: String,
    secret_key: String,
) -> Result<String, String> {
    translate::baidu_translate(text, from, to, app_id, secret_key).await
}

// 获取所有显示器信息
#[tauri::command]
pub fn get_all_monitors() -> Result<String, String> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;

    let monitors_info: Vec<serde_json::Value> = monitors
        .iter()
        .map(|monitor| {
            json!({
                "id": monitor.id().unwrap_or_default(),
                "x": monitor.x().unwrap_or_default(),
                "y": monitor.y().unwrap_or_default(),
                "width": monitor.width().unwrap_or_default(),
                "height": monitor.height().unwrap_or_default(),
                "is_primary": monitor.is_primary().unwrap_or_default()
            })
        })
        .collect();

    Ok(serde_json::to_string(&monitors_info).unwrap())
}


// 添加新的命令来获取当前鼠标位置和所在显示器
#[tauri::command]
pub async fn track_mouse_position(app_handle: tauri::AppHandle) -> Result<(), String> {
    if TRACKING.load(Ordering::SeqCst) {
        return Ok(());
    }

    TRACKING.store(true, Ordering::SeqCst);
    let mut last_monitor_id: u32 = 0;

    std::thread::spawn(move || {
        while TRACKING.load(Ordering::SeqCst) {
            if let Mouse::Position { x, y } = Mouse::get_mouse_position() {
                if let Ok(monitors) = Monitor::all() {
                    for monitor in monitors.iter() {
                        let monitor_x = monitor.x().unwrap_or_default();
                        let monitor_y = monitor.y().unwrap_or_default();
                        let monitor_width = monitor.width().unwrap_or_default();
                        let monitor_height = monitor.height().unwrap_or_default();

                        if x >= monitor_x
                            && x < (monitor_x + monitor_width as i32)
                            && y >= monitor_y
                            && y < (monitor_y + monitor_height as i32)
                        {
                            let monitor_id = monitor.id().unwrap_or_default();
                            if last_monitor_id != monitor_id {
                                last_monitor_id = monitor_id;
                                let _ = app_handle.emit(
                                    "switch_monitor",
                                    json!({
                                        "monitor_id": monitor_id
                                    }),
                                );
                            }
                            break;
                        }
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    Ok(())
}

// 添加一个停止跟踪的命令
#[tauri::command]
pub fn stop_mouse_tracking() {
    TRACKING.store(false, Ordering::SeqCst);
}

#[tauri::command]
pub async fn write_image(rgba_data: Vec<u8>, width: u32, height: u32) -> Result<String, String> {
    // 获取临时目录
    let temp_dir = env::temp_dir();
    // 生成唯一的文件名
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let file_name = format!("AGCut_{}.png", timestamp);
    let file_path = temp_dir.join(file_name);

    println!("准备写入图片:");
    println!("- 目标路径: {:?}", file_path);
    println!("- 图片尺寸: {}x{}", width, height);
    println!("- RGBA数据长度: {}", rgba_data.len());

    // 验证数据长度
    let expected_len = width as usize * height as usize * 4;
    if rgba_data.len() != expected_len {
        return Err(format!(
            "RGBA数据长度不匹配: 期望 {}, 实际 {}",
            expected_len,
            rgba_data.len()
        ));
    }

    // 创建 ImageBuffer
    let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, rgba_data)
        .ok_or_else(|| "无法创建图像缓冲区".to_string())?;

    // 保存为 PNG
    img.save(&file_path)
        .map_err(|e| format!("保存图片失败: {}", e))?;

    println!("图片已成功保存到: {:?}", file_path);

    // 返回新文件的路径
    Ok(file_path.to_string_lossy().to_string())
}

// 新增：获取画布数据并保存为图片
#[tauri::command]
pub async fn save_canvas_image(canvas_data: Vec<u8>, width: u32, height: u32, original_path: String) -> Result<String, String> {
    // 验证数据长度
    let expected_len = width as usize * height as usize * 4;
    if canvas_data.len() != expected_len {
        return Err(format!(
            "Canvas数据长度不匹配: 期望 {}, 实际 {}",
            expected_len,
            canvas_data.len()
        ));
    }

    // 创建 ImageBuffer
    let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, canvas_data)
        .ok_or_else(|| "无法创建画布图像缓冲区".to_string())?;

    // 直接覆盖原始文件
    img.save(&original_path)
        .map_err(|e| format!("保存画布图片失败: {}", e))?;

    println!("画布图片已成功保存到原始路径: {:?}", original_path);

    // 返回原始文件的路径
    Ok(original_path)
}

// 获取选中的文本
#[tauri::command]
pub async fn get_selected_text() -> Result<String, String> {
    let selected_text = get_text();
    println!("选中的文本: {:?}", selected_text);
    Ok(selected_text)
}

// 添加分词命令
#[tauri::command]
pub async fn jieba_cut(text: String) -> Result<Vec<String>, String> {
    let jieba = jieba_rs::Jieba::new();
    let words = jieba.cut(&text, false); // false 表示精确模式
    Ok(words.into_iter()
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty()) // 过滤空白字符
        .collect())
}

// 新增：从base64数据保存画布图片
#[tauri::command]
pub async fn save_canvas_base64(base64_data: String, original_path: String) -> Result<String, String> {
    println!("Saving canvas base64 data to: {}", original_path);
    println!("Base64 data length: {}", base64_data.len());

    // 解码base64数据
    let decoded = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64 data: {}", e))?;

    // 创建文件并写入解码后的数据
    let mut file = File::create(&original_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    file.write_all(&decoded)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    println!("Canvas image successfully saved to original path: {}", original_path);

    // 返回原始文件的路径
    Ok(original_path)
}

// 注意：需要传入 AppHandle，Tauri 命令中可通过参数获取
// 核心命令：强制用浏览器打开（绕过系统关联）
#[tauri::command]
pub async fn open_file_with_browser<R: Runtime>(
    _app_handle: AppHandle<R>, // 2.x中访问本地文件无需AppHandle，仅保留参数兼容你的调用
    file_path: String
) -> Result<String, String> {
    println!("🔄 正在使用浏览器打开文件: {}", file_path);

    // ========== 核心：仅用标准库处理路径（Tauri 2.x 最稳定方式） ==========
    // 步骤1：将传入路径转为绝对路径（解决打包后工作目录变化问题）
    let abs_path = match dunce::canonicalize(Path::new(&file_path)) {
        Ok(p) => p,
        Err(e) => return Err(format!("❌ 无法转换为绝对路径: {}", e)),
    };

    // 步骤2：检查文件是否存在
    if !abs_path.exists() {
        return Err(format!("❌ 文件不存在: {}", abs_path.display()));
    }

    // 步骤3：转换为 file:// 协议的URL（浏览器可识别）
    let file_url = match Url::from_file_path(&abs_path) {
        Ok(url) => url,
        Err(e) => return Err(format!("❌ 无法转换为文件URL: {:?}", e)),
    };
    println!("🌐 转换后的文件URL: {}", file_url);

    #[cfg(target_os = "windows")]
    {
        // ========== 关键：精准定位 Edge 浏览器（Windows 内置，必存在） ==========
        // 1. 获取 Edge 安装路径（从系统环境变量/默认路径）
        let edge_paths = [
            // Windows 10/11 64位默认路径
            format!("{}\\Microsoft\\Edge\\Application\\msedge.exe", env::var("PROGRAMFILES").unwrap_or("C:\\Program Files".to_string())),
            // 32位系统路径
            format!("{}\\Microsoft\\Edge\\Application\\msedge.exe", env::var("PROGRAMFILES(X86)").unwrap_or("C:\\Program Files (x86)".to_string())),
            // 用户目录备用路径
            format!("{}\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe", env::var("USERPROFILE").unwrap_or("C:\\Users\\Default".to_string())),
        ];

        // 2. 找到存在的 Edge 路径并调用
        let mut edge_exe = String::new();
        for path in edge_paths {
            if Path::new(&path).exists() {
                edge_exe = path;
                break;
            }
        }

        if !edge_exe.is_empty() {
            // 强制用 Edge 打开文件 URL（彻底绕过系统关联）
            match Command::new(&edge_exe)
                .args(["--new-window", (&file_url).as_ref()]) // 新窗口打开
                .spawn()
            {
                Ok(_) => {
                    println!("✅ 已强制使用 Microsoft Edge 打开文件");
                    return Ok(format!("✅ 正在用 Edge 浏览器打开: {}", file_path));
                }
                Err(e) => {
                    println!("⚠️  Edge 调用失败: {}", e);
                }
            }
        }

        // 3. Edge 失败时，尝试 Chrome（备用）
        let chrome_paths = [
            format!("{}\\Google\\Chrome\\Application\\chrome.exe", env::var("PROGRAMFILES").unwrap_or("C:\\Program Files".to_string())),
            format!("{}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe", env::var("USERPROFILE").unwrap_or("C:\\Users\\Default".to_string())),
        ];
        for path in chrome_paths {
            if Path::new(&path).exists() {
                match Command::new(&path)
                    .args(["--new-window", (&file_url).as_ref()])
                    .spawn()
                {
                    Ok(_) => {
                        println!("✅ 已强制使用 Google Chrome 打开文件");
                        return Ok(format!("✅ 正在用 Chrome 浏览器打开: {}", file_path));
                    }
                    Err(e) => {
                        println!("⚠️  Chrome 调用失败: {}", e);
                        continue;
                    }
                }
            }
        }

        // 4. 最后兜底（仍可能走默认程序，但保证功能不挂）
        match Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", &file_path])
            .spawn()
        {
            Ok(_) => {
                println!("⚠️  已调用系统默认程序打开（建议检查 .html 文件关联）");
                Ok(format!("✅ 正在用系统默认程序打开: {}", file_path))
            }
            Err(e) => {
                println!("❌ 所有方法都失败: {}", e);
                Err(format!("❌ 无法打开文件: {}", e))
            }
        }
    }

    // macOS/Linux 逻辑（无需修改，原本就生效）
    #[cfg(target_os = "macos")]
    {
        match open(
            &app_handle,
            &file_url,
            Some("com.apple.Safari")
        ) {
            Ok(_) => {
                println!("✅ 已使用 Safari 打开文件");
                Ok(format!("✅ 正在用 Safari 打开: {}", file_path))
            }
            Err(e) => {
                println!("❌ 打开失败: {}", e);
                Err(format!("❌ 无法用浏览器打开文件: {}", e))
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        match Command::new("xdg-open").arg(&file_url).spawn() {
            Ok(_) => {
                println!("✅ 已使用默认浏览器打开文件");
                Ok(format!("✅ 正在用默认浏览器打开: {}", file_path))
            }
            Err(e) => {
                println!("❌ 打开失败: {}", e);
                Err(format!("❌ 无法用浏览器打开文件: {}", e))
            }
        }
    }
}