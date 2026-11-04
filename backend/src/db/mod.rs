use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::fs;
use std::path::Path;
use std::str::FromStr;
use tracing::info;

pub async fn init_pool(
    database_url: &str,
) -> Result<SqlitePool, Box<dyn std::error::Error + Send + Sync>> {
    // Ensure parent directory exists for SQLite file
    if database_url.starts_with("sqlite://") {
        let file_path = database_url
            .trim_start_matches("sqlite://")
            .split('?')
            .next()
            .unwrap_or("credit_risk.db");
        if let Some(parent) = Path::new(file_path).parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
    }

    let connection_options = SqliteConnectOptions::from_str(database_url)?.create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect_with(connection_options)
        .await?;

    info!("Connected to SQLite database at {}", database_url);

    // Run migrations directly
    let migration_sql = include_str!("../../migrations/20261104_init.sql");
    sqlx::raw_sql(migration_sql).execute(&pool).await?;
    info!("Applied database schema migrations successfully");

    Ok(pool)
}
