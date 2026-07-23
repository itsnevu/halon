import os
import asyncio

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from scorer import (
    extract_text_from_document,
    calculate_risk_assessment,
    trigger_smart_contract_approval,
)

app = FastAPI(title="ProofOfWork AI Agent")

# The dashboard calls this API from the browser, so cross-origin reads need CORS.
# Lock this down in prod via ALLOWED_ORIGINS="https://your-app.vercel.app,...".
_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

# Optional shared-secret auth. When AI_AGENT_API_KEY is set, callers must send it
# as X-API-Key. Left unset for zero-friction local dev (a warning is printed).
_API_KEY = os.getenv("AI_AGENT_API_KEY")
if not _API_KEY:
    print("[AUTH] AI_AGENT_API_KEY unset — endpoint is UNAUTHENTICATED (dev mode).")

# This endpoint moves on-chain state, so cap the score gate and the upload size.
APPROVAL_THRESHOLD = int(os.getenv("APPROVAL_THRESHOLD", "80"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB


def _require_auth(provided: str | None) -> None:
    if _API_KEY and provided != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/verify-milestone")
async def verify_milestone(
    project_address: str = Form(...),
    milestone_id: int = Form(...),
    client_disputes: int = Form(0),
    client_late_days: int = Form(0),
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    """
    A freelancer uploads proof of work. The agent parses the document, scores it
    with the LLM (StepFun, with a heuristic fallback), and — if it clears the
    threshold — signs the on-chain milestone approval.
    """
    _require_auth(x_api_key)

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty upload")

    # Step 1: OCR / text extraction (offloaded so we don't block the event loop).
    extracted_text = await asyncio.to_thread(extract_text_from_document, file.filename, content)

    # Step 2: risk & quality scoring.
    client_history = {"past_disputes": client_disputes, "avg_late_days": client_late_days}
    assessment = await asyncio.to_thread(calculate_risk_assessment, client_history, extracted_text)
    score = assessment["score"]

    response = {
        "project_address": project_address,
        "milestone_id": milestone_id,
        "filename": file.filename,
        "ai_score": score,
        "ai_engine": assessment["engine"],
        "ai_summary": assessment["summary"],
        "ai_red_flags": assessment["red_flags"],
        "status": "pending",
        "tx_hash": None,
    }

    # Step 3: on-chain approval if the score clears the threshold.
    if score >= APPROVAL_THRESHOLD:
        tx_hash = await asyncio.to_thread(
            trigger_smart_contract_approval, project_address, milestone_id, score
        )
        # A relayer error surfaces as a sentinel string, not a real tx hash.
        if tx_hash.startswith("0x_"):
            response["status"] = "approval_failed"
            response["message"] = tx_hash
        else:
            response["status"] = "approved_on_chain"
            response["tx_hash"] = tx_hash
    else:
        response["status"] = "rejected"
        response["message"] = f"Score below threshold ({APPROVAL_THRESHOLD}). Manual client review required."

    return response


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
