import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWallet, formatAmount, whitelistView } from '../src/local-tools.js';
const a='0x'+'a'.repeat(40), b='0x'+'b'.repeat(40);
test('wallet validation and normalization',()=>{assert.equal(normalizeWallet(a.toUpperCase().replace('0X','0x')),a);assert.throws(()=>normalizeWallet('not a wallet'));});
test('exact balances preserve 18 decimals',()=>{assert.equal(formatAmount('0x0'),'0.0');assert.equal(formatAmount(1n),'0.000000000000000001');assert.equal(formatAmount(1234567890123456789n),'1.234567890123456789');});
test('whitelist never claims reciprocal approval',()=>{globalThis.localStorage={getItem:key=>key.endsWith(a)?JSON.stringify([b,b,a]):null};const html=whitelistView({wallet:a},String);assert.match(html,/reciprocal approval unknown/);assert.equal(html.split('data-remove-wallet=').length,2);assert.match(whitelistView({wallet:b},String),/No locally whitelisted wallets/);});
