from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from scorer import extract_text_from_document, calculate_risk_score, trigger_smart_contract_approval
import uvicorn

app = FastAPI(title="ProofOfWork AI Agent")

class ClientHistory(BaseModel):
    past_disputes: int = 0
    avg_late_days: int = 0

@app.post("/verify-milestone")
async def verify_milestone(
    milestone_id: int = Form(...),
    client_disputes: int = Form(0),
    client_late_days: int = Form(0),
    file: UploadFile = File(...)
):
    """
    Endpoint for a freelancer to upload proof of work. 
    The AI agent parses the document, scores it, and if it passes, calls the smart contract.
    """
    content = await file.read()
    
    # Step 1: OCR / Text Extraction
    extracted_text = extract_text_from_document(file.filename, content)
    
    # Step 2: Risk & Quality Scoring
    client_history = {
        "past_disputes": client_disputes,
        "avg_late_days": client_late_days
    }
    
    score = calculate_risk_score(client_history, extracted_text)
    
    response = {
        "milestone_id": milestone_id,
        "filename": file.filename,
        "ai_score": score,
        "status": "pending",
        "tx_hash": None
    }
    
    # Step 3: Trigger on-chain approval if score > 80
    if score >= 80:
        tx_hash = trigger_smart_contract_approval(milestone_id, score)
        response["status"] = "approved_on_chain"
        response["tx_hash"] = tx_hash
    else:
        response["status"] = "rejected"
        response["message"] = "Score below threshold (80). Manual client review required."
        
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
