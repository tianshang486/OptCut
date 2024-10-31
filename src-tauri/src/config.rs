// config.rs
use lazy_static::lazy_static;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize, Clone)]
pub struct Config {
    pub database: Database,
    pub server: Server,
}

#[derive(Deserialize, Clone)]
pub struct Database {
    pub server: String,
    pub ports: Vec<u32>,
    pub connection_max: i64,
}

#[derive(Deserialize, Clone)]
pub struct Server {
    pub port: u32,
    pub ip: String,
}

lazy_static! {
    pub static ref CONFIG: Arc<Config> = {
        let config_str =
            std::fs::read_to_string("Config.toml").expect("Failed to read config file");
        toml::from_str(&config_str).expect("Failed to parse config file")
    };
}
