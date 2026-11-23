FROM rust:1.80-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/src ./backend/src
COPY backend/migrations ./backend/migrations
COPY backend/tests ./backend/tests
RUN cargo build --release --manifest-path backend/Cargo.toml

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl3 curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/backend/target/release/credit-risk-backend /usr/local/bin/credit-risk-backend
RUN mkdir -p /app/data /app/artifacts
ENV HOST=0.0.0.0
ENV PORT=8240
ENV DATABASE_URL=sqlite:///app/data/credit_risk.db?mode=rwc
ENV ML_SERVICE_URL=http://ml_service:8241
EXPOSE 8240
CMD ["credit-risk-backend"]
