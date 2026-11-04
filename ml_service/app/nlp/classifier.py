import re
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
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
    "Cash Withdrawal"
]

TRAINING_CORPUS: List[Tuple[str, str]] = [
    # Salary / Income
    ("GAJI BULANAN MANDIRI", "Salary / Income"),
    ("GAJI BULANAN PT MANDIRI SEJAHTERA", "Salary / Income"),
    ("PAYROLL TRANSFER PT TELKOM INDONESIA", "Salary / Income"),
    ("PAYROLL SALARY DEPOSIT PT ASTRA INTERNASIONAL", "Salary / Income"),
    ("PENERIMAAN GAJI POKOK KARYAWAN", "Salary / Income"),
    ("PAYROLL CREDIT BANK BCA BULAN INI", "Salary / Income"),
    ("MONTHLY SALARY DISBURSEMENT DIRECT", "Salary / Income"),
    ("BONUS TAHUNAN DAN GAJI KE 13", "Salary / Income"),
    # Business Revenue
    ("TRSF QRIS PENJUALAN TOKO SETTLEMENT", "Business Revenue"),
    ("PENERIMAAN TOKOPEDIA MERCHANT SETTLE", "Business Revenue"),
    ("SHOPEEPAY MERCHANT SETTLEMENT DANA", "Business Revenue"),
    ("PEMBAYARAN INVOICE CLIENT JASA KONSULTAN", "Business Revenue"),
    ("PENJUALAN PRODUK TOKO ONLINE HARIAN", "Business Revenue"),
    ("QRIS INCOMING MERCHANT PAY", "Business Revenue"),
    # Utility Payment
    ("PLN POSTPAID LISTRIK RUMAH TANGGA", "Utility Payment"),
    ("TAGIHAN PDAM KOTA SURABAYA AIR", "Utility Payment"),
    ("INDIHOME INTERNET TELKOM BULANAN", "Utility Payment"),
    ("PULSA TOKEN PLN PRABAYAR 500RB", "Utility Payment"),
    ("BIZNET HOME FIBER INTERNET PAYMENT", "Utility Payment"),
    ("TAGIHAN GAS PGN PERUSAHAAN GAS NEGARA", "Utility Payment"),
    # Loan Repayment
    ("ANGSURAN KPR BANK BTN CICILAN", "Loan Repayment"),
    ("CICILAN LEASING ADIRA FINANCE MOTOR", "Loan Repayment"),
    ("PEMBAYARAN KARTU KREDIT BCA BILL", "Loan Repayment"),
    ("ANGSURAN KREDIT MOBIL OTO MULTIARTHA", "Loan Repayment"),
    ("CICILAN PINJAMAN MODAL USAHA BANK", "Loan Repayment"),
    ("LOAN REPAYMENT INSTALLMENT BANK MANDIRI", "Loan Repayment"),
    # Insurance
    ("PREMI ASURANSI PRUDENTIAL INDONESIA", "Insurance"),
    ("BPJS KESEHATAN KELUARGA BULANAN", "Insurance"),
    ("ALLIANZ LIFE ID PREMI ASURANSI JIWA", "Insurance"),
    ("MANULIFE INDONESIA PREMIUM AUTO DEBIT", "Insurance"),
    ("BPJS KETENAGAKERJAAN JHT JKK", "Insurance"),
    # Housing
    ("SEWA APARTEMEN BULANAN UNIT 12B", "Housing"),
    ("IPL IURAN PENGELOLAAN LINGKUNGAN CLUSTER", "Housing"),
    ("BIAYA SEWA RUMAH KONTRAKAN TAHUNAN", "Housing"),
    ("IURAN KEAMANAN DAN KEBERSIHAN RT RW", "Housing"),
    ("MAINTENANCE FEE APARTMENT RESIDENCE", "Housing"),
    # Groceries
    ("BELANJA SUPERINDO HYPERMART MINGGUAN", "Groceries"),
    ("ALFAMART MINI MARKET BELANJA CEMILAN", "Groceries"),
    ("INDOMARET POINT PAYMENT SNACK", "Groceries"),
    ("HERO SUPERMARKET FRESH VEGETABLES", "Groceries"),
    ("FARMERS MARKET BUAH SAYUR SEGAR", "Groceries"),
    ("GRAND LUCKY BELANJA KEBUTUHAN DAPUR", "Groceries"),
    # Transportation
    ("GRAB RIDE TRANSPORT OVO BALIK KANTOR", "Transportation"),
    ("GOJEK GORIDE TRANSPORTASI TRANSIT", "Transportation"),
    ("PENGISIAN BBM PERTAMINA SPBU PERTAMAX", "Transportation"),
    ("E-TOLL MANDIRI TOPUP JALAN TOL", "Transportation"),
    ("SHELL V-POWER ISI BENSIN MOBIL", "Transportation"),
    ("BLUE BIRD TAXI METER DROP OFF", "Transportation"),
    # Subscription
    ("NETFLIX DIGITAL SUBSCRIPTION MONTHLY", "Subscription"),
    ("SPOTIFY PREMIUM FAMILY PLAN ID", "Subscription"),
    ("YOUTUBE PREMIUM SUBSCRIPTION GOOGLE", "Subscription"),
    ("CHATGPT PLUS OPENAI SUBSCRIPTION", "Subscription"),
    ("ICLOUD STORAGE APPLE MONTHLY BILL", "Subscription"),
    # Transfer
    ("TRSF KE REK SAUDARA KANDUNG", "Transfer"),
    ("TRANSFER ANTAR BANK BI-FAST MOBILE", "Transfer"),
    ("KIRIM UANG KE REK TABUNGAN LAIN", "Transfer"),
    ("INTERBANK TRANSFER REALTIME ONLINE", "Transfer"),
    # Cash Withdrawal
    ("TARIK TUNAI ATM BERSAMA KARTU DEBIT", "Cash Withdrawal"),
    ("PENARIKAN TUNAI ATM BCA CABANG PUSAT", "Cash Withdrawal"),
    ("CASH WITHDRAWAL CIRRUS NETWORK", "Cash Withdrawal"),
    ("TARIK TUNAI ATM MANDIRI PEJATEN", "Cash Withdrawal")
]

