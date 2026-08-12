# Anti-Pattern: Domain Bypasses & DNS Hacks

**Mandate from Operator:**
Do NOT attempt to use hacky workarounds, such as provisioning temporary fallback subdomains (e.g., `aim.leaddeeds.com`), to bypass standard ISP negative DNS caching. 

**Reasoning:**
While creating an uncached fallback domain solves the immediate connectivity symptom, it introduces catastrophic downstream failures in strict-origin security protocols. Specifically, WebAuthn biometric passkeys strictly enforce matching Relying Party (RP) IDs. Introducing a fallback domain creates an inherent mismatch between the frontend origin and the backend RP ID, causing credential managers (Apple FaceID, Google) to reject all registration attempts as phishing.

**The Protocol:**
"Do things right." If a new domain is experiencing standard DNS propagation delays or ISP negative caching, wait it out. Do not attempt to mask the problem by fracturing the infrastructure across multiple temporary domains.
