use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub host: String,
    pub database_url: String,
    pub ml_service_url: String,
    #[allow(dead_code)]
    pub environment: String,
}

impl AppConfig {
    pub fn load() -> Self {
        dotenvy::dotenv().ok();

        let port = env::var("PORT")
            .or_else(|_| env::var("RUST_PORT"))
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8240);

        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://../data/credit_risk.db?mode=rwc".to_string());

        let ml_service_url =
            env::var("ML_SERVICE_URL").unwrap_or_else(|_| "http://127.0.0.1:8241".to_string());

        let environment = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        Self {
            port,
            host,
            database_url,
            ml_service_url,
            environment,
        }
    }
}
