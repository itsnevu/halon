import random
import time
import io
import PyPDF2

def extract_text_from_document(filename: str, content: bytes) -> str:
    """Extracts actual text from PDF or fallback text decoders"""
    if filename.endswith(".pdf"):
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text if text.strip() else "Empty PDF Content"
        except Exception as e:
            return f"Error parsing PDF: {str(e)}"
    else:
        try:
            return content.decode("utf-8")
        except Exception:
            return f"Binary File content for: {filename}"

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

import os
from web3 import Web3

ESCROW_PROJECT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "milestoneId", "type": "uint256"},
            {"internalType": "uint256", "name": "score", "type": "uint256"}
        ],
        "name": "approveMilestoneAI",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

def trigger_smart_contract_approval(project_address: str, milestone_id: int, score: int) -> str:
    """
    Submits a signed transaction calling approveMilestoneAI on the target EscrowProject contract on-chain.
    """
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print(f"[RELAYER] Failed to connect to RPC at {rpc_url}")
        return "0x_failed_rpc_connection"

    # Default Anvil Dev Key #2: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
    private_key = os.getenv("RELAYER_PRIVATE_KEY", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
        
    try:
        account = w3.eth.account.from_key(private_key)
        relayer_address = account.address
        print(f"[RELAYER] Loaded Relayer Account: {relayer_address}")
        
        contract = w3.eth.contract(address=w3.to_checksum_address(project_address), abi=ESCROW_PROJECT_ABI)
        nonce = w3.eth.get_transaction_count(relayer_address)
        gas_estimate = contract.functions.approveMilestoneAI(milestone_id, score).estimate_gas({'from': relayer_address})
        
        tx = contract.functions.approveMilestoneAI(milestone_id, score).build_transaction({
            'from': relayer_address,
            'nonce': nonce,
            'gas': int(gas_estimate * 1.2),
            'gasPrice': w3.eth.gas_price
        })
        
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        print(f"[RELAYER] Tx Successful! Hash: {receipt.transactionHash.hex()}")
        return receipt.transactionHash.hex()
    except Exception as e:
        print(f"[RELAYER] Transaction failed: {str(e)}")
        return f"0x_error_{str(e)[:20]}"
