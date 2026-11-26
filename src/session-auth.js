import {
  listIdentities,
  loadIdentity,
  saveIdentity
} from './key-storage.js';
import {
  exportPublicKeys,
  generateIdentity,
  registrationDomain,
  signPayload
} from './crypto.js';

const NODE_URL = (
  import.meta.env.VITE_NULLADIT_NODE_URL || 'https://node.nulladit.org'
).trim();

const CHAIN_ID = 324;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const NONCE = /^[0-9a-f]{64}$/;

export function nodeBase() {
  const url = new URL(NODE_URL || window.location.origin);

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Protected HTTPS node required');
  }

  return url;
}

async function post(path, body) {
  const url = nodeBase();
  url.pathname = path;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    credentials: 'include',
    redirect: 'error',
        signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`NULLADIT authentication rejected (${response.status})`);
  }

  return response.json();
}

function expectedMessage(identity, wallet, nonce, expires) {
  return [
    'NULLADIT Experimental Preview',
    'Action: Sign in to messaging account',
    `Identity: ${identity}`,
    `Wallet: ${wallet}`,
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Expires: ${expires}`,
    'No transaction or payment is requested.',
  ].join('\n');
}

function challengeMatches(message, expected) {
  if (typeof message !== 'string') return false;
  const normalize = value => value.replace(/^Wallet: (0x[0-9a-fA-F]{40})$/m, (_, address) => 'Wallet: ' + address.toLowerCase());
  return normalize(message) === normalize(expected);
}

function validateChallenge(challenge, identity, wallet) {
  const now = Math.floor(Date.now() / 1000);

  if (
    !challenge ||
    !NONCE.test(challenge.nonce || '') ||
    !Number.isInteger(challenge.expires) ||
    challenge.expires <= now ||
    challenge.expires > now + 300 ||
    !challengeMatches(challenge.message, expectedMessage(
      identity,
      wallet,
      challenge.nonce,
      challenge.expires
    ))
  ) {
    throw new Error('Invalid login challenge');
  }
}

function expectedSetupMessage(wallet, nonce, expires) {
  return [
    'NULLADIT Account Setup',
    'Action: Authenticate wallet for account setup',
    `Wallet: ${wallet}`,
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Expires: ${expires}`,
    'No transaction or payment is requested.',
  ].join('\n');
}

async function authenticateSetupWallet(provider, wallet) {
  const challenge = await post('/setup/challenge', {
    wallet,
    chain_id: CHAIN_ID,
  });
  const now = Math.floor(Date.now() / 1000);

  if (
    !NONCE.test(challenge?.nonce || '') ||
    !Number.isInteger(challenge?.expires) ||
    challenge.expires <= now ||
    challenge.expires > now + 300 ||
    !challengeMatches(challenge.message, expectedSetupMessage(
      wallet,
      challenge.nonce,
      challenge.expires
    ))
  ) {
    throw new Error('Invalid account-setup challenge');
  }

  const signature = await provider.request({
    method: 'personal_sign',
    params: [challenge.message, wallet],
  });

  const result = await post('/setup/authenticate', {
    wallet,
    chain_id: CHAIN_ID,
    nonce: challenge.nonce,
    signature,
  });

  if (
    !NONCE.test(result?.token || '') ||
    !ADDRESS.test(result?.wallet || '') ||
    result.wallet.toLowerCase() !== wallet.toLowerCase() ||
    (!Number.isInteger(result?.expires) || result.expires <= now)
  ) {
    throw new Error('Invalid account-setup session');
  }

  return {
    needsRegistration: true,
    setupToken: result.token,
    setupExpires: result.expires,
  };
}

