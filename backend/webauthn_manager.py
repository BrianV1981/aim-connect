import json
import os
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import RegistrationCredential, AuthenticationCredential, PublicKeyCredentialDescriptor
from webauthn.helpers.options_to_json import options_to_json
from typing import Dict, List, Optional
import base64

WEBAUTHN_DB = os.environ.get("WEBAUTHN_DB", "webauthn.json")
RP_NAME = "AIM Connect"
RP_ID = os.environ.get("RP_ID", "localhost")
ORIGIN = os.environ.get("ORIGIN", "http://localhost:5173")

class WebAuthnManager:
    def __init__(self):
        self.challenges = {}
        self.load_db()
        
    def load_db(self):
        if os.path.exists(WEBAUTHN_DB):
            with open(WEBAUTHN_DB, "r") as f:
                self.credentials = json.load(f)
        else:
            self.credentials = {}
            
    def save_db(self):
        with open(WEBAUTHN_DB, "w") as f:
            json.dump(self.credentials, f)
            
    def get_user_credentials(self, user_name: str) -> List[Dict]:
        return self.credentials.get(user_name, [])
        
    def generate_registration(self, user_name: str):
        existing_creds = self.get_user_credentials(user_name)
        exclude_credentials = []
        for cred in existing_creds:
            exclude_credentials.append(
                PublicKeyCredentialDescriptor(id=base64.b64decode(cred["id"]))
            )
            
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=user_name.encode('utf-8'),
            user_name=user_name,
            exclude_credentials=exclude_credentials,
        )
        self.challenges[user_name] = options.challenge
        return json.loads(options_to_json(options))
        
    def verify_registration(self, user_name: str, response_json: dict) -> bool:
        challenge = self.challenges.get(user_name)
        if not challenge:
            return False
            
        try:
            verification = verify_registration_response(
                credential=response_json,
                expected_challenge=challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
                require_user_verification=True
            )
            
            cred_id = base64.b64encode(verification.credential_id).decode('utf-8')
            pub_key = base64.b64encode(verification.credential_public_key).decode('utf-8')
            
            if user_name not in self.credentials:
                self.credentials[user_name] = []
                
            self.credentials[user_name].append({
                "id": cred_id,
                "public_key": pub_key,
                "sign_count": verification.sign_count
            })
            self.save_db()
            return True
            
        except Exception as e:
            print(f"WebAuthn registration error: {e}")
            return False
            
    def generate_authentication(self, user_name: str):
        existing_creds = self.get_user_credentials(user_name)
        if not existing_creds:
            return None
            
        allow_credentials = []
        for cred in existing_creds:
            allow_credentials.append(
                PublicKeyCredentialDescriptor(id=base64.b64decode(cred["id"]))
            )
            
        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials,
        )
        self.challenges[user_name] = options.challenge
        return json.loads(options_to_json(options))
        
    def verify_authentication(self, user_name: str, response_json: dict) -> bool:
        challenge = self.challenges.get(user_name)
        if not challenge:
            return False
            
        existing_creds = self.get_user_credentials(user_name)
        
        credential_id = response_json.get("id")
        stored_cred = next((c for c in existing_creds if c["id"] == credential_id), None)
        if not stored_cred:
            return False
            
        try:
            verification = verify_authentication_response(
                credential=response_json,
                expected_challenge=challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
                credential_public_key=base64.b64decode(stored_cred["public_key"]),
                credential_current_sign_count=stored_cred["sign_count"],
                require_user_verification=True
            )
            stored_cred["sign_count"] = verification.new_sign_count
            self.save_db()
            return True
            
        except Exception as e:
            print(f"WebAuthn auth error: {e}")
            return False

webauthn_mgr = WebAuthnManager()
