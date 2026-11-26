import './console.css';
import { whitelistView, walletReadsView, bindLocalTools, resetLocalTools } from './local-tools.js';
import { messengerView, bindMessenger, resetMessenger } from './messenger.js';
import {
  authenticateWallet,
  generateNameOffer,
  registerTesterAccount,
  revokeSession, revokeSetupSession
} from './session-auth.js';

const firstWords = [
  'Aurora', 'Birch', 'Boreal', 'Cedar', 'Copper',
  'Frost', 'Granite', 'Maple', 'Misty', 'Northern',
  'Pine', 'Prairie', 'River', 'Rocky', 'Silver',
  'Spruce', 'Timber', 'Tundra', 'Wild', 'Winter'
];

const secondWords = [
  'Bear', 'Beaver', 'Caribou', 'Creek', 'Falcon',
  'Harbour', 'Lake', 'Loon', 'Moose', 'Otter',
  'Owl', 'Pines', 'Raven', 'Ridge', 'River',
  'Trail', 'Valley', 'Wolf', 'Woods', 'Yukon'
];


const state = {
  tab: 'messages',
  candidate: 'Cedar Loon 4827',
  selectedNode: null,
  autoSelect: true,
  strictRelays: true,
  wallet: null,
  walletError: '',
  session: null,
  identity: null,
  sessionExpires: null,
  authBusy: false,
  needsRegistration: false,
  setupToken: null,
  setupExpires: null,
  nameOffer: null,
  showAccountSetup: false,
  localHealth: null,
  localHealthBusy: false,
};

const nav = [
  ['messages', 'Messages'],
  ['contacts', 'Whitelist'],
  ['my-node', 'My Node'],
  ['active-nodes', 'Active Nodes'],
  ['wallet', 'Wallet'],
  ['updates', 'Updates'],
  ['governance', 'PoS Proposals & Voting'],
  ['settings', 'Settings'],
];

const nodes = [
  {
    id: 'founding-relay-001',
    name: 'Apesoft Relay 001',
    status: 'Awaiting live health check',
    receipts: 0,
    flagged: false,
  },
  {
    id: 'founding-relay-002',
    name: 'Apesoft Relay 002',
    status: 'Awaiting live health check',
    receipts: 0,
    flagged: false,
  },
];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[char]);
}

function logo() {
  return `
    <div class="logo-mark" aria-label="NULLADIT loon speech-bubble logo">
      <img src="/nulladit-loon.png" alt="NULLADIT loon logo">
    </div>
  `;
}

function statusPill(text, tone = 'safe') {
  return `<span class="status-pill ${tone}">${escapeHTML(text)}</span>`;
}

function messagesView() {
  if (state.session) return messengerView(state, escapeHTML);
  return '<div class="content-page"><h2>Messages</h2><article class="card"><h3>Messaging unavailable</h3><p>Connect to the node and authenticate your account to access encrypted conversations. No messages are loaded in local mode.</p></article></div>';
}

function myNodeView() {
  return `
    <div class="content-page">
      <div class="page-title">
        <div>
          <p class="eyebrow">Operator console</p>
          <h2>My Node</h2>
        </div>
        ${statusPill(state.localHealth ? 'Local runtime reachable' : 'Not verified', state.localHealth ? 'safe' : 'neutral')}
      </div>

      <div class="card-grid two">
        <article class="card">
          <h3>Node status</h3>
          <div class="metric">${state.localHealth ? "Online locally" : "Not checked"}</div>
          <p>
            ${state.localHealth ? 'Local node: ' + escapeHTML(state.localHealth) : 'Check the installed local runtime. Internet relay enrollment is not yet available.'}
          </p>
          <button id="local-health" ${state.localHealthBusy?'disabled':''}>Check local node</button>
          <small>Mining is unavailable and remains paused.</small>
        </article>

        <article class="card">
          <h3>Operator support</h3>
          <p>
            Verified working node operators may contact <strong>apesoft.eth</strong> through dedicated support for setup assistance,
            a support ticket, or to report malicious wallet activity
            observed through your node.
          </p>
          <button disabled>Open operator support</button><small>Working-node eligibility verification and encrypted support transport are not connected yet. Private chat permissions are unchanged.</small>
          <small>
            Reports never automatically blacklist or punish a wallet.
          </small>
        </article>
      </div>

      <article class="card">
        <h3>Diagnostics sharing</h3>
        <p>
          Diagnostic logs are never sent automatically. Message content
          and encryption keys are never included.
        </p>
        <label class="toggle-row">
          <input type="checkbox" disabled>
          <span>Share selected diagnostics with a support ticket</span>
        </label>
      </article>
    </div>
  `;
}

