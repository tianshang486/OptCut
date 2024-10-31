// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::env;
mod config;
use config::Config;

#[tauri::command(rename_all = "snake_case")]
fn greet(image_path: &str) -> String {
    // 根据传入的 img_path 创建完整的命令
    // 给image_path增加双引号
    // let image_path = format!("\"{}\"", imagePaths);
    println!("image_path: {}", image_path);
    main().expect("TODO: panic message");
    // 运行命令行命令
    let output = ps_ocr(&image_path);
    // 返回格式化的结果
    format!("你好!: {}", output)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("当前工作目录: {:?}", env::current_dir());
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, capture_screen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::process::Command;
fn ps_ocr(image_path: &str) -> String {
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
    return result.parse().unwrap();
}

fn use_config(config: &Config) {
    println!("Database server: {}", config.database.server);
    println!("Server port: {}", config.server.port);
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config_str = std::fs::read_to_string("config.toml")?;
    let config: config::Config = toml::from_str(&config_str)?;

    use_config(&config);

    Ok(())
}

use std::time::Instant;
use xcap::Monitor;

fn normalized(filename: &str) -> String {
    filename
        .replace("|", "")
        .replace("\\", "")
        .replace(":", "")
        .replace("/", "")
}

#[tauri::command(rename_all = "snake_case")]
fn capture_screen(x: u32, y: u32) {
    let start = Instant::now();
    let monitors = Monitor::all().unwrap();
    println!("监视器数量: {}, 位置: ({}, {})" , monitors.len(), x, y);
    for monitor in monitors {
        let image = monitor.capture_image().unwrap();
        image
            .save(format!("target/monitor-{}.png", normalized(monitor.name())))
            .unwrap();
    }

    println!("运行耗时: {:?}", start.elapsed());
}