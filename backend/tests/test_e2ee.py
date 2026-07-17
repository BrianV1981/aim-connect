import pytest
import os
import json
import base64
from e2ee import encrypt_message, decrypt_message, encrypt_bytes, decrypt_bytes, derive_key

def test_derive_key():
    key1 = derive_key("my-secret")
    key2 = derive_key("my-secret")
    key3 = derive_key("other-secret")
    assert key1 == key2
    assert key1 != key3
    assert len(key1) == 32  # 256-bit key

def test_encrypt_decrypt_message():
    secret = "test-secret-123"
    message = json.dumps({"type": "input", "payload": "ls -la\r"})
    
    encrypted_b64 = encrypt_message(message, secret)
    assert isinstance(encrypted_b64, str)
    assert encrypted_b64 != message
    
    decrypted = decrypt_message(encrypted_b64, secret)
    assert decrypted == message

def test_encrypt_decrypt_bytes():
    secret = "test-secret-123"
    data = b"\x1b[31mHello World\x1b[0m"
    
    encrypted_bytes = encrypt_bytes(data, secret)
    assert isinstance(encrypted_bytes, bytes)
    assert encrypted_bytes != data
    
    decrypted = decrypt_bytes(encrypted_bytes, secret)
    assert decrypted == data

def test_invalid_key_fails():
    secret1 = "key1"
    secret2 = "key2"
    msg = "test"
    
    encrypted = encrypt_message(msg, secret1)
    
    with pytest.raises(Exception):
        decrypt_message(encrypted, secret2)