function activeNodesView() {
  return `
    <div class="content-page">
      <div class="page-title">
        <div>
          <p class="eyebrow">Relay selection</p>
          <h2>Active Nodes</h2>
        </div>
        ${statusPill('Health checks pending', 'warning')}
      </div>

      <article class="card selection-card">
        <label class="toggle-row">
          <input id="auto-select" type="checkbox" disabled
            ${state.autoSelect ? 'checked' : ''}>
          <span>
            <strong>Choose the most reliable eligible node</strong>
            <small>
              Selection will use verified delivery receipts and your
              safety parameters.
            </small>
          </span>
        </label>
      </article>

      <div class="node-list">
        ${nodes.map((node) => `
          <article class="node-card">
            <div>
              <div class="node-title">
                <h3>${escapeHTML(node.name)}</h3>
                ${node.flagged
                  ? statusPill('Mandated update installed', 'danger')
                  : statusPill('Access flag not verified', 'warning')}
              </div>
              <p>${escapeHTML(node.status)}</p>
              <small>
                ${node.receipts} locally verified delivery receipts
              </small>
            </div>
            <button disabled>
              Discovery unavailable
            </button>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function walletView() {
  return `
    <div class="content-page">
      <div class="page-title">
        <div>
          <p class="eyebrow">ZKsync Era · Chain 324</p>
          <h2>Wallet</h2>
        </div>
        ${state.wallet
  ? statusPill('Connected · Chain 324', 'safe')
  : statusPill('Disconnected', 'neutral')}
      </div>

      <article class="card">
        <h3>Browser wallet</h3>
        <p id="wallet-feedback">
          ${state.wallet
            ? `Connected: ${escapeHTML(state.wallet)}`
            : escapeHTML(
                state.walletError ||
                'Connect the wallet that will own this account.'
              )}
        </p>
        <button id="connect-wallet" ${state.wallet ? "disabled" : ""}>
          ${state.wallet ? 'Wallet connected' : 'Connect wallet'}
        </button>
        <small>
          Connection alone does not sign, pay, register, or authorize anything.
        </small>
      </article>

      <div class="card-grid three">
        <article class="card balance">
          <span>$NULL22</span><strong>—</strong><small>See live balances below</small>
        </article>
        <article class="card balance">
          <span>Retirement Bonds</span><strong>—</strong><small>Not connected</small>
        </article>
        <article class="card balance">
          <span>Unclaimed node earnings</span><strong>—</strong>
          <button disabled>Claim</button>
        </article>
      </div>

      ${walletReadsView(state, escapeHTML)}
      <article class="card notice">
        <h3>Transfer-tax notice</h3>
        <p>
          NULLADIT intends a 1% transfer tax payable to Apesoft Canada
          to help fund security updates. The console must confirm actual
          contract enforcement before displaying the tax as active.
        </p>
      </article>
    </div>
  `;
}

function updatesView() {
  return `
    <div class="content-page">
      <div class="page-title">
        <div>
          <p class="eyebrow">Operator choice</p>
          <h2>Proposed Updates</h2>
        </div>
        ${statusPill('Proposal service unavailable', 'warning')}
      </div>

      <article class="card">
        <h3>Update availability not verified</h3>
        <p>
          A future proposal will show its version, proof-of-service scope,
          three-constituency approval record, source fingerprint, and any
          government-mandated or access-affecting flag.
        </p>
        <div class="button-row">
          <button disabled>Accept with wallet signature</button>
          <button class="secondary" disabled>Reject</button>
        </div>
      </article>

      <article class="card warning-card">
        <h3>Node operators retain the choice</h3>
        <p>
          Flagged updates remain visible. Users may exclude nodes that
          installed a government-mandated access change.
        </p>
      </article>
    </div>

  `;
}

function governanceView() {
  return `<div class="content-page">
    <div class="page-title"><div><p class="eyebrow">NULL22 · Network governance</p><h2>Proof-of-Service Proposals &amp; Voting</h2></div>${statusPill('Preview · voting unavailable','warning')}</div>
    <article class="card"><h3>Proposal registry</h3><p>No live proposal registry is connected. Proposal availability, eligibility and results cannot yet be verified. No ballots or signatures are collected by this preview.</p><small>Only Apesoft Canada may propose proof-standard upgrades.</small></article>
    <div class="card-grid three">
      <article class="card balance"><span>Apesoft Canada</span><strong>⅓</strong><small>Corporate vote only; optional abstention</small></article>
      <article class="card balance"><span>Independent operators</span><strong>⅓</strong><small>One vote per verified operator · 90 days of service</small></article>
      <article class="card balance"><span>Independent NULL22 holders</span><strong>⅓</strong><small>Proportional holdings · 30-day historical snapshot</small></article>
    </div>
    <article class="card"><h3>Voting rules</h3><p>Two-thirds approval of active voting weight; 50% participation in each independent constituency. When Apesoft abstains or does not vote, operators and token holders each carry half of active voting weight. Apesoft-controlled nodes and holdings cannot vote in either independent bloc.</p><p>30-day ballot period · seven-day execution delay · seven-day historical proof migration.</p></article>
    <article class="card"><h3>Cast your vote</h3><p>Wallet connection does not establish governance eligibility. A verified election, constituency and snapshot proof are required.</p><div class="button-row"><button disabled>Vote yes</button><button class="secondary" disabled>Vote no</button></div><small>No vote will be stored, signed or submitted in preview mode.</small></article>
    <article class="card warning-card"><h3>Scope and operator choice</h3><p>Proof-standard proposals do not confer adjudication or confiscation powers. Operators choose whether to install updates; obsolete standards may cease to qualify for new rewards. Previously authorized rewards remain protected.</p></article>
  </div>`;
}

function settingsView() {
  return `
    <div class="content-page">
      <div class="page-title">
        <div>
          <p class="eyebrow">Account and privacy</p>
          <h2>Settings</h2>
        </div>
      </div>

      <article class="card name-card">
        <div>
          <p class="eyebrow">Permanent network name</p>
          <h3>${escapeHTML(state.identity || 'Not authenticated')}</h3>
          <p>
            Generate another name until you find one you like.
            Once wallet-signed and locked, it can never be changed,
            transferred, or used by another account or node.
          </p>
        </div>
        <div class="button-row">
          <button id="generate-name" class="secondary" disabled>
            Generate new name
          </button>
          <button id="lock-name" disabled>Lock with wallet signature</button>
        </div>
        <small id="name-feedback">
          ${state.session ? 'Wallet-bound preview account' : 'Network account not verified'}
        </small>
      </article>

      <article class="card">
        <label class="toggle-row">
          <input id="strict-relays" type="checkbox" disabled
            ${state.strictRelays ? 'checked' : ''}>
          <span>
            <strong>Exclude access-flagged or unknown nodes</strong>
            <small>No silent fallback outside these parameters.</small>
          </span>
        </label>
      </article>
    </div>
  `;
}

function view() {
  if (state.tab === 'contacts') return whitelistView(state, escapeHTML);
  if (state.tab === 'messages') return messagesView();
  if (state.tab === 'my-node') return myNodeView();
  if (state.tab === 'active-nodes') return activeNodesView();
  if (state.tab === 'wallet') return walletView();
  if (state.tab === 'updates') return updatesView();
  if (state.tab === 'governance') return governanceView();
  return settingsView();
}

function candidate() {
  const first =
    firstWords[Math.floor(Math.random() * firstWords.length)];
  const second =
    secondWords[Math.floor(Math.random() * secondWords.length)];
  const number = 1000 + Math.floor(Math.random() * 9000);
  return `${first} ${second} ${number}`;
}

let providerEventsBound = false;
let authGeneration = 0;
let sessionExpiryTimer = null;

function accountSetupGate() {
  return `
    <main class="auth-page">
      <section class="auth-card account-setup-card">
        ${logo()}
        <p class="eyebrow">Permanent network name</p>
        <h1>${escapeHTML(state.candidate)}</h1>
        <p class="auth-copy">
          Generate another name until you find one you like.
          Once locked, it is permanent and globally reserved.
        </p>
        <button id="generate-setup-name" class="secondary">
          Generate new name
        </button>
        <button id="lock-setup-name">
          Lock name and create account
        </button>
        <p class="auth-status">
          Wallet verified · candidate not locked
        </p>
        <small>
          Authorized tester wallets pay no setup fee and receive no
          special authority or permissions.
        </small>
      </section>
    </main>
  `;
}

function authenticationGate() {
  if (state.showAccountSetup) return accountSetupGate();
  const status = state.authBusy
    ? 'Check your wallet to continue.'
    : state.needsRegistration
      ? 'Wallet verified. This browser needs account setup.'
      : state.walletError ||
        'Connect your ZKsync Era wallet to open the console.';

  return `
    <main class="auth-page">
      <section class="auth-card">
        ${logo()}
        <p class="eyebrow">Inviolable conversations</p>
        <h1>NULLADIT</h1>
        <p class="auth-copy">
          Connect your wallet to explore the local console. Network authentication is separate.
          No transaction or payment is requested to sign in.
        </p>
        <button id="connect-and-authenticate"
          ${state.authBusy || state.needsRegistration ? 'disabled' : ''}>
          ${state.authBusy ? 'Waiting for wallet…' : 'Connect EVM wallet'}
        </button>
        <p class="auth-status" role="status">${escapeHTML(status)}</p>
        ${state.needsRegistration ? `
          <button id="begin-account-setup" class="secondary" disabled>
            Account setup is the next sweep
          </button>
        ` : ''}
        <small>
          Session ends on refresh, connection loss, wallet disconnect,
          account change, chain change, or server expiry.
        </small>
      </section>
    </main>
  `;
}

async function clearSession(reason, revoke = true) {
  const token = state.session;
  const setupToken = state.setupToken;
  authGeneration++;
  resetMessenger();
  resetLocalTools();
  state.setupToken = null;
  state.setupExpires = null;
  state.nameOffer = null;
  state.showAccountSetup = false;
  state.needsRegistration = false;

  state.session = null;
  state.identity = null;
  state.sessionExpires = null;
  state.wallet = null;
  state.tab = 'messages';
  state.walletError = reason || 'Session ended.';
  state.authBusy = false;

  if (sessionExpiryTimer) {
    clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = null;
  }

  renderConsole();

  if (revoke && token && navigator.onLine) {
    await revokeSession(token);
  }
  if (revoke && setupToken && navigator.onLine) await revokeSetupSession(setupToken);
}

function bindProviderEvents(provider) {
  if (providerEventsBound || !provider?.on) return;
  providerEventsBound = true;

  provider.on('accountsChanged', () => {
    clearSession('Wallet account changed. Sign in again.');
  });
  provider.on('chainChanged', (chainHex) => {
    if (Number.parseInt(chainHex, 16) !== 324) {
      clearSession('Wallet left ZKsync Era. Sign in again.');
    }
  });
  provider.on('disconnect', () => {
    clearSession('Wallet disconnected.');
  });
}

function scheduleSessionExpiry(expires) {
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);

  const delay = Math.max(0, (expires * 1000) - Date.now());
  sessionExpiryTimer = setTimeout(() => {
    clearSession('Session expired. Sign in again.');
  }, delay);
}

