import re
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

CATEGORIES = [
    "Salary / Income",
    "Business Revenue",
    "Utility Payment",
    "Loan Repayment",
    "Insurance",
    "Housing",
    "Groceries",
    "Transportation",
    "Subscription",
    "Transfer",
    "Cash Withdrawal",
]

LOW_CONFIDENCE_THRESHOLD = 0.65

# Expanded bilingual ID/EN banking corpus (strictly disjoint from held-out QA evaluation fixtures)
TRAINING_CORPUS: List[Tuple[str, str]] = [
    # 1. Salary / Income
    ("GAJI BULANAN MANDIRI", "Salary / Income"),
    ("GAJI BULANAN PT MANDIRI SEJAHTERA", "Salary / Income"),
    ("PAYROLL TRANSFER PT TELKOM INDONESIA", "Salary / Income"),
    ("PAYROLL SALARY DEPOSIT PT ASTRA INTERNASIONAL", "Salary / Income"),
    ("PENERIMAAN GAJI POKOK KARYAWAN", "Salary / Income"),
    ("PAYROLL CREDIT BANK BCA BULAN INI", "Salary / Income"),
    ("MONTHLY SALARY DISBURSEMENT DIRECT", "Salary / Income"),
    ("BONUS TAHUNAN DAN GAJI KE 13", "Salary / Income"),
    ("DIRECT DEPOSIT WAGES SALARY EMPLOYEE", "Salary / Income"),
    ("GAJI STAF TETAP BULANAN PERUSAHAAN", "Salary / Income"),
    ("PAYROLL CREDIT DIRECT DEPOSIT WAGES", "Salary / Income"),
    ("GAJI KARYAWAN TETAP TRANSFER BANK", "Salary / Income"),
    ("SALARY DEPOSIT MONTHLY PAYROLL", "Salary / Income"),
    # 2. Business Revenue
    ("TRSF QRIS PENJUALAN TOKO SETTLEMENT", "Business Revenue"),
    ("PENERIMAAN TOKOPEDIA MERCHANT SETTLE", "Business Revenue"),
    ("SHOPEEPAY MERCHANT SETTLEMENT DANA", "Business Revenue"),
    ("PEMBAYARAN INVOICE CLIENT JASA KONSULTAN", "Business Revenue"),
    ("PENJUALAN PRODUK TOKO ONLINE HARIAN", "Business Revenue"),
    ("QRIS INCOMING MERCHANT PAY", "Business Revenue"),
    ("POS TERMINAL MERCHANT REVENUE PAYOUT", "Business Revenue"),
    ("TOKOPEDIA BUKALAPAK MERCHANT PAYOUT", "Business Revenue"),
    ("INVOICE PEMBAYARAN JASA KONSULTANSI", "Business Revenue"),
    ("QRIS SETTLEMENT HARIAN PENJUALAN DAGANG", "Business Revenue"),
    ("MERCHANT REVENUE SETTLE POS TERMINAL", "Business Revenue"),
    ("PENDAPATAN TOKO ONLINE QRIS SETTLEMENT", "Business Revenue"),
    # 3. Utility Payment
    ("PLN POSTPAID LISTRIK RUMAH TANGGA", "Utility Payment"),
    ("TAGIHAN PDAM KOTA SURABAYA AIR", "Utility Payment"),
    ("INDIHOME INTERNET TELKOM BULANAN", "Utility Payment"),
    ("PULSA TOKEN PLN PRABAYAR 500RB", "Utility Payment"),
    ("BIZNET HOME FIBER INTERNET PAYMENT", "Utility Payment"),
    ("TAGIHAN GAS PGN PERUSAHAAN GAS NEGARA", "Utility Payment"),
    ("ELECTRICITY WATER UTILITY BILL PAYMENT", "Utility Payment"),
    ("PEMBAYARAN LISTRIK PLN PASCABAYAR", "Utility Payment"),
    ("TAGIHAN AIR BERSIH PDAM BULANAN", "Utility Payment"),
    ("TELKOM INDIHOME FIBER BILL MONTHLY", "Utility Payment"),
    ("BAYAR LISTRIK PLN TOKEN PRABAYAR", "Utility Payment"),
    ("UTILITY BILL WATER ELECTRICITY GAS", "Utility Payment"),
    # 4. Loan Repayment
    ("ANGSURAN KPR BANK BTN CICILAN", "Loan Repayment"),
    ("CICILAN LEASING ADIRA FINANCE MOTOR", "Loan Repayment"),
    ("PEMBAYARAN KARTU KREDIT BCA BILL", "Loan Repayment"),
    ("ANGSURAN KREDIT MOBIL OTO MULTIARTHA", "Loan Repayment"),
    ("CICILAN PINJAMAN MODAL USAHA BANK", "Loan Repayment"),
    ("LOAN REPAYMENT INSTALLMENT BANK MANDIRI", "Loan Repayment"),
    ("MORTGAGE PRINCIPAL INTEREST REPAYMENT", "Loan Repayment"),
    ("BAYAR ANGSURAN KPR RUMAH BULANAN", "Loan Repayment"),
    ("CICILAN KREDIT MOTOR LEASING FIF", "Loan Repayment"),
    ("HOME MORTGAGE INSTALLMENT PAYMENT", "Loan Repayment"),
    ("ANGSURAN KPR BTN POKOK BUNGA", "Loan Repayment"),
    ("MONTHLY LOAN INSTALLMENT REPAYMENT", "Loan Repayment"),
    # 5. Insurance
    ("PREMI ASURANSI PRUDENTIAL INDONESIA", "Insurance"),
    ("BPJS KESEHATAN KELUARGA BULANAN", "Insurance"),
    ("ALLIANZ LIFE ID PREMI ASURANSI JIWA", "Insurance"),
    ("MANULIFE INDONESIA PREMIUM AUTO DEBIT", "Insurance"),
    ("BPJS KETENAGAKERJAAN JHT JKK", "Insurance"),
    ("HEALTH LIFE AUTO INSURANCE POLICY PREMIUM", "Insurance"),
    ("BAYAR PREMI POLIS ASURANSI JIWA SEQUIS", "Insurance"),
    ("IURAN BPJS KESEHATAN KETENAGAKERJAAN", "Insurance"),
    ("INSURANCE PREMIUM AUTO DEBIT ALLIANZ", "Insurance"),
    ("POLIS ASURANSI KESEHATAN AXA MANDIRI", "Insurance"),
    ("PREMI ASURANSI KENDARAAN POLICY", "Insurance"),
    ("AUTO INSURANCE POLICY PREMIUM PAYMENT", "Insurance"),
    # 6. Housing
    ("SEWA APARTEMEN BULANAN UNIT 12B", "Housing"),
    ("IPL IURAN PENGELOLAAN LINGKUNGAN CLUSTER", "Housing"),
    ("BIAYA SEWA RUMAH KONTRAKAN TAHUNAN", "Housing"),
    ("IURAN KEAMANAN DAN KEBERSIHAN RT RW", "Housing"),
    ("MAINTENANCE FEE APARTMENT RESIDENCE", "Housing"),
    ("LANDLORD HOUSE RENT PAYMENT MONTHLY", "Housing"),
    ("SEWA APARTEMEN STUDIO BULANAN RESIDENCE", "Housing"),
    ("BAYAR SEWA KOST KONTRAKAN RUMAH", "Housing"),
    ("IURAN IPL CLUSTER PENGELOLAAN LINGKUNGAN", "Housing"),
    ("MONTHLY RENT APARTMENT LANDLORD FEE", "Housing"),
    ("SERVICE CHARGE MAINTENANCE APARTMENT", "Housing"),
    ("PEMBAYARAN SEWA RUMAH BULANAN", "Housing"),
    # 7. Groceries
    ("BELANJA SUPERINDO HYPERMART MINGGUAN", "Groceries"),
    ("ALFAMART MINI MARKET BELANJA CEMILAN", "Groceries"),
    ("INDOMARET POINT PAYMENT SNACK", "Groceries"),
    ("HERO SUPERMARKET FRESH VEGETABLES", "Groceries"),
    ("FARMERS MARKET BUAH SAYUR SEGAR", "Groceries"),
    ("GRAND LUCKY BELANJA KEBUTUHAN DAPUR", "Groceries"),
    ("GROCERY SUPERMARKET DAILY PURCHASE", "Groceries"),
    ("BELANJA PASAR SWALAYAN SUPERINDO", "Groceries"),
    ("ALFAMART INDOMARET MINIMARKET BELANJA", "Groceries"),
    ("SUPERMARKET FRESH GROCERY PRODUCE", "Groceries"),
    ("BELANJA KEBUTUHAN HARIAN SWALAYAN", "Groceries"),
    ("RANCH MARKET GROCERY PURCHASE", "Groceries"),
    # 8. Transportation
    ("GRAB RIDE TRANSPORT OVO BALIK KANTOR", "Transportation"),
    ("GOJEK GORIDE TRANSPORTASI TRANSIT", "Transportation"),
    ("PENGISIAN BBM PERTAMINA SPBU PERTAMAX", "Transportation"),
    ("E-TOLL MANDIRI TOPUP JALAN TOL", "Transportation"),
    ("SHELL V-POWER ISI BENSIN MOBIL", "Transportation"),
    ("BLUE BIRD TAXI METER DROP OFF", "Transportation"),
    ("UBER TAXI RIDE AIRPORT COMMUTE", "Transportation"),
    ("ISI BENSIN PERTAMINA SPBU PERTALITE", "Transportation"),
    ("GRABCAR GOJEK TRANSPORTASI PERJALANAN", "Transportation"),
    ("COMMUTE TAXI RIDE UBER GRAB", "Transportation"),
    ("BBM SPBU PERTAMINA SOLAR PERTAMAX", "Transportation"),
    ("TIKET KERETA COMMUTER TRANSPORTASI", "Transportation"),
    # 9. Subscription
    ("NETFLIX DIGITAL SUBSCRIPTION MONTHLY", "Subscription"),
    ("SPOTIFY PREMIUM FAMILY PLAN ID", "Subscription"),
    ("YOUTUBE PREMIUM SUBSCRIPTION GOOGLE", "Subscription"),
    ("CHATGPT PLUS OPENAI SUBSCRIPTION", "Subscription"),
    ("ICLOUD STORAGE APPLE MONTHLY BILL", "Subscription"),
    ("HBO MAX VIDIO STREAMING MEMBERSHIP BULANAN", "Subscription"),
    ("NETFLIX PREMIUM STREAMING SUBSCRIPTION", "Subscription"),
    ("STREAMING DIGITAL MEMBERSHIP RENEWAL", "Subscription"),
    ("SPOTIFY YOUTUBE MONTHLY SUBSCRIPTION", "Subscription"),
    ("APPLE ONE SUBSCRIPTION RENEWAL", "Subscription"),
    ("AMAZON PRIME STREAMING MEMBERSHIP", "Subscription"),
    ("CANVA PRO DIGITAL SUBSCRIPTION MONTHLY", "Subscription"),
    # 10. Transfer
    ("TRSF KE REK SAUDARA KANDUNG", "Transfer"),
    ("TRANSFER ANTAR BANK BI-FAST MOBILE", "Transfer"),
    ("KIRIM UANG KE REK TABUNGAN LAIN", "Transfer"),
    ("INTERBANK TRANSFER REALTIME ONLINE", "Transfer"),
    ("WIRE P2P REMITTANCE BANK ACCOUNT TRANSFER", "Transfer"),
    ("TRSF BI-FAST ANTAR BANK REKENING", "Transfer"),
    ("TRANSFER REKENING PRIBADI TABUNGAN", "Transfer"),
    ("WIRE TRANSFER P2P DOMESTIC BANK", "Transfer"),
    ("KIRIM DANA BI FAST ANTAR REKENING", "Transfer"),
    ("OVERBOOKING TRANSFER REKENING BANK", "Transfer"),
    ("TRSF ONLINE INTERBANK BIFAST", "Transfer"),
    ("P2P TRANSFER KE REKENING TEMAN", "Transfer"),
    # 11. Cash Withdrawal
    ("TARIK TUNAI ATM BERSAMA KARTU DEBIT", "Cash Withdrawal"),
    ("PENARIKAN TUNAI ATM BCA CABANG PUSAT", "Cash Withdrawal"),
    ("CASH WITHDRAWAL CIRRUS NETWORK", "Cash Withdrawal"),
    ("TARIK TUNAI ATM MANDIRI PEJATEN", "Cash Withdrawal"),
    ("TELLER COUNTER WITHDRAWAL CASH BRANCH", "Cash Withdrawal"),
    ("ATM CASH WITHDRAWAL DEBIT CARD", "Cash Withdrawal"),
    ("PENARIKAN UANG TUNAI TELLER CABANG", "Cash Withdrawal"),
    ("TARIK TUNAI ATM LINK PRIMA BERSAMA", "Cash Withdrawal"),
    ("TELLER CASH DISPENSE BRANCH COUNTER", "Cash Withdrawal"),
    ("WITHDRAWAL ATM TUNAI KARTU DEBIT", "Cash Withdrawal"),
    ("PENARIKAN TUNAI ATM BNI BRI", "Cash Withdrawal"),
    ("CASH DISPENSE ATM NETWORK WITHDRAWAL", "Cash Withdrawal"),
]


