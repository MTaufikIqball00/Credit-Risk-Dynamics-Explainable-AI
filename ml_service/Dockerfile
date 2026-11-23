FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl && rm -rf /var/lib/apt/lists/*
COPY ml_service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ml_service/app ./app
RUN mkdir -p /app/artifacts
ENV PORT=8241
EXPOSE 8241
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8241"]