async function connectBrowserWallet() {
  const attempt = ++authGeneration;
  state.walletError = '';
  state.needsRegistration = false;
  state.authBusy = true;
  renderConsole();

  try {
    const provider = window.ethereum;
    if (!provider?.request) {
      throw new Error('Compatible browser wallet not detected');
    }

    let chainHex = await provider.request({
      method: 'eth_chainId'
    });
    let chainId = Number.parseInt(chainHex, 16);

    if (chainId !== 324) {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x144' }]
      });
      chainHex = await provider.request({
        method: 'eth_chainId'
      });
      chainId = Number.parseInt(chainHex, 16);
    }

    if (chainId !== 324) {
      throw new Error('ZKsync Era network switch was not confirmed');
    }

    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });
    const wallet = accounts?.[0];

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet || '')) {
      throw new Error('Wallet did not provide a valid address');
    }

    if (attempt !== authGeneration) return;
    state.wallet = wallet;
    bindProviderEvents(provider);
    state.walletError = '';


  } catch (error) {
    if (attempt !== authGeneration) return;
    state.wallet = null;
    state.needsRegistration = false;
    state.showAccountSetup = false;
    state.walletError =
      error?.code === 4001
        ? 'Wallet request cancelled.'
        : error?.message || 'Wallet authentication failed.';
  } finally {
    if (attempt === authGeneration) { state.authBusy = false; renderConsole(); }
  }
}

