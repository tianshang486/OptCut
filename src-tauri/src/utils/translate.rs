use crate::utils::sql::init_db;
use md5;
use rand;
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct TranslateResult {
    trans_result: Vec<TransResultItem>,
    error_code: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct TransResultItem {
    src: String,
    dst: String,
}

pub async fn baidu_translate(
    text: String,
    from: String,
    to: String,
    app_id: String,
    secret_key: String,
) -> Result<String, String> {
    let salt = rand::random::<u32>().to_string();
    let sign = format!("{}{}{}{}", app_id, text, salt, secret_key);
    let sign = format!("{:x}", md5::compute(sign));

    let client = reqwest::Client::new();
    print!("Requesting: {} {} {} {} {}", text, from, to, app_id, sign);
    let res = client
        .post("https://fanyi-api.baidu.com/api/trans/vip/translate")
        .form(&[
            ("q", text),
            ("from", from),
            ("to", to),
            ("appid", app_id),
            ("salt", salt),
            ("sign", sign),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body = res.text().await.map_err(|e| e.to_string())?;
    print!("Response: {}", body);
    Ok(body)
}

pub async fn get_baidu_config() -> Result<(String, String), String> {
    let pool = init_db().await?;

    // 读取百度翻译配置
    let configs: Vec<(String, String)> = sqlx::query_as(
        "SELECT config_key, config_value FROM system_config WHERE config_key IN ('baidu_app_id', 'baidu_secret_key')"
    )
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // 从结果中获取配置值
    let app_id = configs
        .iter()
        .find(|(key, _)| key == "baidu_app_id")
        .map(|(_, value)| value.as_str())
        .unwrap_or("");

    let secret_key = configs
        .iter()
        .find(|(key, _)| key == "baidu_secret_key")
        .map(|(_, value)| value.as_str())
        .unwrap_or("");

    if app_id.is_empty() || secret_key.is_empty() {
        return Err("百度翻译配置未设置".to_string());
    }

    Ok((app_id.to_string(), secret_key.to_string()))
}
