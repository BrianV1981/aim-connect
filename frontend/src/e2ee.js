export async function deriveKey(secret) {
  const enc = new TextEncoder();
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
    this.inQueue = [];
    this.outQueue = [];
    this.isProcessingIn = false;
    this.isProcessingOut = false;
    this.onmessage = null;
    
    // Pass-through standard properties
    this.readyState = socket.readyState;
    this.socket.addEventListener('open', () => { this.readyState = this.socket.readyState; });
    this.socket.addEventListener('close', () => { this.readyState = this.socket.readyState; });
    this.socket.addEventListener('error', () => { this.readyState = this.socket.readyState; });
    
    this.socket.onmessage = (event) => {
      this.inQueue.push(event);
      this.processInQueue();
    };
  }
  
  get readyState() {
    return this.socket.readyState;
  }
  
  set readyState(val) {}
  
  set onopen(fn) { this.socket.onopen = fn; }
  set onclose(fn) { this.socket.onclose = fn; }
  set onerror(fn) { this.socket.onerror = fn; }
  
  async init() {
    if (!this.key && this.secretStr) {
      this.key = await deriveKey(this.secretStr);
    }
  }
  
  async processInQueue() {
    if (this.isProcessingIn || this.inQueue.length === 0) return;
    this.isProcessingIn = true;
    
    while (this.inQueue.length > 0) {
      const event = this.inQueue.shift();
      if (!this.onmessage) continue;
      
      try {
        if (!this.secretStr) {
          this.onmessage(event); // pass through if no secret
          continue;
        }
        
        if (typeof event.data === 'string') {
          if (event.data.includes('auth_success') && event.data.includes('type')) {
            this.onmessage({ data: event.data });
          } else {
            const decryptedStr = await decryptMessage(event.data, this.key);
            this.onmessage({ data: decryptedStr });
          }
        } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          // If it's a blob, we must read it
          let buffer = event.data;
          if (event.data instanceof Blob) {
            buffer = await event.data.arrayBuffer();
          }
          const decryptedBuf = await decryptBytes(buffer, this.key);
          this.onmessage({ data: decryptedBuf });
        }
      } catch (err) {
        console.error("E2EE Decrypt error", err);
      }
    }
    
    this.isProcessingIn = false;
  }
  
  async processOutQueue() {
    if (this.isProcessingOut || this.outQueue.length === 0) return;
    this.isProcessingOut = true;
    
    while (this.outQueue.length > 0) {
      const data = this.outQueue.shift();
      
      try {
        if (!this.secretStr) {
          this.socket.send(data);
          continue;
        }
        
        if (!this.key) await this.init();
        
        if (typeof data === 'string') {
          // Do not encrypt the initial auth message
          if (data.includes('"auth"') && data.includes('"type"')) {
            this.socket.send(data);
          } else {
            const encryptedStr = await encryptMessage(data, this.key);
            this.socket.send(encryptedStr);
          }
        } else {
          console.warn("E2EESocketWrapper: send raw bytes not implemented");
        }
      } catch (err) {
         console.error("E2EE Encrypt error", err);
      }
    }
    
    this.isProcessingOut = false;
  }
  
  send(data) {
    this.outQueue.push(data);
    this.processOutQueue();
  }
  
  close() {
    this.socket.close();
  }
}
