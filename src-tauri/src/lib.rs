// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::env;

#[tauri::command]
fn greet(name: &str) -> String {
    // 根据传入的 img_path 创建完整的命令
    // --boxScoreThresh 0.5 \
    let command = format!(
        "tools\\win-BIN-CPU-x64\\RapidOcrOnnx.exe --models tools\\win-BIN-CPU-x64\\models \
         --det ch_PP-OCRv4_det_infer.onnx \
        --cls ch_ppocr_mobile_v2.0_cls_infer.onnx \
        --rec ch_PP-OCRv4_rec_infer.onnx \
        --keys ppocr_keys_v1.txt \
        --image {} \
        --numThread {} \
        --padding 50 \
        --maxSideLen 1024 \
        --boxThresh 0.3 \
        --unClipRati 1.6 \
        --doAngle 1 \
        --mostAngle 1",
        "tools\\img\\1.png",
        4
    );
    println!("命令: {}", command);
    // 运行命令行命令
    let output = ps(&command);
    // 返回格式化的结果
    format!("你好!: {}", output)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("当前工作目录: {:?}", env::current_dir());
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::process::Command;
fn ps(cmd_command: &str) -> String {
    // 位移到env::current_dir()目录下执行命令cmd_command
    let output = Command::new("cmd")
        .current_dir(env::current_dir().unwrap())
        .args(&["/C", cmd_command])
        .output()
        .expect("failed to execute command");
    println!("Command output:{:?}", output);
    let out: String = String::from_utf8(output.stdout).unwrap();
    // 输出命令执行的结果
    println!("{}", out);
    //     返回命令执行的结果
    return out;
}
