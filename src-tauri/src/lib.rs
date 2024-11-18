// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod config;
use config::Config;
use image::open;
use mouse_position::mouse_position::Mouse;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use std::env;
use std::io::Read;
use std::process::Command;
use tauri::Manager;
use xcap::{image, Monitor};

// fn greet(image_path: &str) {
//     // 根据传入的 img_path 创建完整的命令
//     // 给image_path增加双引号
//     // let image_path = format!("\"{}\"", imagePaths);
//     println!("image_path: {}", image_path);
//     main().expect("TODO: panic message")
//     // 运行命令行命令
//     // let output = ps_ocr(&image_path);
//     // 返回格式化的结果
//     // format!("你好!: {}", output)
// }
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("当前工作目录: {:?}", env::current_dir());
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            capture_screen_one,
            capture_screen_fixed,
            ps_ocr,
            get_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

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

#[tauri::command(rename_all = "snake_case")]
fn ps_ocr(image_path: &str) -> Result<String, String> {
    println!("image_path: {},开始OCR识别", image_path);
    // 直接调用可执行文件，避免使用 cmd
    let output = Command::new("tools\\RapidOCR-json_v0.2.0\\RapidOCR-json.exe")
        .arg("--models")
        .arg("tools\\RapidOCR-json_v0.2.0\\models")
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
        .expect("failed to execute command");

    let out: String = String::from_utf8(output.stdout).unwrap();
    // 按换行符分割字符串,获取第二行
    let result = out.split("\n").collect::<Vec<&str>>()[2];
    // 去除空格和引号
    println!("cmd output: {}", result);
    Ok(result.trim().replace("\"", ""))
}

fn use_config(config: &Config) {
    println!("Database server: {}", config.database.server);
    println!("Server port: {}", config.server.port);
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config_str = std::fs::read_to_string("config.toml")?;
    let config: Config = toml::from_str(&config_str)?;

    use_config(&config);

    Ok(())
}

fn normalized(filename: &str) -> String {
    filename
        .replace("|", "")
        .replace("\\", "")
        .replace(":", "")
        .replace("/", "")
}

#[tauri::command(rename_all = "snake_case")]
fn capture_screen_one() -> Result<String, String> {
    let my_struct = Struct::new();
    // 直接获取鼠标位置和对应屏幕，避免获取所有显示器
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
fn capture_screen_fixed(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    let my_struct = Struct::new();
    // 直接获取鼠标位置和对应屏幕，避免获取所有显示器
    // 读取原始截图
    let mut img = open(&my_struct.image_path).map_err(|_| "无法打开原始图片".to_string())?;
    // 根据鼠标位置获取图片裁剪位置,注意鼠标位置存在负值,需要与屏幕尺寸相加
    println!("{} {} 图片尺寸", img.width(), x);
    let x_new: i32 = if x < 0 {
        img.width() as i32 + x as i32
    } else if img.width() < x as u32 && x > 0 {
        x - img.width() as i32 as i32
    } else {
        x
    };
    println!("图片尺寸: {}x{} x,y: {},{}", width, height, x_new, y);
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

#[tauri::command(rename_all = "snake_case")]
fn get_base64(image_path: &str) -> Result<Vec<u8>, String> {
    // 读取图片数据为字节数组返回给前端
    let mut file = std::fs::File::open(image_path).map_err(|_| "打开图片失败".to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|_| "读取图片失败".to_string())?;

    Ok(buffer)
}

