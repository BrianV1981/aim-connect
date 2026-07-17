// AES-GCM E2EE Utility for browser

export async function deriveKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  // Actually, backend uses simple SHA-256 for key derivation to keep it fast and compatible
  const hash = await window.crypto.subtle.digest("SHA-256", enc.encode(secret));
  
  return window.crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptBytes(dataBytes, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    dataBytes
  );
  
  // prepend IV
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result.buffer;
}

export async function decryptBytes(buffer, key) {
  const data = new Uint8Array(buffer);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );
  return decrypted;
}

export async function encryptMessage(messageStr, key) {
  const enc = new TextEncoder();
  const encryptedBuf = await encryptBytes(enc.encode(messageStr), key);
  // Convert to Base64
  const bytes = new Uint8Array(encryptedBuf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decryptMessage(b64Message, key) {
  const binary = atob(b64Message);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decryptedBuf = await decryptBytes(bytes.buffer, key);
  const dec = new TextDecoder();
  return dec.decode(decryptedBuf);
}

export class E2EESocketWrapper {
  constructor(socket, secretStr) {
    this.socket = socket;
    this.secretStr = secretStr;
    this.key = null;
    this.messageQueue = [];
    this.isProcessing = false;
    this.onmessage = null;
    
    // Intercept original socket
    this.socket.onmessage = (event) => {
      this.messageQueue.push(event);
      this.processQueue();
    };
  }
  
  async init() {
    this.key = await deriveKey(this.secretStr);
  }
  
  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift();
      if (!this.onmessage) continue;
      
      try {
        if (typeof event.data === 'string') {
          const decryptedStr = await decryptMessage(event.data, this.key);
          this.onmessage({ data: decryptedStr });
        } else if (event.data instanceof ArrayBuffer) {
          const decryptedBuf = await decryptBytes(event.data, this.key);
          this.onmessage({ data: decryptedBuf });
        }
      } catch (err) {
        console.error("E2EE Decrypt error", err);
      }
    }
    
    this.isProcessing = false;
  }
  
  async send(data) {
    if (!this.key) await this.init();
    if (typeof data === 'string') {
      const encryptedStr = await encryptMessage(data, this.key);
      this.socket.send(encryptedStr);
    } else {
      console.warn("E2EESocketWrapper: send raw bytes not implemented");
    }
  }
}
