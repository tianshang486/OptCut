use crate::commands::get_mouse_position;
use image::open;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use xcap::Monitor;
#[derive(Serialize, Deserialize)]
struct Struct {
    image_path: String,
}
fn normalized(filename: &str) -> String {
    filename
        .replace("|", "")
        .replace("\\", "")
        .replace(":", "")
        .replace("/", "")
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


#[derive(Deserialize, Serialize)]
pub struct ShortcutConfig {
    default: String,
    fixed_copy: String,
    fixed_ocr: String,
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
