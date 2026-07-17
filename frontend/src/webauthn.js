import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function registerWebAuthn(apiToken) {
  try {
    const resp = await fetch('/api/webauthn/register/options', {
      headers: { 'x-api-token': apiToken }
    });
    const { options } = await resp.json();
    
    if (!options) throw new Error("Could not get registration options");
    
    const attResp = await startRegistration({ optionsJSON: options });
    
    const verifyResp = await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-token': apiToken
      },
      body: JSON.stringify({ response: attResp })
    });
    
    const verifyResult = await verifyResp.json();
    if (verifyResult.status === 'success') {
      return { success: true };
    }
    return { success: false, error: 'Server rejected verification' };
  } catch (error) {
    console.error("WebAuthn Registration Error:", error);
    return { success: false, error: error.message || error.toString() };
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
    
    const asseResp = await startAuthentication({ optionsJSON: options });
    
    const verifyResp = await fetch('/api/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, response: asseResp })
    });
    
    if (!verifyResp.ok) throw new Error("Authentication failed on server");
    
    const verifyResult = await verifyResp.json();
    return { success: true, token: verifyResult.token };
  } catch (error) {
    console.error("WebAuthn Auth Error:", error);
    return { success: false, error: error.message || error.toString() };
  }
}