async function connectNodeSession() {
  if (!state.wallet || state.session || state.authBusy) return;
  const attempt = ++authGeneration;
  const wallet = state.wallet;
  const provider = window.ethereum;
  state.authBusy = true;
  state.walletError = '';
  renderConsole();
  try {
    const result = await authenticateWallet(provider, wallet);
    if (attempt !== authGeneration) { if (result.token) await revokeSession(result.token); if (result.setupToken) await revokeSetupSession(result.setupToken); return; }

    if (result.needsRegistration) {
      state.needsRegistration = true;
      state.setupToken = result.setupToken;
      state.setupExpires = result.setupExpires;
      const offer = await generateNameOffer(result.setupToken);
      if (attempt !== authGeneration) return;
      state.candidate = offer.network_name;
      state.nameOffer = offer.offer_token;
      state.showAccountSetup = true;
      scheduleSessionExpiry(result.setupExpires);
      state.walletError = '';
      return;
    }

    state.session = result.token;
    state.identity = result.identity;
    state.sessionExpires = result.expires;
    scheduleSessionExpiry(result.expires);

  } catch (error) {
    if (attempt !== authGeneration) return;
    const setupToken = state.setupToken;
    state.setupToken = null;
    state.nameOffer = null;
    state.needsRegistration = false;
    state.showAccountSetup = false;
    state.walletError = 'Node authentication unavailable: ' + (error?.message || 'Connection failed');
    if (setupToken) void revokeSetupSession(setupToken);
  } finally {
    if (attempt === authGeneration) { state.authBusy = false; renderConsole(); }
  }
}

