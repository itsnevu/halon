import random
import time

def extract_text_from_document(filename: str, content: bytes) -> str:
    """Mock function to simulate PyPDF2 / OCR extraction"""
    if filename.endswith(".pdf"):
        return "MOCK_PDF_TEXT: Invoice details for software development milestone."
    else:
        return "MOCK_IMAGE_TEXT: Screenshot of completed frontend dashboard."

def calculate_risk_score(client_history: dict, invoice_text: str) -> int:
    """
    Mock LLM (Llama 3) logic for risk scoring based on:
    - Duplikasi invoice
    - Kewajaran nominal
    - Riwayat dispute
    - Rata-rata keterlambatan klien
    - Kesesuaian kontrak
    """
    print("AI Agent: Analyzing text context and risk parameters...")
    time.sleep(1) # Simulate LLM processing time
    
    score = 100
    
    # 1. Past disputes penalty
    if client_history.get("past_disputes", 0) > 0:
        score -= client_history["past_disputes"] * 15
        
    # 2. Late payments penalty
    avg_late_days = client_history.get("avg_late_days", 0)
    if avg_late_days > 5:
        score -= (avg_late_days - 5) * 2
        
    # 3. Anomaly detection (Mock logic)
    if "suspicious" in invoice_text.lower() or "duplicate" in invoice_text.lower():
        score -= 40
        
    # Cap score
    score = max(0, min(100, score))
    return int(score)

def trigger_smart_contract_approval(milestone_id: int, score: int):
    """
    Simulates a backend relayer signing a transaction to the EscrowProject smart contract.
    Using Privy session keys for authorization.
    """
    print(f"[RELAYER] Submitting Tx: approveMilestoneAI({milestone_id}, {score}) on-chain...")
    return "0x_mock_tx_hash_8a9b4c..."
