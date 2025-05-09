use std::{env, os::windows::process::CommandExt, process::Command};

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

    // 构建配置文件路径
    let models_path = run_dir.join("tools/PaddleOCR-json_v1.4.1/models/config_chinese.txt");

    println!("exe_path: {:?}, models_path: {:?}", exe_path, models_path);

    #[cfg(target_os = "windows")]
    let mut command = Command::new(exe_path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(exe_path);

    let output = command
        .current_dir(run_dir) // 设置工作目录为应用程序目录
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