def _build_nlp_pipeline() -> Pipeline:
    vectorizer = FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                    lowercase=True,
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=1,
                    sublinear_tf=True,
                    lowercase=True,
                ),
            ),
        ]
    )
    return Pipeline(
        [
            ("tfidf", vectorizer),
            ("clf", LogisticRegression(C=10.0, max_iter=500, random_state=42)),
        ]
    )


class TransactionNLPClassifier:
    def __init__(self):
        self.model_name = "TF-IDF-WordChar-Logistic-IndoFin-v2.1"
        self.low_confidence_threshold = LOW_CONFIDENCE_THRESHOLD
        texts = [self.clean_text(item[0]) for item in TRAINING_CORPUS]
        labels = [item[1] for item in TRAINING_CORPUS]

        self.pipeline = _build_nlp_pipeline()
        self.pipeline.fit(texts, labels)

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
        return " ".join(text.split())

    def classify(self, text: str, threshold: float = 0.16) -> Dict[str, Any]:
        cleaned = self.clean_text(text)
        if not cleaned:
            return {
                "text": text,
                "category": "Unclassified",
                "confidence": 0.0,
                "is_low_confidence": True,
                "model_name": self.model_name,
            }

        probs = self.pipeline.predict_proba([cleaned])[0]
        classes = self.pipeline.classes_
        top_idx = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        top_class = str(classes[top_idx])

        # Check if cleaned text has virtually no recognizable banking token/subword signal
        # (very uniform probability distribution across all 11 classes)
        if top_conf < threshold:
            category = "Unclassified"
            is_low = True
        else:
            category = top_class
            is_low = top_conf < self.low_confidence_threshold

        return {
            "text": text,
            "category": category,
            "confidence": round(top_conf, 4),
            "is_low_confidence": bool(is_low),
            "model_name": self.model_name,
        }

    def batch_classify(self, texts: List[str]) -> Dict[str, Any]:
        results = [self.classify(t) for t in texts]
        unclassified = sum(1 for r in results if r["category"] == "Unclassified")
        rate = unclassified / max(len(texts), 1)
        return {
            "predictions": results,
            "unclassified_rate": round(rate, 4),
        }

    def evaluate(self) -> Dict[str, Any]:
        """Evaluates strictly on a stratified 25% held-out validation split (zero train-test overlap)."""
        texts = [self.clean_text(item[0]) for item in TRAINING_CORPUS]
        labels = [item[1] for item in TRAINING_CORPUS]

        X_train, X_val, y_train, y_val = train_test_split(
            texts, labels, test_size=0.25, stratify=labels, random_state=42
        )

        eval_pipeline = _build_nlp_pipeline()
        eval_pipeline.fit(X_train, y_train)
        y_pred = eval_pipeline.predict(X_val)

        train_set = set(X_train)
        overlap_count = sum(1 for t in X_val if t in train_set)
        overlap_ratio = round(overlap_count / max(len(X_val), 1), 4)

        report = classification_report(
            y_val, y_pred, labels=CATEGORIES, output_dict=True, zero_division=0
        )
        cm = confusion_matrix(y_val, y_pred, labels=CATEGORIES).tolist()
        overall_acc = round(float(np.mean([yt == yp for yt, yp in zip(y_val, y_pred)])), 4)

        per_class_perf = [
            {
                "category": c,
                "precision": round(float(report[c]["precision"]), 4),
                "recall": round(float(report[c]["recall"]), 4),
                "f1": round(float(report[c]["f1-score"]), 4),
                "support": int(report[c]["support"]),
            }
            for c in CATEGORIES
        ]

        return {
            "model_name": self.model_name,
            "categories": CATEGORIES,
            "independent_eval_split": True,
            "train_test_overlap_ratio": overlap_ratio,
            "overall_accuracy": overall_acc,
            "macro_avg": report.get("macro avg", {}),
            "weighted_avg": report.get("weighted avg", {}),
            "per_class_performance": per_class_perf,
            "confusion_matrix": cm,
            "sample_size": len(X_val),
            "train_size": len(X_train),
        }


classifier_instance = TransactionNLPClassifier()