window.addEventListener('offline', () => {
  authGeneration++; resetMessenger(); state.session = null; state.identity = null; state.sessionExpires = null; state.setupToken = null; state.showAccountSetup = false; state.needsRegistration = false; state.authBusy = false; state.walletError = 'Internet offline. Local tools remain available.'; if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer); renderConsole();
});


function bind() {
  document.querySelector('#local-health')?.addEventListener('click',async()=>{
    if(state.localHealthBusy)return;
    state.localHealthBusy=true;state.localHealth=null;
    const attempt=authGeneration;
    renderConsole();
    try {
      if(location.protocol!=='http:' || location.hostname!=='127.0.0.1')throw Error('Open the installed dashboard from the local node');
      const response=await fetch('/health',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});
      const data=await response.json();
      if(response.ok&&data.service==='NULLADIT'&&data.status==='local'&&/^[0-9a-f]{64}$/.test(data.node)&&attempt===authGeneration)state.localHealth=data.node;
    }catch{}
    finally{state.localHealthBusy=false;renderConsole();}
  });
  bindLocalTools(state, renderConsole);
  if (state.session) bindMessenger(state, renderConsole);
  document.querySelector('#connect-node')?.addEventListener('click', connectNodeSession);
  document.querySelector('#logout')?.addEventListener('click', () => clearSession('Signed out.'));
  document.querySelector('#connect-wallet')
    ?.addEventListener('click', connectBrowserWallet);
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.tab = button.dataset.tab;
      renderConsole();
    });
  });


  document.querySelector('#generate-name')
    ?.addEventListener('click', () => {
      state.candidate = candidate();
      renderConsole();
    });

  document.querySelector('#lock-name')
    ?.addEventListener('click', () => {
      document.querySelector('#name-feedback').textContent =
        'Connect the wallet that will own this account before locking.';
    });

  document.querySelector('#auto-select')
    ?.addEventListener('change', (event) => {
      state.autoSelect = event.target.checked;
    });

  document.querySelector('#strict-relays')
    ?.addEventListener('change', (event) => {
      state.strictRelays = event.target.checked;
    });

  document.querySelectorAll('[data-node]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedNode = button.dataset.node;
      button.textContent = 'Awaiting secure connection';
      button.disabled = true;
    });
  });
}

