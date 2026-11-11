import os
import base64
import hashlib
import hmac
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def derive_session_transport_key(agent_token: str, signing_secret: str) -> str:
    """Derive per-JWT E2EE transport key matching LeadDeeds downloadTokens.ts."""
    tok = (agent_token or "").strip()
    sec = (signing_secret or "").strip()
    if not tok or not sec:
        return ""
    return hmac.new(
        sec.encode("utf-8"),
        f"joshua-session-transport:{tok}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def derive_key(secret: str) -> bytes:
    """Derive a 256-bit AES key from a string secret using SHA-256."""
    return hashlib.sha256(secret.encode("utf-8")).digest()

def encrypt_bytes(data: bytes, secret: str) -> bytes:
    """Encrypt raw bytes using AES-GCM and prepend the IV."""
    key = derive_key(secret)
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ciphertext = aesgcm.encrypt(iv, data, None)
    return iv + ciphertext

def decrypt_bytes(data: bytes, secret: str) -> bytes:
    """Decrypt raw bytes using AES-GCM (extracting the prepended IV)."""
    key = derive_key(secret)
    aesgcm = AESGCM(key)
    iv = data[:12]
    ciphertext = data[12:]
    return aesgcm.decrypt(iv, ciphertext, None)

def encrypt_message(message: str, secret: str) -> str:
    """Encrypt a string message and return it as a Base64 string."""
    encrypted_bytes = encrypt_bytes(message.encode("utf-8"), secret)
    return base64.b64encode(encrypted_bytes).decode("utf-8")

def decrypt_message(b64_message: str, secret: str) -> str:
    """Decrypt a Base64 string message and return the original string."""
    encrypted_bytes = base64.b64decode(b64_message)
    decrypted_bytes = decrypt_bytes(encrypted_bytes, secret)
    return decrypted_bytes.decode("utf-8")
