use credit_risk_backend::features::FeatureCalculator;
use credit_risk_backend::generator::SyntheticGenerator;

#[test]
fn test_synthetic_generator_determinism() {
    let generator = SyntheticGenerator::new();
    let bundle1 = generator.generate_dataset("Dataset-1", "small", 20, 12345);
    let bundle2 = generator.generate_dataset("Dataset-2", "small", 20, 12345);

    assert_eq!(bundle1.customers.len(), bundle2.customers.len());
    assert_eq!(bundle1.accounts.len(), bundle2.accounts.len());
    assert_eq!(bundle1.transactions.len(), bundle2.transactions.len());
    assert_eq!(bundle1.utilities.len(), bundle2.utilities.len());

    for i in 0..bundle1.customers.len() {
        assert_eq!(
            bundle1.customers[i].monthly_income,
            bundle2.customers[i].monthly_income
        );
        assert_eq!(
            bundle1.customers[i].simulation_profile,
            bundle2.customers[i].simulation_profile
        );
        assert_eq!(
            bundle1.customers[i].is_defaulted,
            bundle2.customers[i].is_defaulted
        );
    }
}

#[test]
fn test_synthetic_data_integrity_and_referential_consistency() {
    let generator = SyntheticGenerator::new();
    let bundle = generator.generate_dataset("Dataset-Audit", "small", 25, 9999);

    assert_eq!(bundle.dataset.is_synthetic, 1);

    let customer_ids: std::collections::HashSet<String> =
        bundle.customers.iter().map(|c| c.id.clone()).collect();
    let account_ids: std::collections::HashSet<String> =
        bundle.accounts.iter().map(|a| a.id.clone()).collect();

    for customer in &bundle.customers {
        assert_eq!(customer.is_synthetic, 1);
        assert_eq!(customer.dataset_id, bundle.dataset.id);
    }

    for account in &bundle.accounts {
        assert_eq!(account.is_synthetic, 1);
        assert!(
            customer_ids.contains(&account.customer_id),
            "Account references invalid customer_id"
        );
    }

    for tx in &bundle.transactions {
        assert_eq!(tx.is_synthetic, 1);
        assert!(
            customer_ids.contains(&tx.customer_id),
            "Transaction references invalid customer_id"
        );
        assert!(
            account_ids.contains(&tx.account_id),
            "Transaction references invalid account_id"
        );
        assert!(
            tx.amount > 0.0,
            "Transaction amount must be strictly positive"
        );
        assert!(
            tx.running_balance >= 0.0,
            "Running balance cannot be negative"
        );
    }

    for util in &bundle.utilities {
        assert_eq!(util.is_synthetic, 1);
        assert!(
            customer_ids.contains(&util.customer_id),
            "Utility references invalid customer_id"
        );
        assert!(
            util.bill_amount > 0.0,
            "Utility bill amount must be positive"
        );
    }
}

#[test]
fn test_feature_calculator_boundaries_and_leakage_protection() {
    let generator = SyntheticGenerator::new();
    let bundle = generator.generate_dataset("Dataset-Features", "small", 15, 777);
    let calc = FeatureCalculator::new();

    for customer in &bundle.customers {
        let cust_txs: Vec<_> = bundle
            .transactions
            .iter()
            .filter(|t| t.customer_id == customer.id)
            .cloned()
            .collect();
        let cust_utils: Vec<_> = bundle
            .utilities
            .iter()
            .filter(|u| u.customer_id == customer.id)
            .cloned()
            .collect();

        let feat = calc.compute_for_customer(customer, &cust_txs, &cust_utils);

        // Boundary tests
        assert!(feat.data_completeness_score >= 0.0 && feat.data_completeness_score <= 1.0);
        assert!(feat.utility_regularity_score >= 0.0 && feat.utility_regularity_score <= 1.0);
        assert!(feat.expense_to_income_ratio >= 0.0);
        assert!(feat.payment_burden_ratio >= 0.0);
        assert!(feat.avg_monthly_income > 0.0);
        assert!(feat.monthly_expense >= 0.0);
        assert_eq!(feat.is_synthetic, 1);

        // Target leakage check: ensure features_json does not expose label
        assert!(!feat.features_json.contains("is_defaulted"));
        assert!(!feat.features_json.contains("default_reason"));
    }
}

#[tokio::test]
async fn test_autonomous_qa_engine_isolated_execution_and_recovery() {
    use credit_risk_backend::qa::QaEngine;
    use std::fs;

    let _ = fs::create_dir_all("data/qa_temp");
    let test_qa_db = format!(
        "data/qa_temp/test_qa_engine_{}.db",
        uuid::Uuid::new_v4()
    );
    let db_url = format!("sqlite://{}?mode=rwc", test_qa_db);

    let engine = QaEngine::init(&db_url, "http://127.0.0.1:8241".to_string())
        .await
        .expect("Failed to initialize isolated QaEngine");

    // Trigger a targeted smoke_test run
    let run_id = engine
        .enqueue_run("smoke_test", "CARGO_INTEGRATION_TEST")
        .await
        .expect("Should enqueue smoke_test");

    // Duplicate exclusive suite lock check: immediate second enqueue of smoke_test should be rejected
    let dup = engine.enqueue_run("smoke_test", "DUPLICATE_PROBE").await;
    assert!(
        dup.is_err(),
        "Exclusive suite lock must reject duplicate concurrent smoke_test"
    );

    // Wait for smoke_test to complete
    for _ in 0..40 {
        let status: Option<(String, i64)> = sqlx::query_as(
            "SELECT status, passed_tests FROM qa_runs WHERE id = ?",
        )
        .bind(&run_id)
        .fetch_optional(&engine.qa_pool)
        .await
        .unwrap();
        if let Some((st, passed)) = status {
            if st == "COMPLETED" {
                assert_eq!(passed, 1, "SMOKE-001 should pass");
                break;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    }

    engine.qa_pool.close().await;
    let _ = fs::remove_file(&test_qa_db);
    let _ = fs::remove_file(format!("{}-wal", test_qa_db));
    let _ = fs::remove_file(format!("{}-shm", test_qa_db));
}