export function renderConsole() {
  if (!state.wallet || state.showAccountSetup) {
    document.querySelector('#app').innerHTML = authenticationGate();
    document.querySelector('#connect-and-authenticate')
      ?.addEventListener('click', connectBrowserWallet);

    document.querySelector('#generate-setup-name')
      ?.addEventListener('click', async () => {
        try {
          const attempt = authGeneration;
          const button = document.querySelector('#generate-setup-name');
          button.disabled = true;
          document.querySelector('#lock-setup-name').disabled = true;
          const offer = await generateNameOffer(state.setupToken);
          if (attempt !== authGeneration) return;
          state.candidate = offer.network_name;
          state.nameOffer = offer.offer_token;
          renderConsole();
        } catch (error) {
          state.walletError =
            error?.message || 'Name generation failed.';
          await clearSession(state.walletError);
        }
      });

    document.querySelector('#lock-setup-name')
      ?.addEventListener('click', async () => {
        const button = document.querySelector('#lock-setup-name');
        button.disabled = true;
        button.textContent = 'Check your wallet…';

        document.querySelector('#generate-setup-name').disabled = true;
        const attempt = authGeneration;
        try {
          const result = await registerTesterAccount({
            provider: window.ethereum,
            wallet: state.wallet,
            setupToken: state.setupToken,
            offerToken: state.nameOffer,
            networkName: state.candidate,
          });

          if (attempt !== authGeneration) { await revokeSession(result.session.token); return; }
          state.session = result.session.token;
          state.identity = result.identity;
          state.sessionExpires = result.session.expires;
          state.needsRegistration = false;
          state.showAccountSetup = false;
          state.setupToken = null;
          state.nameOffer = null;
          scheduleSessionExpiry(result.session.expires);
          renderConsole();
        } catch (error) {
          if (attempt !== authGeneration) return;
          state.walletError =
            error?.code === 4001
              ? 'Permanent-name signature cancelled.'
              : error?.message || 'Account setup failed.';
          state.showAccountSetup = false;
          state.needsRegistration = false;
          renderConsole();
        }
      });
    return;
  }
  document.querySelector('#app').innerHTML = `
    <div class="console-shell">
      <aside class="console-sidebar">
        <div class="brand">
          ${logo()}
          <div>
            <div class="brand-name">NULLADIT</div>
            <div class="brand-tag">INVIOLABLE CONVERSATIONS</div>
          </div>
        </div>

        <nav>
          ${nav.map(([id, label]) => `
            <button data-tab="${id}"
              class="${state.tab === id ? 'active' : ''}" aria-current="${state.tab === id ? 'page' : 'false'}">
              <span>${escapeHTML(label)}</span>
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-foot">
          ${statusPill('Mining paused', 'warning')}
          <small>Experimental preview · decentralized network not live</small><button id="logout">Sign out</button>
        </div>
      </aside>

      <main class="console-main">
        <div class="top-strip">
          <span>${state.session ? 'Network session active' : 'Local wallet mode · network not authenticated'}</span>
          <strong>Do not use for sensitive communications yet</strong>
        </div>
        ${!state.session ? `<section class="content-page"><article class="card"><h3>Local wallet mode</h3><p>All tabs are available. Network actions require separate server authentication.</p><button id="connect-node" ${state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'Connecting…' : 'Connect to messaging node'}</button><p role="status">${escapeHTML(state.walletError)}</p></article></section>` : ''}
        ${view()}
      </main>
    </div>
  `;
  bind();
}
