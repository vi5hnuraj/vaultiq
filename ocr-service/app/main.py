# app/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import pytesseract
from pdf2image import convert_from_bytes
import base64
import logging
import traceback
import requests
import tempfile
import os
import re
from dotenv import load_dotenv
load_dotenv()  # loads .env into this process


logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="OCR + IPFS Uploader")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev (later restrict)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OCRRequest(BaseModel):
    file_b64: str

TOTAL_KEYWORDS: List[str] = [
    "total due", "total amount", "net amount", "amount payable",
    "invoice total", "total sum", "balance due", "total to pay",
    "grand total", "amount to pay", "net total", "subtotal", "total"
]

CURRENCY_PAT = r"(?:rs\.?|inr|₹|\$|usd|eur|£|gbp)?\s*([\d,]+\.\d{2})"

def _strip_data_url_prefix(data: str) -> str:
    """
    Supports inputs like:
    data:application/pdf;base64,JVBERi0xLjQKJ...
    """
    if "," in data and ";base64" in data[:64]:
        return data.split(",", 1)[1]
    return data

def extract_likely_total(text: str) -> str:
    candidates: List[float] = []

    for line in text.splitlines():
        lower_line = line.lower().strip()
        if any(k in lower_line for k in TOTAL_KEYWORDS):
            print(f"🔍 Matched line: {line}")
            matches = re.findall(CURRENCY_PAT, lower_line)
            for amt in matches:
                try:
                    candidates.append(float(amt.replace(",", "")))
                except Exception:
                    continue

    # Fallback: pick the largest numeric with 2 decimals anywhere
    if not candidates:
        matches = re.findall(r"([\d,]+\.\d{2})", text)
        for amt in matches:
            try:
                candidates.append(float(amt.replace(",", "")))
            except Exception:
                continue

    if candidates:
        max_val = max(candidates)
        print(f"✅ Candidates: {candidates}, Max: {max_val}")
        return f"{max_val:.2f}"

    return "Not Found"

def upload_to_pinata(file_path: str) -> str:
    """
    Uploads a file to Pinata using either:
      - JWT (recommended):   Authorization: Bearer <PINATA_JWT>
      - API key + secret:    pinata_api_key / pinata_secret_api_key
    Returns the CID (IpfsHash).
    """
    PINATA_JWT = os.getenv("PINATA_JWT")
    PINATA_API_KEY = os.getenv("PINATA_API_KEY")
    PINATA_API_SECRET = os.getenv("PINATA_API_SECRET")

    if not PINATA_JWT and not (PINATA_API_KEY and PINATA_API_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pinata credentials are missing. Set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET."
        )

    headers = {}
    if PINATA_JWT:
        headers["Authorization"] = f"Bearer {PINATA_JWT}"
        logger.info("Using Pinata JWT for authentication.")
    else:
        headers["pinata_api_key"] = PINATA_API_KEY  # type: ignore[arg-type]
        headers["pinata_secret_api_key"] = PINATA_API_SECRET  # type: ignore[arg-type]
        logger.info("Using Pinata API key/secret for authentication.")

    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"  # NOTE: use API host, not gateway
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, "application/pdf")}
        try:
            resp = requests.post(url, files=files, headers=headers, timeout=60)
            if resp.status_code == 401:
                # Auth error is common; surface clearly
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Pinata auth failed (401). Check JWT scope or API key/secret."
                )
            resp.raise_for_status()
        except requests.HTTPError as http_err:
            # Bubble up status code + body for quick debugging
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Pinata upload failed: {resp.status_code} {resp.text}"
            ) from http_err
        except requests.RequestException as req_err:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Network error talking to Pinata: {req_err}"
            ) from req_err

    data = resp.json()
    cid = data.get("IpfsHash")
    if not cid:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Pinata response missing IpfsHash: {data}"
        )
    logger.info(f"✅ Uploaded to IPFS: {cid}")
    return cid
