use super::profiles::SimulationProfileType;
use crate::domain::{
    BankTransaction, ResearchDataset, SyntheticAccount, SyntheticCustomer, UtilityPayment,
};
use chrono::{Duration, Utc};
use rand::seq::SliceRandom;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde_json::json;
use uuid::Uuid;

pub struct GeneratedDataBundle {
    pub dataset: ResearchDataset,
    pub customers: Vec<SyntheticCustomer>,
    pub accounts: Vec<SyntheticAccount>,
    pub transactions: Vec<BankTransaction>,
    pub utilities: Vec<UtilityPayment>,
}

pub struct SyntheticGenerator {
    pub generator_version: String,
}

impl Default for SyntheticGenerator {
    fn default() -> Self {
        Self {
            generator_version: "v1.2.0-research".to_string(),
        }
    }
}

impl SyntheticGenerator {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn generate_dataset(
        &self,
        name: &str,
        profile_type: &str, // "small" (50), "medium" (250), "large" (1000)
        customer_count: usize,
        random_seed: u64,
    ) -> GeneratedDataBundle {
        let mut rng = ChaCha8Rng::seed_from_u64(random_seed);
        let dataset_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let data_dict = json!({
            "target": "is_defaulted (0: Non-default, 1: Default in synthetic simulation)",
            "default_definition": "Simulated financial distress: obligations > 70% income with severe cash depletion, or 90+ DPD on recurring obligations",
            "leakage_safeguard": "Default outcome is determined after time-series simulation from downstream cash depletion, not present in raw transaction streams",
            "features": [
                "avg_monthly_income (IDR)",
                "income_variability (standard deviation / mean)",
                "monthly_expense (IDR)",
                "net_cash_flow (IDR)",
                "avg_balance (IDR)",
                "cash_flow_volatility (coefficient of variation)",
                "expense_to_income_ratio (expense / income)",
                "recurring_payment_consistency (ratio 0.0 - 1.0)",
                "utility_regularity_score (ratio 0.0 - 1.0)",
                "payment_burden_ratio (obligations / income)",
                "transaction_frequency (tx per month)",
                "data_completeness_score (0.0 - 1.0)"
            ],
            "cohorts": ["Group_A (Audit cohort 1)", "Group_B (Audit cohort 2)", "Group_C (Audit cohort 3)"],
            "disclaimer": "SYNTHETIC RESEARCH DATA ONLY - NOT DERIVED FROM REAL PERSONS OR FINANCIAL INSTITUTIONS"
        });

        let dataset = ResearchDataset {
            id: dataset_id.clone(),
            name: name.to_string(),
            version: "1.0.0".to_string(),
            description: Some(format!(
                "Synthetic research dataset with {} customers generated using seed {}.",
                customer_count, random_seed
            )),
            profile_type: profile_type.to_string(),
            customer_count: customer_count as i64,
            random_seed: random_seed as i64,
            generator_version: self.generator_version.clone(),
            data_dictionary: data_dict.to_string(),
            is_synthetic: 1,
            created_at: now.to_rfc3339(),
        };

        let mut customers = Vec::with_capacity(customer_count);
        let mut accounts = Vec::with_capacity(customer_count);
        let mut all_transactions = Vec::new();
        let mut all_utilities = Vec::new();

        let cohorts = ["Group_A", "Group_B", "Group_C"];

        for i in 0..customer_count {
            let customer_id = Uuid::new_v4().to_string();
            let profile_type = SimulationProfileType::from_index(i);
            let profile_str = profile_type.as_str();
            let cohort = cohorts[i % cohorts.len()].to_string();

            // Set profile-specific financial baseline
            let (
                base_income,
                expense_ratio,
                obligation_ratio,
                credit_lines,
                history_months,
                employment,
            ): (f64, f64, f64, i64, i64, &str) = match profile_type {
                SimulationProfileType::StableIncome => (
                    rng.gen_range(12_000_000.0..35_000_000.0),
                    rng.gen_range(0.35..0.55),
                    rng.gen_range(0.05..0.20),
                    rng.gen_range(2..5),
                    rng.gen_range(24..72),
                    "Permanent Corporate Employee",
                ),
                SimulationProfileType::VariableIncome => (
                    rng.gen_range(8_000_000.0..28_000_000.0),
                    rng.gen_range(0.40..0.65),
                    rng.gen_range(0.10..0.30),
                    rng.gen_range(1..4),
                    rng.gen_range(12..48),
                    "Freelance / Commission Based",
                ),
                SimulationProfileType::IrregularIncome => (
                    rng.gen_range(6_000_000.0..20_000_000.0),
                    rng.gen_range(0.50..0.75),
                    rng.gen_range(0.15..0.35),
                    rng.gen_range(1..3),
                    rng.gen_range(8..36),
                    "Seasonal Contract Worker",
                ),
                SimulationProfileType::HighExpenseBurden => (
                    rng.gen_range(7_000_000.0..18_000_000.0),
                    rng.gen_range(0.65..0.90),
                    rng.gen_range(0.30..0.55),
                    rng.gen_range(3..6),
                    rng.gen_range(18..60),
                    "Private Sector Staff",
                ),
                SimulationProfileType::ConsistentPayment => (
                    rng.gen_range(10_000_000.0..30_000_000.0),
                    rng.gen_range(0.30..0.50),
                    rng.gen_range(0.10..0.25),
                    rng.gen_range(2..4),
                    rng.gen_range(30..80),
                    "Civil Servant / State Enterprise",
                ),
                SimulationProfileType::IrregularPayment => (
                    rng.gen_range(6_000_000.0..16_000_000.0),
                    rng.gen_range(0.60..0.85),
                    rng.gen_range(0.25..0.45),
                    rng.gen_range(2..5),
                    rng.gen_range(12..40),
                    "Informal / Small Merchant",
                ),
                SimulationProfileType::ThinFile => (
                    rng.gen_range(5_000_000.0..12_000_000.0),
                    rng.gen_range(0.40..0.60),
                    rng.gen_range(0.0..0.10),
                    rng.gen_range(0..1),
                    rng.gen_range(2..6),
                    "Entry-Level Professional",
                ),
                SimulationProfileType::NoCreditHistory => (
                    rng.gen_range(4_500_000.0..10_000_000.0),
                    rng.gen_range(0.45..0.65),
                    0.0,
                    0,
                    0,
                    "Recent Graduate / First Account",
                ),
            };

            let monthly_income = (base_income / 100_000.0).round() * 100_000.0;
            let stated_expenses = ((monthly_income * expense_ratio) / 50_000.0).round() * 50_000.0;
            let credit_obligations =
                ((monthly_income * obligation_ratio) / 50_000.0).round() * 50_000.0;

            // Generate account
            let account_id = Uuid::new_v4().to_string();
            let initial_balance =
                (monthly_income * rng.gen_range(0.8..2.5) / 100_000.0).round() * 100_000.0;
            let mut running_balance = initial_balance;

            let account = SyntheticAccount {
                id: account_id.clone(),
                customer_id: customer_id.clone(),
                account_number: format!("SYNTH-{:04}-{:04}", (i / 1000) + 10, i % 1000),
                account_type: "Checking/Savings".to_string(),
                current_balance: running_balance,
                currency: "IDR".to_string(),
                status: "ACTIVE".to_string(),
                is_synthetic: 1,
                created_at: (now - Duration::days(180)).to_rfc3339(),
            };
            accounts.push(account);

            // Generate 6 months of historical transactions
            let total_months = 6;
            let mut utility_missed_count = 0;
            let mut max_utility_dpd = 0;

            for month_idx in (0..total_months).rev() {
                let month_start = now - Duration::days((month_idx * 30 + 28) as i64);

                // Income deposit
                let income_variation = match profile_type {
                    SimulationProfileType::StableIncome => rng.gen_range(0.98..1.02),
                    SimulationProfileType::VariableIncome => rng.gen_range(0.75..1.25),
                    SimulationProfileType::IrregularIncome => rng.gen_range(0.40..1.40),
                    _ => rng.gen_range(0.90..1.10),
                };
                let actual_income =
                    (monthly_income * income_variation / 10_000.0).round() * 10_000.0;
                running_balance += actual_income;

                let income_descriptions = [
                    "GAJI BULANAN PT MANDIRI SEJAHTERA",
                    "PAYROLL TRANSFER PT TELKOM INDONESIA",
                    "PAYROLL SALARY DEPOSIT PT ASTRA",
                    "PENERIMAAN TRANSFER PENGHASILAN JASA",
                    "TRSF QRIS PENJUALAN TOKO SETTLEMENT",
                ];
                let chosen_income_desc = income_descriptions.choose(&mut rng).unwrap();

                all_transactions.push(BankTransaction {
                    id: Uuid::new_v4().to_string(),
                    account_id: account_id.clone(),
                    customer_id: customer_id.clone(),
                    transaction_date: (month_start + Duration::days(1)).to_rfc3339(),
                    amount: actual_income,
                    direction: "CREDIT".to_string(),
                    raw_description: chosen_income_desc.to_string(),
                    cleaned_description: chosen_income_desc.to_lowercase(),
                    running_balance,
                    is_synthetic: 1,
                    created_at: now.to_rfc3339(),
                });

                // Credit obligation payment if exists
                if credit_obligations > 0.0 {
                    let obligation_paid = credit_obligations.min(running_balance * 0.9);
                    running_balance -= obligation_paid;
                    all_transactions.push(BankTransaction {
                        id: Uuid::new_v4().to_string(),
                        account_id: account_id.clone(),
                        customer_id: customer_id.clone(),
                        transaction_date: (month_start + Duration::days(5)).to_rfc3339(),
                        amount: obligation_paid,
                        direction: "DEBIT".to_string(),
                        raw_description: "ANGSURAN PEMBIAYAAN BANK CICILAN".to_string(),
                        cleaned_description: "angsuran pembiayaan bank cicilan".to_string(),
                        running_balance,
                        is_synthetic: 1,
                        created_at: now.to_rfc3339(),
                    });
                }

                // Regular expenses (groceries, transport, dining, utilities)
                let expense_tx_count = match profile_type {
                    SimulationProfileType::ThinFile => rng.gen_range(2..4),
                    _ => rng.gen_range(6..14),
                };

                let remaining_expense = stated_expenses.max(1_000_000.0);
                let expense_per_tx = remaining_expense / (expense_tx_count as f64);

                let debit_descriptions = [
                    "BELANJA SUPERINDO HYPERMART",
                    "ALFAMART MINI MARKET BELANJA",
                    "INDOMARET POINT PAYMENT",
                    "GRAB RIDE TRANSPORT OVO",
                    "GOJEK GORIDE TRANSPORT",
                    "PENGISIAN BBM PERTAMINA SPBU",
                    "NETFLIX DIGITAL SUBSCRIPTION",
                    "TARIK TUNAI ATM BERSAMA",
                    "SEWA APARTEMEN BULANAN",
                    "TAGIHAN LISTRIK PLN POSTPAID",
                ];

                for tx_i in 0..expense_tx_count {
                    let tx_date = month_start + Duration::days((2 + tx_i * 2) as i64);
                    let actual_amt =
                        ((expense_per_tx * rng.gen_range(0.7..1.3)) / 5_000.0).round() * 5_000.0;
                    running_balance = (running_balance - actual_amt).max(50_000.0);
                    let desc = debit_descriptions.choose(&mut rng).unwrap();

                    all_transactions.push(BankTransaction {
                        id: Uuid::new_v4().to_string(),
                        account_id: account_id.clone(),
                        customer_id: customer_id.clone(),
                        transaction_date: tx_date.to_rfc3339(),
                        amount: actual_amt,
                        direction: "DEBIT".to_string(),
                        raw_description: desc.to_string(),
                        cleaned_description: desc.to_lowercase(),
                        running_balance,
                        is_synthetic: 1,
                        created_at: now.to_rfc3339(),
                    });
                }

                // Utility bills (PLN Electricity & PDAM Water)
                let is_irregular = matches!(
                    profile_type,
                    SimulationProfileType::IrregularPayment
                        | SimulationProfileType::HighExpenseBurden
                );
                let bill_amt = rng.gen_range(250_000.0..850_000.0);
                let (status, dpd) = if is_irregular && rng.gen_bool(0.35) {
                    let late_days = rng.gen_range(15..95);
                    if late_days >= 60 {
                        utility_missed_count += 1;
                        max_utility_dpd = max_utility_dpd.max(late_days);
                        ("MISSED", late_days)
                    } else {
                        max_utility_dpd = max_utility_dpd.max(late_days);
                        ("LATE", late_days)
                    }
                } else {
                    ("ON_TIME", 0)
                };

                let paid_amt = if status == "MISSED" { 0.0 } else { bill_amt };

                all_utilities.push(UtilityPayment {
                    id: Uuid::new_v4().to_string(),
                    customer_id: customer_id.clone(),
                    utility_type: "Electricity (PLN)".to_string(),
                    billing_period: format!("2026-{:02}", (total_months - month_idx)),
                    due_date: (month_start + Duration::days(20)).to_rfc3339(),
                    payment_date: if status == "MISSED" {
                        None
                    } else {
                        Some((month_start + Duration::days(20 + dpd)).to_rfc3339())
                    },
                    bill_amount: bill_amt,
                    paid_amount: paid_amt,
                    payment_status: status.to_string(),
                    days_past_due: dpd,
                    is_synthetic: 1,
                    created_at: now.to_rfc3339(),
                });
            }

            // Explicit Ground Truth Default Label Determination
            // Non-leaking criterion: distress triggered if severe cash flow deficit + low liquidity + multiple delinquencies
            let total_obligations_ratio = (credit_obligations + stated_expenses) / monthly_income;
            let severe_burden = total_obligations_ratio > 0.85;
            let buffer_depleted = running_balance < (0.25 * monthly_income);
            let chronic_delinquency = max_utility_dpd >= 90 || utility_missed_count >= 2;

            let (is_defaulted, default_reason) = if (severe_burden && buffer_depleted)
                || chronic_delinquency
            {
                (
                    1,
                    Some(
                        "Synthetic distress criteria met: DTI > 85% with cash buffer exhaustion and/or chronic delinquencies"
                            .to_string(),
                    ),
                )
            } else {
                (0, None)
            };

            customers.push(SyntheticCustomer {
                id: customer_id,
                dataset_id: dataset_id.clone(),
                customer_code: format!("CUST-{:05}", i + 1),
                simulation_profile: profile_str.to_string(),
                employment_type: employment.to_string(),
                monthly_income,
                stated_monthly_expenses: stated_expenses,
                credit_obligation_amount: credit_obligations,
                existing_credit_lines: credit_lines,
                credit_history_months: history_months,
                synthetic_cohort: cohort,
                is_defaulted,
                default_reason,
                is_synthetic: 1,
                created_at: now.to_rfc3339(),
            });
        }

        GeneratedDataBundle {
            dataset,
            customers,
            accounts,
            transactions: all_transactions,
            utilities: all_utilities,
        }
    }
}
