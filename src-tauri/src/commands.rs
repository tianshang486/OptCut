// use paddleocr::Ppocr;
use crate::utils::img_util::image_to_base64;
use crate::utils::sql::{get_shortcut_keys, init_db, query_tables};
use crate::utils::tencent_ocr::{call_tencent_ocr, get_tencent_config};
use crate::utils::{color, read_conf::read_conf, translate};
use image::open;
use mouse_position::mouse_position::Mouse;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::{env, os::windows::process::CommandExt, process::Command};
use tauri::Emitter;
use xcap::{image, Monitor};
use image::{ImageBuffer, Rgba};
static TRACKING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Deserialize)]
struct Struct {
    image_path: String,
}

impl Struct {
    // 构造函数，用于初始化 image_path
    fn new() -> Self {
        let image_path = env::temp_dir()
            .join(format!("{}.png", normalized("AGCut")))
            .to_string_lossy()
            .to_string();
        Self { image_path }
    }
}

// 获取颜色的 Tauri 命令
#[tauri::command]
pub fn get_color_at(x: i32, y: i32) -> Result<String, String> {
    color::get_pixel_color(x, y)
}


#[tauri::command(rename_all = "snake_case")]
pub async fn ps_ocr(image_path: &str) -> Result<String, String> {
    println!("image_path: {},开始R_OCR识别", image_path);

    // 获取当前执行文件的目录
    let current_exe = env::current_exe()
        .map_err(|e| format!("无法获取当前执行文件路径: {}", e))?;
    let run_dir = current_exe
        .parent()
        .ok_or_else(|| "无法获取执行文件目录".to_string())?;
    
    println!("current_exe_dir: {:?}", run_dir);

    // 构建工具路径
    #[cfg(target_os = "windows")]
    let exe_path = run_dir.join("tools\\RapidOCR-json_v0.2.0\\RapidOCR-json.exe");
    #[cfg(target_os = "macos")]
    let exe_path = run_dir.join("tools/RapidOCR-json_v0.2.0/RapidOCR-json");
    #[cfg(target_os = "linux")]
    let exe_path = run_dir.join("tools/RapidOCR-json_v0.2.0/RapidOCR-json");

    // 构建模型目录路径
    let models_path = run_dir.join("tools/RapidOCR-json_v0.2.0/models");

    println!("exe_path: {:?}, models_path: {:?}", exe_path, models_path);

    #[cfg(target_os = "windows")]
    let mut command = Command::new(exe_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(exe_path);

    let output = command
        .arg("--models")
        .arg(models_path)
        .arg("--det")
        .arg("ch_PP-OCRv4_det_infer.onnx")
        .arg("--cls")
        .arg("ch_ppocr_mobile_v2.0_cls_infer.onnx")
        .arg("--rec")
        .arg("rec_ch_PP-OCRv4_infer.onnx")
        .arg("--keys")
        .arg("ppocr_keys_v1.txt")
        .arg("--image_path")
        .arg(image_path)
        .output()
        .map_err(|e| format!("执行命令失败: {}", e))?;

    let out: String = String::from_utf8(output.stdout).unwrap();
    // 按换行符分割字符串,获取第二行
    let result: String = "[".to_string() + out.split("\n").collect::<Vec<&str>>()[2] + "]";
    // 转换为json格式
    let result: serde_json::Value = serde_json::from_str(&result).unwrap();
    // 输出json格式结果
    print!("{:?}", result);
    Ok(result.to_string())
}

// fn main() -> Result<(), Box<dyn Error>> {
//     println!("Hello, world!");
//     Ok(())
// }

fn normalized(filename: &str) -> String {
    filename
        .replace("|", "")
        .replace("\\", "")
        .replace(":", "")
        .replace("/", "")
}

#[tauri::command(rename_all = "snake_case")]
pub async fn ps_ocr_pd(image_path: &str) -> Result<String, String> {
    println!("image_path: {},开始PD_OCR识别", image_path);

    // 获取当前执行文件的目录
    let current_exe = env::current_exe()
        .map_err(|e| format!("无法获取当前执行文件路径: {}", e))?;
    let run_dir = current_exe
        .parent()
        .ok_or_else(|| "无法获取执行文件目录".to_string())?;
    
    println!("current_exe_dir: {:?}", run_dir);

    // 构建工具路径
    #[cfg(target_os = "windows")]
    let exe_path = run_dir.join("tools\\PaddleOCR-json_v1.4.1\\PaddleOCR-json.exe");
    #[cfg(target_os = "macos")]
    let exe_path = run_dir.join("tools/PaddleOCR-json_v1.4.1/PaddleOCR-json");
    #[cfg(target_os = "linux")]
    let exe_path = run_dir.join("tools/PaddleOCR-json_v1.4.1/PaddleOCR-json");

    println!("exe_path: {:?}", exe_path);

    // 构建配置文件路径
    let models_path = run_dir.join("tools/PaddleOCR-json_v1.4.1/models/config_chinese.txt");

    #[cfg(target_os = "windows")]
    let mut command = Command::new(exe_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(exe_path);

    let output = command
        .arg("--config_path")
        .arg(models_path)
        .arg("--image_path")
        .arg(image_path)
        .output()
        .map_err(|e| format!("执行OCR命令失败: {}", e))?;

    // 获取输出并转换为字符串
    let stdout = String::from_utf8(output.stdout).unwrap();
    // 按换行符分割，获取JSON结果（最后一行）
    let json_line = stdout.lines().last().unwrap_or_default();

    // 解析JSON并处理Unicode编码
    let decoded_result: serde_json::Value =
        serde_json::from_str(json_line).map_err(|e| format!("解析JSON失败: {}", e))?;

    print!("{:?}", decoded_result);
    Ok(decoded_result.to_string())
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


#[tauri::command()]
pub async fn capture_screen_one() -> Result<String, String> {
    let my_struct = Struct::new();
    // get_mouse_position 获取鼠标位置
    let mouse_position = get_mouse_position().await?;
    let mouse_position: serde_json::Value = serde_json::from_str(&mouse_position).unwrap();
    let x = mouse_position["x"].as_i64().unwrap_or_default();
    let y = mouse_position["y"].as_i64().unwrap_or_default();


    // 直接从坐标获取显示器
    let screen = Monitor::from_point(x as i32, y as i32).map_err(|_| "无法获取显示器信息".to_string())?;
    println!("{:?}", screen);
    // 直接截图保存
    let image_data = screen.capture_image().map_err(|_| "截图失败".to_string())?;

    image_data
        .save(&my_struct.image_path)
        .map_err(|_| "保存截图失败".to_string())?;

    // 构建返回数据，处理所有可能的Result
    Ok(json!({
        "path": my_struct.image_path.to_string(),
        "x": x,
        "y": y,
        "window_x": screen.x().unwrap_or_default(),
        "window_y": screen.y().unwrap_or_default(),
        "width": screen.width().unwrap_or_default(),
        "height": screen.height().unwrap_or_default()
    })
    .to_string())
}

#[tauri::command()]
pub fn capture_screen_fixed(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    let my_struct = Struct::new();
    // 直接获取鼠标位置和对应屏幕，避免获取所有显示器
    // 读取原始截图
    let mut img = open(&my_struct.image_path).map_err(|_| "无法打开原始图片".to_string())?;
    // 根据鼠标位置获取图片裁剪位置,注意鼠标位置存在负值,要与屏幕尺寸相加
    // println!("{} {} 图片尺寸", img.width(), x);
    let x_new: i32 = if x < 0 {
        img.width() as i32 + x as i32
    } else if img.width() < x as u32 && x > 0 {
        x - img.width() as i32 as i32
    } else {
        x
    };
    // println!("图片尺寸: {}x{} x,y: {},{}", width, height, x_new, y);
    // 裁剪图片
    let cropped = img.crop(x_new as u32, y as u32, width, height);
    // 保存裁剪后的图片,增加时间戳避免覆盖
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    // 保存裁剪后的图片,增加时间戳避免覆盖
    let path = env::temp_dir().join(format!("AGCut_{}.png", timestamp));
    cropped
        .save(&path)
        .map_err(|_| "保存裁剪图片失败".to_string())?;
    // 构建返回数据
    Ok(json!({
        "path": path.to_string_lossy().to_string(),
    })
    .to_string())
}

// 删除临时文,以AGCut开头的文件
#[tauri::command(rename_all = "snake_case")]
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
#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

        Command::new(&current_exe)
            .spawn()
            .map_err(|e| format!("Failed to start new process: {}", e))?;

        app_handle.exit(0);
    }
    Ok(())
}

#[tauri::command]
pub async fn read_image_base64(path: String) -> Result<String, String> {
    image_to_base64(Path::new(&path)).map_err(|e| e.to_string())
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