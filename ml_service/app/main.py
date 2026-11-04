import uvicorn
from fastapi import FastAPI, HTTPException
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
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NLPClassifyRequest(BaseModel):
    descriptions: List[str]

class PredictRiskRequest(BaseModel):
    customer_id: str
    features: Dict[str, Any]
    model_type: Optional[str] = "LightGBM"

class TrainRequest(BaseModel):
    algorithm: str # "LightGBM" or "XGBoost"
    n_samples: Optional[int] = 500
    random_state: Optional[int] = 42

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
        "disclaimer": "Academic & Research Prototype - Synthetic Data Only"
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
    X, y = trainer_instance.generate_synthetic_training_data(req.n_samples or 500, req.random_state or 42)
    if req.algorithm.lower() == "xgboost":
        _, metrics = trainer_instance.train_xgboost(X, y, req.random_state or 42)
    else:
        _, metrics = trainer_instance.train_lightgbm(X, y, req.random_state or 42)
    
    # Refresh explainers
    explainer_instance._init_explainers()

    return {
        "status": "SUCCESS",
        "algorithm": req.algorithm,
        "metrics": metrics
    }

@app.post("/api/monitoring/drift")
def calculate_drift(req: DriftRequest):
    return drift_detector_instance.evaluate_feature_drift(req.baseline_features, req.current_features)

@app.post("/api/fairness/audit")
def audit_fairness(req: FairnessRequest):
    return fairness_auditor_instance.audit_cohorts(req.cohorts_data)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8241))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)
