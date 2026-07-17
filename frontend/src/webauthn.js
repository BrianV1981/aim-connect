import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function registerWebAuthn(apiToken) {
  try {
    const resp = await fetch('/api/webauthn/register/options', {
      headers: { 'x-api-token': apiToken }
    });
    const { options } = await resp.json();
    
    if (!options) throw new Error("Could not get registration options");
    
    const attResp = await startRegistration(options);
    
    const verifyResp = await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-token': apiToken
      },
      body: JSON.stringify({ response: attResp })
    });
    
    const verifyResult = await verifyResp.json();
    return verifyResult.status === 'success';
  } catch (error) {
    console.error("WebAuthn Registration Error:", error);
    return false;
  }
}

export async function authenticateWebAuthn(username) {
  try {
    const resp = await fetch('/api/webauthn/authenticate/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!resp.ok) {
      throw new Error("Device not registered or user not found");
    }
    
    const { options } = await resp.json();
    
    const asseResp = await startAuthentication(options);
    
    const verifyResp = await fetch('/api/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, response: asseResp })
    });
    
    if (!verifyResp.ok) throw new Error("Authentication failed on server");
    
    const verifyResult = await verifyResp.json();
    return verifyResult.token;
  } catch (error) {
    console.error("WebAuthn Auth Error:", error);
    throw error;
  }
}
