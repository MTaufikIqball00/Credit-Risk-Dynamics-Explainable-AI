use std::env;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub host: String,
    pub database_url: String,
    pub ml_service_url: String,
    pub cors_allowed_origins: Vec<String>,
    #[allow(dead_code)]
    pub environment: String,
}

fn normalize_database_url(raw: String) -> String {
    if !raw.starts_with("sqlite://") || raw.contains(":memory:") {
        return raw;
    }
    let rest = raw.trim_start_matches("sqlite://");
    let mut parts = rest.splitn(2, '?');
    let path_str = parts.next().unwrap_or("data/credit_risk.db");
    let query = parts.next();

    let p = Path::new(path_str);
    if p.is_absolute() {
        return raw;
    }

    // Normalize relative path so running from either project root or backend/ hits <project_root>/data/credit_risk.db
    let resolved: PathBuf = if path_str.starts_with("data/") || path_str.starts_with("data\\") {
        if Path::new("backend/Cargo.toml").exists() {
            PathBuf::from(path_str)
        } else if Path::new("../backend/Cargo.toml").exists() {
            PathBuf::from("..").join(path_str)
        } else {
            PathBuf::from(path_str)
        }
    } else {
        PathBuf::from(path_str)
    };

    let normalized = resolved.to_string_lossy().replace('\\', "/");
    match query {
        Some(q) => format!("sqlite://{}?{}", normalized, q),
        None => format!("sqlite://{}", normalized),
    }
}

impl AppConfig {
    pub fn load() -> Self {
        // Load .env from project root or parent dir when invoked from backend/
        if dotenvy::dotenv().is_err() {
            let _ = dotenvy::from_filename("../.env");
        }

        let port = env::var("PORT")
            .or_else(|_| env::var("RUST_PORT"))
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8240);

        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        let raw_db_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://data/credit_risk.db?mode=rwc".to_string());
        let database_url = normalize_database_url(raw_db_url);

        let ml_service_url =
            env::var("ML_SERVICE_URL").unwrap_or_else(|_| "http://127.0.0.1:8241".to_string());

        let cors_allowed_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3240,http://127.0.0.1:3240".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let environment = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        Self {
            port,
            host,
            database_url,
            ml_service_url,
            cors_allowed_origins,
            environment,
        }
    }
}
