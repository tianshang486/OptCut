use std::{env, os::windows::process::CommandExt, process::Command};
use std::path::{Path, PathBuf};
use image::open;
use mouse_position::mouse_position::Mouse;
use serde::{Deserialize, Serialize};
use serde_json::json;
use xcap::{image, Monitor};
use crate::utils::{color, read_conf::read_conf};
use crate::utils::sql::{get_shortcut_keys, init_db, query_tables};
// use paddleocr::Ppocr;
use tauri::Manager;

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

    // 根据平台选择正确的可执行文件路径
    #[cfg(target_os = "windows")]
    let exe_path = "tools\\RapidOCR-json_v0.2.0\\RapidOCR-json.exe";
    #[cfg(target_os = "macos")]
    let exe_path = "tools/RapidOCR-json_v0.2.0/RapidOCR-json";
    #[cfg(target_os = "linux")]
    let exe_path = "tools/RapidOCR-json_v0.2.0/RapidOCR-json";

    // 使用平台无关的路径分隔符
    let models_path = Path::new("tools")
        .join("RapidOCR-json_v0.2.0")
        .join("models");

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

    #[cfg(target_os = "windows")]
    let exe_path = "tools\\PaddleOCR-json_v1.4.1\\PaddleOCR-json.exe";
    #[cfg(target_os = "macos")]
    let exe_path = "tools/PaddleOCR-json_v1.4.1/PaddleOCR-json";
    #[cfg(target_os = "linux")]
    let exe_path = "tools/PaddleOCR-json_v1.4.1/PaddleOCR-json";

    #[cfg(target_os = "windows")]
    let mut command = Command::new(exe_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(exe_path);
    // 使用平台无关的路径分隔符
    let models_path = Path::new("tools")
        .join("PaddleOCR-json_v1.4.1")
        .join("models")
        .join("config_chinese.txt");
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
    let json_line = stdout.lines()
        .last()
        .unwrap_or_default();

    // 解析JSON并处理Unicode编码
    let decoded_result: serde_json::Value = serde_json::from_str(json_line)
        .map_err(|e| format!("解析JSON失败: {}", e))?;

    print!("{:?}", decoded_result);
    Ok(decoded_result.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn capture_screen_one() -> Result<String, String> {
    let my_struct = Struct::new();
    // 直接获取鼠标位置和应屏幕，避免获取所有显示器
    let position = Mouse::get_mouse_position();
    let (x, y) = if let Mouse::Position { x, y } = position {
        (x, y)
    } else {
        return Err("获取鼠标位置失败".to_string());
    };

    // 直接从坐标获取显示器
    let screen = Monitor::from_point(x, y).map_err(|_| "无法获取显示器信息".to_string())?;
    println!("{:?}", screen);
    // 直接截图保存
    let image_data = screen.capture_image().map_err(|_| "截图失败".to_string())?;

    image_data
        .save(&my_struct.image_path)
        .map_err(|_| "保存截图失败".to_string())?;
    //    .map_err(|_| "打开截图失败".to_string())?;
    // 构建返回数据
    Ok(json!({
        "path": my_struct.image_path.to_string(),
        "x": x,
        "y": y,
        "window_x": screen.x(),
        "window_y": screen.y(),
        "width": screen.width(),
        "height": screen.height()
    })
    .to_string())
}

#[tauri::command(rename_all = "snake_case")]
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

// #[tauri::command(rename_all = "snake_case")]
// fn copied_to_clipboard(image_path: &str) -> Result<String, String> {
//     let set_image = ClipBoardOprator::set_image;
//     // 读取图片数据为base64
//     let img = img_util::image_to_base64(image_path.as_ref()).map_err(|e| e.to_string())?;
//     // // 转换为ImageData
//     let img_db = img_util::base64_to_rgba8(&img)?;
//     // // 构建ImageDataDB
//     // let base64 = img_util::rgba8_to_base64(&img_db);
//     // println!("图片base64已转换");
//     // let content_db = ImageDataDB {
//     //     width: img_db.width,
//     //     height: img_db.height,
//     //     base64: img,
//     // };
//     // 保存到剪贴板
//     set_image(img_db).map_err(|e| e.to_string())?;
//     // 清空缓存
//     drop(img);
//     Ok(json!({
//         "success": true,
//         "message": "图片已复制到剪贴板"
//     })
//         .to_string())
// }

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
        let current_exe = env::current_exe()
            .map_err(|e| format!("Failed to get current exe path: {}", e))?;
        
        Command::new(&current_exe)
            .spawn()
            .map_err(|e| format!("Failed to start new process: {}", e))?;
        
        app_handle.exit(0);
    }

    Ok(())
}
