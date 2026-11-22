import { linkWallet } from './wallet-auth.js';
import { loadIdentity } from './key-storage.js';

const NODE_URL = (
  import.meta.env.VITE_NULLADIT_NODE_URL || ''
).trim();

const addressPattern = /^0x[a-fA-F0-9]{40}$/;

function hasProtectedNode() {
  try {
    const url = new URL(NODE_URL);
    return url.protocol === 'https:' &&
      !url.username && !url.password &&
      !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function attachWalletConnect() {
  const target = document.querySelector('.sidebar-bottom');
  if (!target) throw new Error('Sidebar not found');

  const panel = document.createElement('section');
  panel.className = 'preview-setup';

  panel.innerHTML = `
    <div class="preview-setup-heading">
      <span>✦ ZKSYNC WALLET</span>
      <span class="preview-setup-state" id="wallet-state">
        DISCONNECTED
      </span>
    </div>
    <p class="preview-setup-description" id="wallet-details">
      Connect your wallet. No payment required.
    </p>
    <button id="wallet-connect-button" type="button"
      style="width:100%;cursor:pointer">
      CONNECT WALLET
    </button>
    <button id="wallet-link-button" type="button"
      style="width:100%;margin-top:8px"
      disabled>
      LINK WALLET TO ACCOUNT
    </button>
    <p id="wallet-feedback" role="status"
      aria-live="polite"></p>
  `;

  target.prepend(panel);

  const connectButton = panel.querySelector(
    '#wallet-connect-button'
  );
  const linkButton = panel.querySelector(
    '#wallet-link-button'
  );
  const state = panel.querySelector('#wallet-state');
  const details = panel.querySelector('#wallet-details');
  const feedback = panel.querySelector('#wallet-feedback');

  let provider = null;
  let connected = null;

  function reset() {
    connected = null;
    state.textContent = 'DISCONNECTED';
    details.textContent = 'No wallet connected.';
    connectButton.textContent = 'CONNECT WALLET';
    connectButton.disabled = false;
    linkButton.disabled = true;
  }

  async function refresh() {
    if (!provider) return reset();

    const [accounts, chainHex] = await Promise.all([
      provider.request({ method: 'eth_accounts' }),
      provider.request({ method: 'eth_chainId' })
    ]);

    const address = accounts?.[0];
    const chainId = Number.parseInt(chainHex, 16);

    if (!addressPattern.test(address || '') ||
        !Number.isSafeInteger(chainId)) {
      return reset();
    }

    connected = { address, chainId };
    state.textContent = 'CONNECTED';
    details.textContent =
      `${address.slice(0, 6)}...${address.slice(-4)} · Chain ${chainId}`;

    connectButton.textContent = 'WALLET CONNECTED';
    connectButton.disabled = true;
    linkButton.disabled = !hasProtectedNode();

    feedback.textContent = hasProtectedNode()
      ? 'Wallet connected. Account linking is available.'
      : 'Awaiting protected HTTPS node. Wallet is not authenticated.';
  }

  connectButton.addEventListener('click', async () => {
    connectButton.disabled = true;
    feedback.textContent = 'Requesting wallet connection...';

    try {
      provider = window.ethereum;
      if (!provider?.request) {
        throw new Error('Compatible wallet not detected');
      }

      await provider.request({
        method: 'eth_requestAccounts'
      });

      provider.on?.('accountsChanged', () => {
        refresh().catch(reset);
      });
      provider.on?.('chainChanged', () => {
        refresh().catch(reset);
      });
      provider.on?.('disconnect', reset);

      await refresh();
    } catch (error) {
      reset();
      feedback.textContent = error?.code === 4001
        ? 'Wallet connection cancelled.'
        : 'Wallet connection failed.';
    }
  });

  linkButton.addEventListener('click', async () => {
    if (!connected || !hasProtectedNode()) return;

    const identity = document.querySelector(
      '#nulladit-identity'
    )?.value.trim();

    if (!identity || !await loadIdentity(identity)) {
      feedback.textContent =
        'Register your NULLADIT identity before linking a wallet.';
      return;
    }

    linkButton.disabled = true;
    feedback.textContent =
      'Requesting signed wallet-link challenge...';

    try {
      const current = { ...connected };

      const result = await linkWallet({
        provider,
        nodeURL: NODE_URL,
        identity,
        wallet: current.address,
        chainId: current.chainId
      });

      await refresh();

      if (!result.linked) {
        throw new Error('Linking not confirmed');
      }

      feedback.textContent =
        'Wallet linked to NULLADIT account. ' +
        'Authenticated login sessions are not yet enabled.';
    } catch (error) {
      feedback.textContent =
        'Wallet linking not confirmed: ' +
        (error?.message || 'Request failed');
    } finally {
      linkButton.disabled = !connected || !hasProtectedNode();
    }
  });

  reset();
}
