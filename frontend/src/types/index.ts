export interface ResearchDataset {
  id: string;
  name: string;
  version: string;
  description?: string;
  profile_type: string;
  customer_count: number;
  random_seed: number;
  generator_version: string;
  data_dictionary: string;
  is_synthetic: number;
  created_at: string;
}

export interface SyntheticCustomer {
  id: string;
  dataset_id: string;
  customer_code: string;
  simulation_profile: string;
  employment_type: string;
  monthly_income: number;
  stated_monthly_expenses: number;
  credit_obligation_amount: number;
  existing_credit_lines: number;
  credit_history_months: number;
  synthetic_cohort: string;
  is_defaulted: number;
  default_reason?: string;
  is_synthetic: number;
  created_at: string;
}

export interface SyntheticAccount {
  id: string;
  customer_id: string;
  account_number: string;
  account_type: string;
  current_balance: number;
  currency: string;
  status: string;
  is_synthetic: number;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  account_id: string;
  customer_id: string;
  transaction_date: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  raw_description: string;
  cleaned_description: string;
  running_balance: number;
  is_synthetic: number;
  created_at: string;
}

export interface UtilityPayment {
  id: string;
  customer_id: string;
  utility_type: string;
  billing_period: string;
  due_date: string;
  payment_date?: string;
  bill_amount: number;
  paid_amount: number;
  payment_status: 'ON_TIME' | 'LATE' | 'MISSED';
  days_past_due: number;
  is_synthetic: number;
  created_at: string;
}

export interface FeatureSnapshot {
  id: string;
  customer_id: string;
  snapshot_date: string;
  feature_version: string;
  avg_monthly_income: number;
  income_variability: number;
  monthly_expense: number;
  net_cash_flow: number;
  avg_balance: number;
  cash_flow_volatility: number;
  expense_to_income_ratio: number;
  recurring_payment_consistency: number;
  utility_regularity_score: number;
  payment_burden_ratio: number;
  transaction_frequency: number;
  data_completeness_score: number;
  features_json: string;
  is_synthetic: number;
  created_at: string;
}

export interface CreditAssessment {
  id: string;
  customer_id: string;
  feature_snapshot_id: string;
  model_version_id: string;
  probability_of_default: number;
  risk_category: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recommendation: 'APPROVE_SUPPORTED' | 'REVIEW_RECOMMENDED' | 'CAUTION_FLAGGED';
  uncertainty_score: number;
  data_completeness: number;
  review_status: 'PENDING_REVIEW' | 'REVIEWED_APPROVED' | 'REVIEWED_REJECTED' | 'OVERRIDDEN';
  reviewer_notes?: string;
  override_reason?: string;
  assessed_at: string;
  is_synthetic: number;
}

export interface ShapContribution {
  feature: string;
  value: number;
  contribution: number;
  direction: 'INCREASES_RISK' | 'DECREASES_RISK';
}

export interface ShapExplanation {
  id: string;
  assessment_id: string;
  model_version_id: string;
  customer_id: string;
  base_value: number;
  feature_contributions: string;
  global_importance_rank: string;
  disclaimer: string;
  is_synthetic: number;
  created_at: string;
}

export interface MonitoringEvent {
  id: string;
  customer_id: string;
  event_type: string;
  event_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  event_payload: string;
  triggered_at: string;
  is_synthetic: number;
}

export interface ReassessmentHistoryItem {
  id: string;
  customer_id: string;
  monitoring_event_id?: string;
  previous_assessment_id: string;
  new_assessment_id: string;
  prior_pd: number;
  new_pd: number;
  pd_delta: number;
  prior_risk_category: string;
  new_risk_category: string;
  trigger_reason: string;
  reassessed_at: string;
  is_synthetic: number;
}

export interface ReviewRecord {
  id: string;
  assessment_id: string;
  reviewer_role: string;
  action: 'CONFIRM' | 'OVERRIDE' | 'REQUEST_DATA' | 'ESCALATE';
  prior_decision: string;
  override_decision?: string;
  justification: string;
  audit_notes?: string;
  reviewed_at: string;
  is_synthetic: number;
}

export interface AuditLogItem {
  id: string;
  action_type: string;
  entity_name: string;
  entity_id: string;
  details: string;
  actor: string;
  timestamp: string;
}
