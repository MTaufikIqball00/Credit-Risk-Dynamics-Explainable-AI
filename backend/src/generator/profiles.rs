use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SimulationProfileType {
    StableIncome,
    VariableIncome,
    IrregularIncome,
    HighExpenseBurden,
    ConsistentPayment,
    IrregularPayment,
    ThinFile,
    NoCreditHistory,
}

impl SimulationProfileType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::StableIncome => "Stable Income",
            Self::VariableIncome => "Variable Income",
            Self::IrregularIncome => "Irregular Income",
            Self::HighExpenseBurden => "High Expense Burden",
            Self::ConsistentPayment => "Consistent Payment",
            Self::IrregularPayment => "Irregular Payment",
            Self::ThinFile => "Thin-file Customer",
            Self::NoCreditHistory => "No Credit History",
        }
    }

    pub fn from_index(index: usize) -> Self {
        match index % 8 {
            0 => Self::StableIncome,
            1 => Self::VariableIncome,
            2 => Self::IrregularIncome,
            3 => Self::HighExpenseBurden,
            4 => Self::ConsistentPayment,
            5 => Self::IrregularPayment,
            6 => Self::ThinFile,
            _ => Self::NoCreditHistory,
        }
    }
}
