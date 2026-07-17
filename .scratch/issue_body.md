### Description
Implement a secondary password authentication layer that occurs *after* successful TOTP verification, combined with anti-spam / rate-limiting logic to protect against brute-force attacks.

### Context
Currently, the system uses a 6-digit TOTP code for authentication. To enhance security (true Multi-Factor Authentication) without relying on WebAuthn/Biometrics (which were vetoed for privacy/sovereignty reasons), we are introducing a password layer.

### Implementation Plan
1. **Reverse-Order Auth Flow**: 
   - Verify the TOTP code *first*.
   - If TOTP is valid, *then* verify the password hash.
   - This prevents attackers from brute-forcing passwords or exhausting server CPU without first guessing the current 30-second TOTP token.
2. **Password Hashing**: 
   - Implement `bcrypt` (via `passlib`) in the FastAPI backend to securely hash and verify passwords.
   - Store the password hash locally (e.g., in `password.hash`), maintaining our zero-database architecture.
3. **Anti-Spam & Rate Limiting (Ban Logic)**:
   - Introduce rate-limiting on the `/login` endpoint.
   - If a user submits multiple incorrect passwords (even with a valid TOTP), temporarily ban the IP address or block further attempts for an escalating time period (e.g., lock out for 5 minutes after 5 failed attempts).
   - This can be implemented using an in-memory dictionary or `slowapi` in FastAPI.
4. **Frontend UX**:
   - Update the login view to include both the TOTP input and a Password input on the same screen for minimal friction.
   - Add `autocomplete="current-password"` to support password managers natively.