export async function generateNameOffer(setupToken) {
  const result = await post('/setup/name', {
    token: setupToken,
  });

  if (
    !NONCE.test(result?.offer_token || '') ||
    typeof result?.network_name !== 'string' ||
    !Number.isInteger(result?.expires_at) ||
    result.locked !== false
  ) {
    throw new Error('Invalid network-name offer');
  }

  return result;
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function identityForName(networkName) {
  const identity = networkName.toLowerCase().replaceAll(' ', '-');
  if (!/^[a-z0-9-]{3,32}$/.test(identity)) {
    throw new Error('Invalid generated identity');
  }
  return identity;
}

function permanentNameMessage(
  wallet, identity, networkName, offerToken
) {
  return [
    'NULLADIT Permanent Network Name',
    `Wallet: ${wallet.toLowerCase()}`,
    `Account: ${identity}`,
    `Name: ${networkName}`,
    `Offer: ${offerToken}`,
    `Chain ID: ${CHAIN_ID}`,
    'This name is permanent and cannot be transferred, renamed, or reused.',
  ].join('\n');
}

export async function registerTesterAccount({
  provider,
  wallet,
  setupToken,
  offerToken,
  networkName,
}) {
  if (!provider?.request || !ADDRESS.test(wallet || '')) {
    throw new Error('Connected wallet required');
  }
  if (!NONCE.test(setupToken || '') ||
      !NONCE.test(offerToken || '')) {
    throw new Error('Valid setup and name offer required');
  }

  const identity = identityForName(networkName);
  let record = await loadIdentity(identity);

  if (!record) {
    const keys = await generateIdentity();
    await saveIdentity(identity, keys);
    record = await loadIdentity(identity);
  }

  if (!record?.keys?.signing?.privateKey) {
    throw new Error('Local device keys unavailable');
  }

  const lockMessage = permanentNameMessage(
    wallet, identity, networkName, offerToken
  );
  const walletSignature = await provider.request({
    method: 'personal_sign',
    params: [lockMessage, wallet],
  });

  const publicKeys = await exportPublicKeys(record.keys);
  const payload = {
    identity,
    ...publicKeys,
    nonce: randomNonce(),
    expires: Math.floor(Date.now() / 1000) + 120,
  };
  const signedRegistration = await signPayload(
    record.keys.signing.privateKey,
    registrationDomain,
    payload
  );

  const result = await post('/setup/register', {
    setup_token: setupToken,
    offer_token: offerToken,
    network_name: networkName,
    wallet_signature: walletSignature,
    signed_registration: signedRegistration,
  });

  if (
    result?.registered !== true ||
    result.identity !== identity ||
    result.network_name !== networkName ||
    result.wallet.toLowerCase() !== wallet.toLowerCase() ||
    result.fee_waived !== true ||
    !NONCE.test(result?.session?.token || '') ||
    !Number.isInteger(result?.session?.expires)
  ) {
    throw new Error('Account registration was not confirmed');
  }

  return result;
}

export async function authenticateWallet(provider, wallet) {
  if (!provider?.request) {
    throw new Error('Wallet provider unavailable');
  }
  if (!ADDRESS.test(wallet || '')) {
    throw new Error('Invalid wallet address');
  }

  const chainHex = await provider.request({
    method: 'eth_chainId'
  });
  if (Number.parseInt(chainHex, 16) !== CHAIN_ID) {
    throw new Error('ZKsync Era chain required');
  }

  const accounts = await provider.request({
    method: 'eth_accounts'
  });
  if (!accounts.some(
    address => address.toLowerCase() === wallet.toLowerCase()
  )) {
    throw new Error('Connected wallet changed');
  }

  const identities = await listIdentities();
  if (!Array.isArray(identities) || identities.length === 0) {
    return authenticateSetupWallet(provider, wallet);
  }

  let selected = null;
  let challenge = null;

  for (const identity of identities) {
    try {
      const result = await post('/wallet/login/challenge', {
        identity,
        wallet,
      });
      selected = identity;
      challenge = result;
      break;
    } catch {
      // Only locally stored identities are attempted.
    }
  }

  if (!selected || !challenge) {
    return authenticateSetupWallet(provider, wallet);
  }

  validateChallenge(challenge, selected, wallet);

  const signature = await provider.request({
    method: 'personal_sign',
    params: [challenge.message, wallet],
  });

  const session = await post('/wallet/login', {
    identity: selected,
    wallet,
    nonce: challenge.nonce,
    signature,
  });

  if (
    typeof session.token !== 'string' ||
    !NONCE.test(session.token) ||
    session.identity !== selected ||
    (!Number.isInteger(session.expires) || session.expires <= Math.floor(Date.now() / 1000))
  ) {
    throw new Error('Invalid session response');
  }

  return {
    needsRegistration: false,
    token: session.token,
    identity: session.identity,
    expires: session.expires,
  };
}

export async function revokeSession(token) {
  if (!NONCE.test(token || '')) return false;

  try {
    const result = await post('/wallet/logout', { token });
    return result.revoked === true;
  } catch {
    return false;
  }
}

export async function revokeSetupSession(token) {
  if (!NONCE.test(token || '')) return false;
  try { return (await post('/setup/logout', { token })).revoked === true; }
  catch { return false; }
}
