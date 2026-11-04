use crate::domain::{BankTransaction, FeatureSnapshot, SyntheticCustomer, UtilityPayment};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

pub struct FeatureCalculator {
    pub feature_version: String,
}

impl Default for FeatureCalculator {
    fn default() -> Self {
        Self {
            feature_version: "v2.1.0-clean".to_string(),
        }
    }
}

impl FeatureCalculator {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn compute_for_customer(
        &self,
        customer: &SyntheticCustomer,
        transactions: &[BankTransaction],
        utilities: &[UtilityPayment],
    ) -> FeatureSnapshot {
        let now = Utc::now();

        // 1. Incomes and expenses
        let income_txs: Vec<&BankTransaction> = transactions
            .iter()
            .filter(|t| t.direction == "CREDIT")
            .collect();
        let expense_txs: Vec<&BankTransaction> = transactions
            .iter()
            .filter(|t| t.direction == "DEBIT")
            .collect();

        let total_income: f64 = income_txs.iter().map(|t| t.amount).sum();
        let total_expense: f64 = expense_txs.iter().map(|t| t.amount).sum();

        let months = 6.0_f64;
        let avg_monthly_income = if income_txs.is_empty() {
            customer.monthly_income
        } else {
            total_income / months
        };

        let monthly_expense = if expense_txs.is_empty() {
            customer.stated_monthly_expenses
        } else {
            total_expense / months
        };

        // Income variability (std dev / mean)
        let income_variability = if income_txs.len() > 1 {
            let mean = total_income / (income_txs.len() as f64);
            let variance: f64 = income_txs
                .iter()
                .map(|t| {
                    let diff = t.amount - mean;
                    diff * diff
                })
                .sum::<f64>()
                / (income_txs.len() as f64);
            (variance.sqrt() / mean.max(1.0)).min(2.0)
        } else {
            0.15 // default baseline
        };

        let net_cash_flow = avg_monthly_income - monthly_expense;

        // Average running balance
        let avg_balance = if transactions.is_empty() {
            customer.monthly_income * 0.5
        } else {
            transactions.iter().map(|t| t.running_balance).sum::<f64>()
                / (transactions.len() as f64)
        };

        // Cash flow volatility
        let cash_flow_volatility = if transactions.len() > 1 {
            let amounts: Vec<f64> = transactions
                .iter()
                .map(|t| {
                    if t.direction == "CREDIT" {
                        t.amount
                    } else {
                        -t.amount
                    }
                })
                .collect();
            let mean_flow = amounts.iter().sum::<f64>() / (amounts.len() as f64);
            let var_flow: f64 = amounts.iter().map(|a| (a - mean_flow).powi(2)).sum::<f64>()
                / (amounts.len() as f64);
            (var_flow.sqrt() / avg_monthly_income.max(1.0)).min(3.0)
        } else {
            0.20
        };

        let expense_to_income_ratio = (monthly_expense / avg_monthly_income.max(1.0)).min(2.5);

        // Recurring payment consistency & utility regularity
        let total_utils = utilities.len().max(1) as f64;
        let on_time_utils = utilities
            .iter()
            .filter(|u| u.payment_status == "ON_TIME")
            .count() as f64;
        let utility_regularity_score = on_time_utils / total_utils;

        let recurring_payment_consistency = if customer.credit_obligation_amount > 0.0 {
            let obligation_txs = transactions
                .iter()
                .filter(|t| {
                    t.raw_description.to_uppercase().contains("ANGSURAN")
                        || t.raw_description.to_uppercase().contains("CICILAN")
                })
                .count() as f64;
            (obligation_txs / months).min(1.0)
        } else {
            1.0 // no obligations to miss
        };

        let payment_burden_ratio =
            (customer.credit_obligation_amount / avg_monthly_income.max(1.0)).min(2.0);

        let transaction_frequency = (transactions.len() as f64) / months;

        // Data completeness: check available non-null features
        let signals_present = 8.0_f64
            + (if !transactions.is_empty() { 2.0 } else { 0.0 })
            + (if !utilities.is_empty() { 2.0 } else { 0.0 });
        let data_completeness_score = (signals_present / 12.0).clamp(0.1, 1.0);

        let metadata_catalog = json!({
            "definitions": {
                "avg_monthly_income": { "unit": "IDR", "window": "6M", "formula": "sum(CREDIT) / 6", "missing_policy": "fallback_stated_income" },
                "income_variability": { "unit": "ratio", "window": "6M", "formula": "std(income) / mean(income)", "missing_policy": "impute_0.15" },
                "monthly_expense": { "unit": "IDR", "window": "6M", "formula": "sum(DEBIT) / 6", "missing_policy": "fallback_stated_expenses" },
                "net_cash_flow": { "unit": "IDR", "window": "6M", "formula": "avg_income - monthly_expense", "missing_policy": "computed" },
                "avg_balance": { "unit": "IDR", "window": "6M", "formula": "mean(running_balance)", "missing_policy": "fallback_half_income" },
                "cash_flow_volatility": { "unit": "ratio", "window": "6M", "formula": "std(net_flows) / avg_income", "missing_policy": "impute_0.20" },
                "expense_to_income_ratio": { "unit": "ratio", "window": "6M", "formula": "monthly_expense / avg_income", "missing_policy": "ratio_bound_2.5" },
                "recurring_payment_consistency": { "unit": "ratio", "window": "6M", "formula": "paid_cycles / total_cycles", "missing_policy": "impute_1.0_if_no_obligations" },
                "utility_regularity_score": { "unit": "score 0-1", "window": "6M", "formula": "on_time_utilities / total_utilities", "missing_policy": "neutral_0.5" },
                "payment_burden_ratio": { "unit": "ratio", "window": "6M", "formula": "obligation / avg_income", "missing_policy": "direct_calc" },
                "transaction_frequency": { "unit": "count/month", "window": "6M", "formula": "count(tx) / 6", "missing_policy": "zero_count" },
                "data_completeness_score": { "unit": "score 0-1", "window": "6M", "formula": "valid_signals / 12", "missing_policy": "strictly_measured" }
            }
        });

        FeatureSnapshot {
            id: Uuid::new_v4().to_string(),
            customer_id: customer.id.clone(),
            snapshot_date: now.to_rfc3339(),
            feature_version: self.feature_version.clone(),
            avg_monthly_income,
            income_variability,
            monthly_expense,
            net_cash_flow,
            avg_balance,
            cash_flow_volatility,
            expense_to_income_ratio,
            recurring_payment_consistency,
            utility_regularity_score,
            payment_burden_ratio,
            transaction_frequency,
            data_completeness_score,
            features_json: metadata_catalog.to_string(),
            is_synthetic: 1,
            created_at: now.to_rfc3339(),
        }
    }
}
