// NULLADIT experimental wallet identity binding.
// Wallet linking is not a login session or payment verification.

import { loadIdentity } from './key-storage.js';
import { signPayload } from './crypto.js';

const DEVICE_DOMAIN = 'NULLADIT:wallet-link:v1:';

export async function linkWallet({
  provider,
  nodeURL,
  identity,
  wallet,
  chainId
}) {
  if (!provider?.request) {
    throw new Error('Wallet provider unavailable');
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw new Error('Invalid wallet address');
  }

  if (!Number.isSafeInteger(chainId) || chainId < 1) {
    throw new Error('Invalid chain ID');
  }

  const url = new URL(nodeURL);

  if (url.protocol !== 'https:' ||
      url.username || url.password ||
      url.search || url.hash) {
    throw new Error('Protected HTTPS node required');
  }

  const record = await loadIdentity(identity);
  if (!record?.keys?.signing?.privateKey) {
    throw new Error(
      'Registered local NULLADIT identity required'
    );
  }

  const post = async (path, body) => {
    const endpoint = new URL(url);
    endpoint.pathname = path;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error'
    });

    if (!response.ok) {
      throw new Error(
        `Wallet request rejected (${response.status})`
      );
    }

    return response.json();
  };

  const accounts = await provider.request({
    method: 'eth_accounts'
  });

  if (!accounts.some(
    address => address.toLowerCase() === wallet.toLowerCase()
  )) {
    throw new Error('Connected wallet changed');
  }

  const currentChain = await provider.request({
    method: 'eth_chainId'
  });

  if (Number.parseInt(currentChain, 16) !== chainId) {
    throw new Error('Wallet network changed');
  }

  const challenge = await post('/wallet/challenge', {
    identity, wallet, chain_id: chainId
  });

  if (!challenge.nonce || !challenge.message ||
      !challenge.expires) {
    throw new Error('Invalid challenge response');
  }

  // The backend canonicalizes Ethereum address checksum casing.
  // Use exactly that canonical address in the device signature.
  const match = challenge.message.match(
    /^Wallet: (0x[0-9a-fA-F]{40})$/m
  );
  if (!match || match[1].toLowerCase() !== wallet.toLowerCase()) {
    throw new Error('Wallet challenge address mismatch');
  }
  const canonicalWallet = match[1];

  const expectedMessage = [
    'NULLADIT Experimental Preview',
    'Action: Link wallet to messaging identity',
    `Identity: ${identity}`,
    `Wallet: ${canonicalWallet}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${challenge.nonce}`,
    `Expires: ${challenge.expires}`,
    'No transaction or payment is requested.'
  ].join('\\n');

  if (
    challenge.message !== expectedMessage ||
    !/^[0-9a-f]{64}$/.test(challenge.nonce) ||
    !Number.isInteger(challenge.expires) ||
    challenge.expires <= Math.floor(Date.now() / 1000) ||
    challenge.expires > Math.floor(Date.now() / 1000) + 300
  ) {
    throw new Error('Invalid wallet challenge');
  }

  const walletSignature = await provider.request({
    method: 'personal_sign',
    params: [challenge.message, wallet]
  });

  const devicePayload = {
    identity,
    wallet: canonicalWallet,
    chain_id: chainId,
    nonce: challenge.nonce
  };

  const deviceAuthorization = await signPayload(
    record.keys.signing.privateKey,
    DEVICE_DOMAIN,
    devicePayload
  );

  const result = await post('/wallet/link', {
    ...devicePayload,
    wallet_signature: walletSignature,
    device_signature: deviceAuthorization.signature
  });

  if (!result.linked || result.identity !== identity) {
    throw new Error('Wallet linking not confirmed');
  }

  return result;
}
