import {
  exportPublicKeys,
  signPayload,
  encryptMessage,
  signMessage,
  decryptMessage,
  registrationDomain,
  contactDomain,
  inboxDomain
} from './crypto.js';

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function expires() {
  return Math.floor(Date.now() / 1000) + 120;
}

function endpoint(base, path) {
  const url = new URL(base);
  const local = url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1';

  if (url.protocol !== 'https:' &&
      !(local && url.protocol === 'http:')) {
    throw new Error('HTTPS required for remote NULLADIT nodes');
  }

  if (url.username || url.password ||
      url.search || url.hash) {
    throw new Error('Invalid node URL');
  }

  url.pathname = path;
  return url.toString();
}

export class NulladitClient {
  constructor(baseURL, identity, keys, sessionToken = null) {
    this.baseURL = baseURL;
    this.identity = identity;
    this.keys = keys;
    this.sessionToken = sessionToken;
  }

  async post(path, data) {
    const response = await fetch(
      endpoint(this.baseURL, path),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.sessionToken && ['/contacts', '/submit', '/inbox'].includes(path) ? { ...data, session_token: this.sessionToken } : data),
        cache: 'no-store',
        credentials: 'include',
        redirect: 'error',
      }
    );

    if (!response.ok) {
      throw new Error(
        `NULLADIT request rejected (${response.status})`
      );
    }

    return response.json();
  }

  async register(invitation) {
    const publicKeys = await exportPublicKeys(this.keys);
    const payload = {
      identity: this.identity,
      ...publicKeys,
      nonce: nonce(),
      expires: expires()
    };

    const signed = await signPayload(
      this.keys.signing.privateKey,
      registrationDomain,
      payload
    );

    return this.post('/register', { invitation, signed });
  }

  async setContact(contact, approve = true) {
    const payload = {
      account: this.identity,
      contact,
      action: approve ? 'approve' : 'withdraw',
      nonce: nonce(),
      expires: expires()
    };

    const signed = await signPayload(
      this.keys.signing.privateKey,
      contactDomain,
      payload
    );

    return this.post('/contacts', { signed });
  }

  async send(recipient, trustedEncryptionPublicKey, text) {
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Message required');
    }
    if (!trustedEncryptionPublicKey) {
      throw new Error('Trusted recipient key required');
    }

    const envelope = await encryptMessage(
      trustedEncryptionPublicKey,
      text,
      this.identity,
      recipient
    );

    const signed = await signMessage(
      this.keys.signing.privateKey,
      envelope
    );

    return this.post('/submit', {
      sender: this.identity,
      signed
    });
  }

  async inbox() {
    const signed = await signPayload(
      this.keys.signing.privateKey,
      inboxDomain,
      {
        account: this.identity,
        nonce: nonce(),
        expires: expires()
      }
    );

    return this.post('/inbox', { signed });
  }

  async decrypt(envelope) {
    if (envelope.recipient !== this.identity) {
      throw new Error('Incorrect message recipient');
    }

    return decryptMessage(
      this.keys.encryption.privateKey,
      envelope
    );
  }
}
