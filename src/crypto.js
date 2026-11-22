// NULLADIT experimental browser cryptography.
// Preview compatibility only; not an audited messaging protocol.

const crypto = globalThis.crypto;
const subtle = crypto.subtle;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(
      key => `${JSON.stringify(key)}:${canonical(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function generateIdentity() {
  const signing = await subtle.generateKey(
    'Ed25519', false, ['sign', 'verify']
  );
  const encryption = await subtle.generateKey(
    'X25519', false, ['deriveBits']
  );
  return { signing, encryption };
}

export async function exportPublicKeys(identity) {
  const signing = new Uint8Array(await subtle.exportKey(
    'raw', identity.signing.publicKey
  ));
  const encryption = new Uint8Array(await subtle.exportKey(
    'raw', identity.encryption.publicKey
  ));
  return {
    device_public: bytesToBase64(signing),
    encryption_public: bytesToBase64(encryption)
  };
}

export async function signPayload(privateKey, domain, payload) {
  const data = encoder.encode(domain + canonical(payload));
  const signature = new Uint8Array(
    await subtle.sign('Ed25519', privateKey, data)
  );
  return {
    payload,
    signature: bytesToBase64(signature)
  };
}

export async function encryptMessage(
  recipientPublicBase64, plaintext, sender, recipient
) {
  const recipientKey = await subtle.importKey(
    'raw', base64ToBytes(recipientPublicBase64),
    'X25519', false, []
  );
  const ephemeral = await subtle.generateKey(
    'X25519', true, ['deriveBits']
  );
  const secret = await subtle.deriveBits(
    { name: 'X25519', public: recipientKey },
    ephemeral.privateKey,
    256
  );
  const material = await subtle.importKey(
    'raw', secret, 'HKDF', false, ['deriveKey']
  );
  const aesKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: encoder.encode('NULLADIT-message-v1-prototype')
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const aad = encoder.encode(canonical({ sender, recipient }));
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad },
    aesKey,
    encoder.encode(plaintext)
  ));

  return {
    version: 1,
    sender,
    recipient,
    ephemeral_public: bytesToBase64(new Uint8Array(
      await subtle.exportKey('raw', ephemeral.publicKey)
    )),
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext)
  };
}

export async function decryptMessage(privateKey, envelope) {
  if (envelope.version !== 1) {
    throw new Error('Unsupported encryption version');
  }

  const ephemeral = await subtle.importKey(
    'raw', base64ToBytes(envelope.ephemeral_public),
    'X25519', false, []
  );
  const secret = await subtle.deriveBits(
    { name: 'X25519', public: ephemeral },
    privateKey,
    256
  );
  const material = await subtle.importKey(
    'raw', secret, 'HKDF', false, ['deriveKey']
  );
  const aesKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: encoder.encode('NULLADIT-message-v1-prototype')
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const plaintext = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.nonce),
      additionalData: encoder.encode(canonical({
        sender: envelope.sender,
        recipient: envelope.recipient
      }))
    },
    aesKey,
    base64ToBytes(envelope.ciphertext)
  );

  return decoder.decode(plaintext);
}

export async function signMessage(privateKey, envelope) {
  const data = encoder.encode(
    'NULLADIT:signed-envelope:v1:' + canonical(envelope)
  );
  const signature = await subtle.sign(
    'Ed25519', privateKey, data
  );
  return {
    envelope,
    signature: bytesToBase64(new Uint8Array(signature))
  };
}

export const registrationDomain =
  'NULLADIT:preview-registration:v1:';

export const contactDomain =
  'NULLADIT:contact-permission:v1:';

export const inboxDomain =
  'NULLADIT:inbox-request:v1:';