def extract_invoice_date(text: str) -> str:
    """
    Attempts to find an invoice date using regex.
    Supports DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, Month DD, YYYY, etc.
    """
    import re
    from datetime import datetime

    # Common patterns: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    date_patterns = [
        r"(\d{4}-\d{2}-\d{2})",        # 2023-12-31
        r"(\d{2}/\d{2}/\d{4})",        # 31/12/2023 or 12/31/2023
        r"(\d{2}-\d{2}-\d{4})",        # 31-12-2023
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2},\s+\d{4}" # Jan 31, 2023
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_date = match.group(0)
            # Basic normalization attempt (if / or -)
            if "/" in raw_date or "-" in raw_date:
                parts = re.split(r"[/|-]", raw_date)
                if len(parts) == 3:
                    if len(parts[0]) == 4: # YYYY-MM-DD
                        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    else: # Assume DD/MM/YYYY or MM/DD/YYYY, favor YYYY-MM-DD format
                        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            return raw_date

    return "Not Found"

def extract_due_date(text: str) -> str:
    """
    Attempts to find a due date using regex.
    Supports DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc. prefixed by 'Due Date'.
    """
    import re
    # Look for "Due Date", "Deadline", "Pay by"
    patterns = [
        r"due\s*date\s*[:\-]\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})",
        r"pay\s*by\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})",
        r"deadline\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_date = match.group(1)
            # Normalization attempt
            if "/" in raw_date or "-" in raw_date:
                parts = re.split(r"[/|-]", raw_date)
                if len(parts) == 3:
                    if len(parts[0]) == 4: # YYYY-MM-DD
                        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    else: # Assume DD/MM/YYYY
                        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            return raw_date

    return "Not Found"

def extract_customer_name(text: str) -> str:
    import re

    # Try multiple patterns (STRONG)
    patterns = [
        r"customer\s*[:\-]\s*(.+)",
        r"cust\w*\s*[:\-]?\s*(.+)",   # handles OCR mistakes like Custorner
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return "Unknown"

@app.post("/analyze")
async def analyze(req: OCRRequest):
    temp_pdf_path: Optional[str] = None
    try:
        # Decode base64 PDF content
        b64 = _strip_data_url_prefix(req.file_b64)
        try:
            content = base64.b64decode(b64, validate=True)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid base64 input. Ensure you send a base64-encoded PDF."
            )

        # Convert PDF to images for OCR
        try:
            images = convert_from_bytes(content)
        except Exception as conv_err:
            # Typical cause on Windows: missing Poppler utilities
            logger.error(f"PDF->Image conversion failed: {conv_err}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to read PDF pages. Ensure Poppler is installed and available. {conv_err}"
            )

        if not images:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No pages found in the PDF."
            )

        # Run OCR on all pages
        try:
            # If you need a specific Tesseract path on Windows:
            # pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            text = "".join(pytesseract.image_to_string(img) for img in images)
        except Exception as ocr_err:
            logger.error(f"OCR extraction failed: {ocr_err}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"OCR failed. Ensure Tesseract is installed and on PATH. {ocr_err}"
            )

        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="OCR did not extract any text."
            )

        # Extract total amount, customer name, issue date, and due date
        total_amount = extract_likely_total(text)
        customer_name = extract_customer_name(text)
        invoice_date = extract_invoice_date(text)
        due_date = extract_due_date(text)

        # 👇 LOG OCR RESULTS
        print("🧾 OCR TEXT:\n", text)
        print("👤 CUSTOMER:", customer_name)
        print("📅 ISSUE DATE:", invoice_date)
        print("📅 DUE DATE:", due_date)
        
        # Save PDF to a temp file for upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(content)
            temp_pdf_path = temp_pdf.name

        # Upload to Pinata
        cid = upload_to_pinata(temp_pdf_path)

        # Gateway settings
        gateway_subdomain = os.getenv("PINATA_GATEWAY_SUBDOMAIN", "").strip()
        gateway_url = (
            f"https://{gateway_subdomain}.mypinata.cloud/ipfs/{cid}"
            if gateway_subdomain
            else f"https://gateway.pinata.cloud/ipfs/{cid}"
        )
        
        return {
            "text": text,
            "total_amount": total_amount,
            "customer_name": customer_name,
            "invoice_date": invoice_date,
            "due_date": due_date, # 🔥 Added
            "cid": cid,
            "url": gateway_url
        }

    except HTTPException:
        # Already meaningful; just re-raise
        raise
    except Exception as e:
        logger.error(f"OCR pipeline failed: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR error: {str(e)}"
        )
    finally:
        # Cleanup temp file if created
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except Exception as _:
                pass
