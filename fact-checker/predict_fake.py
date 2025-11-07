from typing import Dict


def calculate_final_score(verification: Dict[str, int], bias: Dict[str, object]) -> Dict[str, object]:
    base = int(verification.get("confirmed", 0)) - int(verification.get("disputed", 0))
    sensational_penalty = int(bias.get("sensational_count", 0))

    score = base * 2 - sensational_penalty

    if score >= 3:
        verdict = "Likely True"
    elif score >= 0:
        verdict = "Uncertain"
    else:
        verdict = "Likely Fake"

    return {"score": score, "verdict": verdict}
