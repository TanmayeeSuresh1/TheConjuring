"""Data Breach Emergency Guide — static reference endpoint."""
from fastapi import APIRouter, HTTPException

router = APIRouter()

GUIDE = {
    "immediate_actions": {
        "title": "Immediate Actions",
        "icon": "siren-on",
        "severity": "critical",
        "steps": [
            "Change all important passwords right now",
            "Logout from all devices and active sessions",
            "Freeze bank cards if financial data was exposed",
            "Enable 2FA on every account immediately",
            "Scan your device for malware",
            "Check email and account activity logs for unknown access",
        ],
    },
    "password_safety": {
        "title": "Password Safety Tips",
        "icon": "key",
        "severity": "high",
        "steps": [
            "Use 12+ character passwords minimum",
            "Mix uppercase, lowercase, numbers and symbols",
            "Never reuse passwords across different sites",
            "Avoid personal info — name, DOB, phone number",
            "Use a password manager (Bitwarden, 1Password)",
            "Rotate passwords every 90 days for critical accounts",
        ],
    },
    "recovery_checklist": {
        "title": "Recovery Checklist",
        "icon": "list-check",
        "severity": "medium",
        "steps": [
            "Secure your email account first — it is the master key",
            "Change banking and UPI passwords immediately",
            "Review login history for unknown access",
            "Remove unknown or unrecognised devices",
            "Update recovery email and phone number",
            "Monitor transactions for the next 30 days",
        ],
    },
    "cybercrime_help": {
        "title": "Cybercrime Help — India",
        "icon": "phone",
        "severity": "info",
        "steps": [
            "National Helpline: 1930 (available 24/7)",
            "Report online: https://cybercrime.gov.in",
            "Report fraud immediately — delays reduce recovery chances",
            "Keep screenshots and transaction IDs as evidence",
            "Contact your bank fraud helpline directly",
            "File an FIR at your nearest cyber crime cell",
        ],
        "contacts": {
            "helpline": "1930",
            "website": "https://cybercrime.gov.in",
        },
    },
}

# Mirrors the Flask app's rules dict — used by the dashboard Do's & Don'ts panel
RULES = {
    "dos": [
        "Use strong, unique passwords (12+ characters)",
        "Logout after every session",
        "Keep credentials private and encrypted",
        "Enable 2FA on all critical accounts",
        "Scan files and links before sharing",
        "Report suspicious activity immediately",
    ],
    "donts": [
        "Share OTP, passwords or tokens with anyone",
        "Reuse passwords across multiple sites",
        "Login on public or shared devices",
        "Click unverified links or attachments",
        "Store credentials in plain text or chat",
        "Ignore security alerts or warnings",
    ],
}


@router.get("/")
async def get_breach_guide():
    """Return the full breach guide and security rules as structured JSON."""
    return {"guide": GUIDE, "rules": RULES, "version": "1.0"}


@router.get("/rules")
async def get_rules():
    """Return the Do's and Don'ts security rules."""
    return RULES


@router.get("/{section}")
async def get_breach_section(section: str):
    """Return a specific section of the breach guide."""
    if section not in GUIDE:
        raise HTTPException(
            status_code=404,
            detail=f"Section '{section}' not found. Available: {list(GUIDE.keys())}",
        )
    return GUIDE[section]
