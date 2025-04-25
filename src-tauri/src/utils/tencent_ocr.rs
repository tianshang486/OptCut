use crate::utils::img_util::image_to_base64;
use crate::utils::sql::init_db;
use chrono::Utc;
use hex;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::path::Path;

pub async fn get_tencent_config() -> Result<(String, String), String> {
    let pool = init_db().await?;

    // 读取腾讯云配置
    let configs: Vec<(String, String)> = sqlx::query_as(
        "SELECT config_key, config_value FROM system_config WHERE config_key IN ('tencent_secret_id', 'tencent_secret_key', 'tencent_ocr_enabled')"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    // 从结果中获取配置值
    let secret_id = configs
        .iter()
        .find(|(key, _)| key == "tencent_secret_id")
        .map(|(_, value)| value.as_str())
        .unwrap_or("");

    let secret_key = configs
        .iter()
        .find(|(key, _)| key == "tencent_secret_key")
        .map(|(_, value)| value.as_str())
        .unwrap_or("");

    let enabled = configs
        .iter()
        .find(|(key, _)| key == "tencent_ocr_enabled")
        .map(|(_, value)| value.as_str())
        .unwrap_or("false");

    if enabled != "true" {
        return Err("腾讯云 OCR 未启用".to_string());
    }

    if secret_id.is_empty() || secret_key.is_empty() {
        return Err("腾讯云配置未设置".to_string());
    }
    print!("腾讯云配置：{} {}", secret_id, secret_key);
    Ok((secret_id.to_string(), secret_key.to_string()))
}

fn sign(key: &[u8], msg: &str) -> Vec<u8> {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).unwrap();
    mac.update(msg.as_bytes());
    mac.finalize().into_bytes().to_vec()
}

pub async fn call_tencent_ocr(
    image_path: &str,
    secret_id: &str,
    secret_key: &str,
) -> Result<String, String> {
    let client = Client::new();
    let base64_image = image_to_base64(Path::new(image_path)).map_err(|e| e.to_string())?;

    // 检查图片是否成功转换为 base64
    if base64_image.is_empty() {
        return Err("图片转换失败".to_string());
    }

    let timestamp = Utc::now().timestamp();
    let date = Utc::now().format("%Y-%m-%d").to_string();

    // 准备参数
    let service = "ocr";
    let host = "ocr.tencentcloudapi.com";
    let action = "GeneralBasicOCR"; // 改为通用文字识别接口
    let version = "2018-11-19";
    let algorithm = "TC3-HMAC-SHA256";
    let region = "ap-guangzhou"; // 设置正确的区域

    // 简化 payload
    let payload = json!({
        "ImageBase64": base64_image
    })
    .to_string();

    // 步骤 1：拼接规范请求串
    let http_request_method = "POST";
    let canonical_uri = "/";
    let canonical_querystring = "";
    let ct = "application/json; charset=utf-8";
    let canonical_headers = format!(
        "content-type:{}\nhost:{}\nx-tc-action:{}\n",
        ct,
        host,
        action.to_lowercase()
    );
    let signed_headers = "content-type;host;x-tc-action";
    let hashed_request_payload = hex::encode(Sha256::digest(payload.as_bytes()));

    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        http_request_method,
        canonical_uri,
        canonical_querystring,
        canonical_headers,
        signed_headers,
        hashed_request_payload
    );

    // 步骤 2：拼接待签名字符串
    let credential_scope = format!("{}/{}/tc3_request", date, service);
    let hashed_canonical_request = hex::encode(Sha256::digest(canonical_request.as_bytes()));
    let string_to_sign = format!(
        "{}\n{}\n{}\n{}",
        algorithm, timestamp, credential_scope, hashed_canonical_request
    );

    // 步骤 3：计算签名
    let secret_date = sign(format!("TC3{}", secret_key).as_bytes(), &date);
    let secret_service = sign(&secret_date, service);
    let secret_signing = sign(&secret_service, "tc3_request");
    let signature = hex::encode(sign(&secret_signing, &string_to_sign));

    // 步骤 4：拼接 Authorization
    let authorization = format!(
        "{} Credential={}/{}, SignedHeaders={}, Signature={}",
        algorithm, secret_id, credential_scope, signed_headers, signature
    );

    // 步骤 5：构造并发起请求
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Authorization", authorization.parse().unwrap());
    headers.insert("Content-Type", ct.parse().unwrap());
    headers.insert("Host", host.parse().unwrap());
    headers.insert("X-TC-Action", action.parse().unwrap());
    headers.insert("X-TC-Timestamp", timestamp.to_string().parse().unwrap());
    headers.insert("X-TC-Version", version.parse().unwrap());
    if !region.is_empty() {
        headers.insert("X-TC-Region", region.parse().unwrap());
    }

    let response = client
        .post(format!("https://{}", host))
        .headers(headers)
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    println!("response: {:?}", response);
    let response_text = response.text().await.map_err(|e| e.to_string())?;
    println!("response_text: {}", response_text);

    // 解析腾讯云返回的 JSON
    let json: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // 转换结果格式
    let mut word_list = Vec::new();

    // 在函数内部定义一个默认坐标值
    let default_coord = json!({
        "LeftBottom": {"X": 0, "Y": 0},
        "LeftTop": {"X": 0, "Y": 0},
        "RightBottom": {"X": 0, "Y": 0},
        "RightTop": {"X": 0, "Y": 0}
    });

    // 处理通用文字识别的返回结果
    if let Some(word_list_data) = json.get("Response").and_then(|r| r.get("TextDetections")) {
        for word in word_list_data.as_array().unwrap_or(&vec![]) {
            if let Some(text) = word.get("DetectedText") {
                let coord = word.get("ItemPolygon").unwrap_or(&default_coord);

                word_list.push(json!({
                    "text": text.as_str().unwrap_or(""),
                    "box": [
                        [coord["X"].as_i64().unwrap_or(0), coord["Y"].as_i64().unwrap_or(0)],
                        [coord["X"].as_i64().unwrap_or(0), coord["Y"].as_i64().unwrap_or(0)],
                        [coord["X"].as_i64().unwrap_or(0), coord["Y"].as_i64().unwrap_or(0)],
                        [coord["X"].as_i64().unwrap_or(0), coord["Y"].as_i64().unwrap_or(0)]
                    ],
                    "score": 1.0
                }));
            }
        }
    }

    let result = json!({
        "code": 100,
        "data": word_list
    });
    println!(
        "OCR 结果: {}",
        serde_json::to_string_pretty(&result).unwrap()
    );
    Ok(serde_json::to_string_pretty(&result).unwrap())
}