class TransactionNLPClassifier:
    def __init__(self):
        self.model_name = "TF-IDF-Logistic-IndoFin-v2.0"
        texts = [item[0] for item in TRAINING_CORPUS]
        labels = [item[1] for item in TRAINING_CORPUS]

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 3), min_df=1, lowercase=True)),
            ("clf", LogisticRegression(C=5.0, max_iter=200, random_state=42))
        ])
        self.pipeline.fit(texts, labels)

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        return ' '.join(text.split())

    def classify(self, text: str, threshold: float = 0.20) -> Dict[str, Any]:
        cleaned = self.clean_text(text)
        if not cleaned:
            return {
                "text": text,
                "category": "Unclassified",
                "confidence": 0.0,
                "is_low_confidence": True,
                "model_name": self.model_name
            }

        probs = self.pipeline.predict_proba([cleaned])[0]
        classes = self.pipeline.classes_
        top_idx = np.argmax(probs)
        top_conf = float(probs[top_idx])
        top_class = str(classes[top_idx])

        if top_conf < threshold:
            category = "Unclassified"
            is_low = True
        else:
            category = top_class
            is_low = top_conf < 0.50

        return {
            "text": text,
            "category": category,
            "confidence": round(top_conf, 4),
            "is_low_confidence": is_low,
            "model_name": self.model_name
        }

    def batch_classify(self, texts: List[str]) -> Dict[str, Any]:
        results = [self.classify(t) for t in texts]
        unclassified = sum(1 for r in results if r["category"] == "Unclassified")
        rate = unclassified / max(len(texts), 1)
        return {
            "predictions": results,
            "unclassified_rate": round(rate, 4)
        }

    def evaluate(self) -> Dict[str, Any]:
        texts = [item[0] for item in TRAINING_CORPUS]
        y_true = [item[1] for item in TRAINING_CORPUS]
        y_pred = self.pipeline.predict(texts)

        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=CATEGORIES).tolist()

        return {
            "model_name": self.model_name,
            "categories": CATEGORIES,
            "macro_avg": report.get("macro avg", {}),
            "weighted_avg": report.get("weighted avg", {}),
            "confusion_matrix": cm,
            "sample_size": len(texts)
        }

classifier_instance = TransactionNLPClassifier()
