import { chromium } from 'playwright';
import { Wallet, verifyMessage } from 'ethers';
import assert from 'node:assert/strict';

const kind = process.env.NULLADIT_TEST_WALLET || 'metamask';
assert.ok(['metamask', 'coinbase'].includes(kind));

async function runStartupFlow({ remembered }) {
  const wallet = Wallet.createRandom();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const localSignatures = [];
  let gatewayAttempts = 0;

  page.on('pageerror', error => errors.push(error.message));

  await page.exposeFunction('testSign', async (message, address) => {
    assert.equal(address.toLowerCase(), wallet.address.toLowerCase());
    localSignatures.push({ message, signature: await wallet.signMessage(message) });
    return localSignatures.at(-1).signature;
  });

  await page.addInitScript(({ address, selectedKind, rememberedChoice }) => {
    if (rememberedChoice) localStorage.setItem('nulladit.wallet-kind', selectedKind);
    const events = {};
    window.__walletCounters = { selected: 0, wrong: 0 };
    const selected = {
      isMetaMask: selectedKind === 'metamask',
      isCoinbaseWallet: selectedKind === 'coinbase',
      on: (name, fn) => { events[name] = fn; },
      request: async ({ method, params }) => {
        if (method === 'eth_chainId') return '0x144';
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          window.__walletCounters.selected++;
          return [address];
        }
        if (method === 'personal_sign') return window.testSign(...params);
        throw new Error('Unexpected selected wallet method: ' + method);
      }
    };
    const wrong = {
      isMetaMask: selectedKind === 'coinbase',
      isCoinbaseWallet: selectedKind === 'metamask',
      on: () => {},
      request: async () => { window.__walletCounters.wrong++; throw new Error('Wrong provider selected'); }
    };
    window.ethereum = { providers: [wrong, selected], request: wrong.request };
  }, { address: wallet.address, selectedKind: kind, rememberedChoice: remembered });

  await page.route('http://127.0.0.1:8765/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ service: 'NULLADIT', status: 'local', node: 'a'.repeat(64) })
  }));

  await page.route('https://node.nulladit.org/**', async route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:8765',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type'
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    gatewayAttempts++;
    await route.fulfill({
      status: 503,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'test gateway unavailable' })
    });
  });

  try {
    await page.goto('http://127.0.0.1:8765/?client=1');
    if (!remembered) {
      await page.getByText(/More than one wallet is available/).waitFor();
      await page.locator('#wallet-choice').selectOption(kind);
    }
    await page.locator('#connect-node').waitFor({ timeout: 10000 });
    await page.getByText(/Messaging sign-in incomplete:/).waitFor({ timeout: 10000 });

    assert.equal(localSignatures.length, 1, 'startup must request exactly one local wallet signature');
    assert.match(localSignatures[0].message, /Action: Unlock this browser console/);
    assert.match(localSignatures[0].message, /No transaction or payment is requested/);
    assert.equal(verifyMessage(localSignatures[0].message, localSignatures[0].signature).toLowerCase(), wallet.address.toLowerCase());
    const counters = await page.evaluate(() => window.__walletCounters);
    assert.equal(counters.selected >= 2, true, 'selected provider should supply account reads');
    assert.equal(counters.wrong, 0, 'injected competing wallet must not receive requests');
    assert.equal(gatewayAttempts > 0, true, 'network sign-in should request a challenge from the gateway');
    assert.deepEqual(errors, []);
    console.log(`PASS startup wallet flow: wallet=${kind}, remembered=${remembered}, local signature verified, gateway failure stayed fail-closed`);
  } catch (error) {
    console.error('UI state:', await page.locator('body').innerText());
    console.error('Errors:', errors);
    throw error;
  } finally {
    await browser.close();
  }
}

await runStartupFlow({ remembered: true });
await runStartupFlow({ remembered: false });
