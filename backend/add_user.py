#!/usr/bin/env python3
"""Generate a user entry for users.json with bcrypt-hashed credentials."""
import bcrypt
import pyotp
import json
import sys

def main():
    username = input("Username: ").strip()
    passphrase = input("Passphrase (stealth 'Name' field): ").strip()
    password = input("Password: ").strip()
    role = input("Role (admin/user) [user]: ").strip() or "user"
    prefix = input("Session prefix (leave empty for admin/full access): ").strip()

    totp_secret = pyotp.random_base32()
    totp = pyotp.TOTP(totp_secret)

    user_entry = {
        username: {
            "passphrase_hash": bcrypt.hashpw(passphrase.encode(), bcrypt.gensalt()).decode(),
            "password_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
            "totp_secret": totp_secret,
            "role": role,
            "sessions_prefix": prefix
        }
    }

    print(f"\n--- User entry for users.json ---")
    print(json.dumps(user_entry, indent=2))
    print(f"\nTOTP Secret (for authenticator app): {totp_secret}")
    print(f"TOTP URI: {totp.provisioning_uri(name=username, issuer_name='aim-connect')}")
    print(f"\nCopy the entry above into your users.json file.")

if __name__ == "__main__":
    main()
