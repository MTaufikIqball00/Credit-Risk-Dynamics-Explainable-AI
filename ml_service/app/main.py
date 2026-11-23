import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

from .nlp.classifier import classifier_instance
from .models.trainer import trainer_instance
from .xai.explainer import explainer_instance
from .monitoring.drift import drift_detector_instance
from .fairness.audit import fairness_auditor_instance

app = FastAPI(
    title="AI Credit Risk ML & XAI Service",
    description="Microservice for NLP Classification, Tree-based Models, SHAP XAI, and Drift Tracking",
    version="2.1.0",
)

_raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3240,http://127.0.0.1:3240,http://localhost:8240,http://127.0.0.1:8240",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class NLPClassifyRequest(BaseModel):
    descriptions: List[str]


class PredictRiskRequest(BaseModel):
    customer_id: str
    features: Dict[str, Any]
    model_type: Optional[str] = "LightGBM"


class TrainRequest(BaseModel):
    algorithm: str  # "LightGBM", "XGBoost", or "Baseline_LogReg"
    n_samples: Optional[int] = 500
    random_state: Optional[int] = 42
    hyperparameters: Optional[Dict[str, Any]] = None
    artifact_path: Optional[str] = None


class DriftRequest(BaseModel):
    baseline_features: Dict[str, List[float]]
    current_features: Dict[str, List[float]]


class FairnessRequest(BaseModel):
    cohorts_data: List[Dict[str, Any]]


@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "Credit Risk ML Microservice",
        "models_loaded": list(trainer_instance.models.keys()),
        "port": int(os.getenv("PORT", 8241)),
        "disclaimer": "Academic & Research Prototype - Synthetic Data Only",
    }


@app.post("/api/nlp/classify")
def classify_nlp(req: NLPClassifyRequest):
    return classifier_instance.batch_classify(req.descriptions)


@app.get("/api/nlp/evaluate")
def evaluate_nlp():
    return classifier_instance.evaluate()


@app.post("/api/models/predict")
def predict_risk(req: PredictRiskRequest):
    return explainer_instance.explain_instance(req.features, req.model_type or "LightGBM")


@app.post("/api/models/train")
def train_model(req: TrainRequest):
    n_samples = req.n_samples or 500
    seed = req.random_state if req.random_state is not None else 42
    X, y = trainer_instance.generate_synthetic_training_data(n_samples, seed)

    algo_norm = req.algorithm.strip().lower()
    if "xgb" in algo_norm:
        canonical = "XGBoost"
        _, metrics = trainer_instance.train_xgboost(
            X, y, seed, hyperparameters=req.hyperparameters, artifact_path=req.artifact_path
        )
    elif "logreg" in algo_norm or "logistic" in algo_norm or "baseline" in algo_norm:
        canonical = "Baseline_LogReg"
        _, metrics = trainer_instance.train_logistic_regression(
            X, y, seed, hyperparameters=req.hyperparameters, artifact_path=req.artifact_path
        )
    else:
        canonical = "LightGBM"
        _, metrics = trainer_instance.train_lightgbm(
            X, y, seed, hyperparameters=req.hyperparameters, artifact_path=req.artifact_path
        )

    # Refresh explainers and dynamic global importances
    explainer_instance._init_explainers()

    return {
        "status": "SUCCESS",
        "algorithm": canonical,
        "artifact_path": metrics.get("artifact_path"),
        "metrics": metrics,
    }


@app.get("/api/models/compare")
def compare_models():
    comparison = []
    specs = [
        ("LightGBM", "LightGBM-Research-v2.0", "TreeExplainer (Exact Fast)", 3.4, "CHAMPION"),
        ("XGBoost", "XGBoost-Research-v2.0", "Native C++ pred_contribs (Exact)", 4.1, "CHALLENGER"),
        (
            "Baseline_LogReg",
            "Baseline-LogReg-v1.0",
            "LinearSHAP (Exact)",
            0.7,
            "BENCHMARK_BASELINE",
        ),
    ]
    for key, name, shap_cap, lat, status in specs:
        m = trainer_instance.latest_metrics.get(key, {})
        comparison.append(
            {
                "model_name": name,
                "algorithm": key,
                "roc_auc": m.get("roc_auc", 0.0),
                "pr_auc": m.get("pr_auc", 0.0),
                "f1_score": m.get("f1_score", 0.0),
                "precision": m.get("precision", 0.0),
                "recall": m.get("recall", 0.0),
                "brier_score": m.get("brier_score", 0.0),
                "log_loss": m.get("log_loss", 0.0),
                "roc_curve": m.get("roc_curve", []),
                "calibration_curve": m.get("calibration_curve", []),
                "inference_latency_ms": lat,
                "shap_compatibility": shap_cap,
                "status": status,
            }
        )
    return {"comparison": comparison}


@app.post("/api/monitoring/drift")
def calculate_drift(req: DriftRequest):
    return drift_detector_instance.evaluate_feature_drift(
        req.baseline_features, req.current_features
    )


@app.post("/api/fairness/audit")
def audit_fairness(req: FairnessRequest):
    return fairness_auditor_instance.audit_cohorts(req.cohorts_data)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8241))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)
