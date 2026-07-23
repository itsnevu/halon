"""
Quick smoke test for the StepFun integration.

Run AFTER pasting STEPFUN_API_KEY into ai-agent/.env:

    cd ai-agent
    python -m venv venv && source venv/bin/activate   # if not already
    pip install -r requirements.txt
    python test_stepfun.py

If `engine` comes back as `stepfun:...` the LLM path is live. If it says
`heuristic`, the key is missing or the call failed (the reason is printed above).
"""

from scorer import calculate_risk_assessment, STEPFUN_MODEL, STEPFUN_BASE_URL, STEPFUN_API_KEY

SAMPLE_GOOD = (
    "Milestone 1 deliverable: Landing page redesign. Delivered Figma file, "
    "responsive React components, and a Lighthouse report scoring 98. All "
    "acceptance criteria in the contract were met and reviewed by the client."
)

SAMPLE_BAD = (
    "duplicate submission of previous milestone, suspicious invoice, no actual "
    "deliverable attached."
)

if __name__ == "__main__":
    print(f"Model     : {STEPFUN_MODEL}")
    print(f"Base URL  : {STEPFUN_BASE_URL}")
    print(f"Key set   : {'yes' if STEPFUN_API_KEY else 'NO (will use heuristic)'}")
    print("-" * 60)

    for label, text in [("legit work", SAMPLE_GOOD), ("shady work", SAMPLE_BAD)]:
        result = calculate_risk_assessment({"past_disputes": 0, "avg_late_days": 0}, text)
        print(f"[{label}]")
        print(f"  engine    : {result['engine']}")
        print(f"  score     : {result['score']}")
        print(f"  summary   : {result['summary']}")
        print(f"  red_flags : {result['red_flags']}")
        print("-" * 60)
