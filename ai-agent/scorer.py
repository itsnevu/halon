import os
import io
import json
import re
import time
import PyPDF2

# Optional: load a local .env when present (no-op in prod if not installed).
try:  # pragma: no cover
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


def extract_text_from_document(filename: str, content: bytes) -> str:
    """Extracts actual text from PDF or fallback text decoders."""
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


# ──────────────────────────────────────────────────────────────────────────────
# Risk scoring
#
# The real scorer is an LLM (StepFun, via its OpenAI-compatible API). If no API
# key is configured — or the call fails — we fall back to the deterministic
# heuristic below, so a demo never hard-fails on a network blip.
# ──────────────────────────────────────────────────────────────────────────────

# Base URL must match the region your key was issued in:
#   Global : https://api.stepfun.ai/v1   (platform.stepfun.ai)
#   China  : https://api.stepfun.com/v1  (platform.stepfun.com)
STEPFUN_BASE_URL = os.getenv("STEPFUN_BASE_URL", "https://api.stepfun.ai/v1")
STEPFUN_MODEL = os.getenv("STEPFUN_MODEL", "step-3.5-flash")
STEPFUN_API_KEY = os.getenv("STEPFUN_API_KEY")

_SYSTEM_PROMPT = (
    "You are an underwriting risk analyst for a freelance work-escrow protocol. "
    "Given a client's payment history and a freelancer's submitted proof-of-work "
    "document, judge whether the milestone should be auto-approved for payout. "
    "Score 0-100 where 100 is clearly legitimate, complete, on-scope work from a "
    "reliable client, and low scores flag duplication, off-scope or empty "
    "submissions, anomalies, or a poor client track record. "
    'Respond with ONLY compact JSON: '
    '{"score": <int 0-100>, "summary": "<one sentence>", "red_flags": ["..."]}'
)


def _extract_json(raw: str) -> dict:
    """Pull the first JSON object out of a model response, tolerant of prose."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"no JSON object in response: {raw[:200]}")
    return json.loads(match.group(0))


def _stepfun_assess(client_history: dict, invoice_text: str) -> dict:
    # Imported lazily so the heuristic path has no hard dependency on `openai`.
    from openai import OpenAI

    client = OpenAI(api_key=STEPFUN_API_KEY, base_url=STEPFUN_BASE_URL)

    user_prompt = (
        f"Client history: past_disputes={client_history.get('past_disputes', 0)}, "
        f"avg_late_days={client_history.get('avg_late_days', 0)}.\n\n"
        "Freelancer proof-of-work document (may be truncated):\n"
        f'"""\n{invoice_text[:6000]}\n"""'
    )

    resp = client.chat.completions.create(
        model=STEPFUN_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    data = _extract_json(resp.choices[0].message.content or "")
    score = max(0, min(100, int(data.get("score", 0))))
    return {
        "score": score,
        "summary": str(data.get("summary", "")),
        "red_flags": list(data.get("red_flags", []) or []),
        "engine": f"stepfun:{STEPFUN_MODEL}",
    }


def _heuristic_assess(client_history: dict, invoice_text: str) -> dict:
    """Deterministic fallback. Kept from the original MVP as a safety net."""
    print("AI Agent: Analyzing text context and risk parameters (heuristic)...")
    time.sleep(0.2)

    score = 100
    red_flags = []

    disputes = client_history.get("past_disputes", 0)
    if disputes > 0:
        score -= disputes * 15
        red_flags.append(f"{disputes} prior client dispute(s)")

    avg_late_days = client_history.get("avg_late_days", 0)
    if avg_late_days > 5:
        score -= (avg_late_days - 5) * 2
        red_flags.append(f"client averages {avg_late_days} late days")

    lowered = invoice_text.lower()
    if "suspicious" in lowered or "duplicate" in lowered:
        score -= 40
        red_flags.append("anomaly keyword detected in submission")

    score = max(0, min(100, int(score)))
    return {
        "score": score,
        "summary": "Heuristic risk assessment (no LLM configured).",
        "red_flags": red_flags,
        "engine": "heuristic",
    }


def calculate_risk_assessment(client_history: dict, invoice_text: str) -> dict:
    """Return a structured risk assessment: {score, summary, red_flags, engine}."""
    if STEPFUN_API_KEY:
        try:
            result = _stepfun_assess(client_history, invoice_text)
            print(f"[SCORER] {result['engine']} → score {result['score']}")
            return result
        except Exception as e:
            print(f"[SCORER] StepFun call failed ({e}); falling back to heuristic")
    return _heuristic_assess(client_history, invoice_text)


def calculate_risk_score(client_history: dict, invoice_text: str) -> int:
    """Backwards-compatible thin wrapper returning just the integer score."""
    return calculate_risk_assessment(client_history, invoice_text)["score"]


# ──────────────────────────────────────────────────────────────────────────────
# On-chain relayer
# ──────────────────────────────────────────────────────────────────────────────

import os as _os
from web3 import Web3

# Well-known Anvil dev key #2. Never used unless explicitly opted in for local dev.
_ANVIL_DEV_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

ESCROW_PROJECT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "milestoneId", "type": "uint256"},
            {"internalType": "uint256", "name": "score", "type": "uint256"},
        ],
        "name": "approveMilestoneAI",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def _resolve_relayer_key() -> str | None:
    """Fail closed: only fall back to the public Anvil key when explicitly allowed."""
    key = _os.getenv("RELAYER_PRIVATE_KEY")
    if not key:
        if _os.getenv("RELAYER_ALLOW_DEV_KEY", "").lower() == "true":
            print("[RELAYER] Using Anvil dev key (RELAYER_ALLOW_DEV_KEY=true)")
            key = _ANVIL_DEV_KEY
        else:
            return None
    return key if key.startswith("0x") else "0x" + key


def trigger_smart_contract_approval(project_address: str, milestone_id: int, score: int) -> str:
    """Signs and sends approveMilestoneAI on the target EscrowProject."""
    rpc_url = _os.getenv("RPC_URL", "http://127.0.0.1:8545")
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    if not w3.is_connected():
        print(f"[RELAYER] Failed to connect to RPC at {rpc_url}")
        return "0x_failed_rpc_connection"

    private_key = _resolve_relayer_key()
    if private_key is None:
        print("[RELAYER] No RELAYER_PRIVATE_KEY set and dev key not allowed; refusing to sign")
        return "0x_no_relayer_key"

    try:
        account = w3.eth.account.from_key(private_key)
        relayer_address = account.address
        print(f"[RELAYER] Loaded Relayer Account: {relayer_address}")

        contract = w3.eth.contract(address=w3.to_checksum_address(project_address), abi=ESCROW_PROJECT_ABI)
        nonce = w3.eth.get_transaction_count(relayer_address)
        gas_estimate = contract.functions.approveMilestoneAI(milestone_id, score).estimate_gas({"from": relayer_address})

        tx = contract.functions.approveMilestoneAI(milestone_id, score).build_transaction(
            {
                "from": relayer_address,
                "nonce": nonce,
                "gas": int(gas_estimate * 1.2),
                "gasPrice": w3.eth.gas_price,
            }
        )

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        print(f"[RELAYER] Tx Successful! Hash: {receipt.transactionHash.hex()}")
        return receipt.transactionHash.hex()
    except Exception as e:
        print(f"[RELAYER] Transaction failed: {str(e)}")
        return f"0x_error_{str(e)[:20]}"
