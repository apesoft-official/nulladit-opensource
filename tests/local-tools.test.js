import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWallet, formatAmount, whitelistView } from '../src/local-tools.js';
const a='0x'+'a'.repeat(40), b='0x'+'b'.repeat(40);
test('wallet validation and normalization',()=>{assert.equal(normalizeWallet(a.toUpperCase().replace('0X','0x')),a);assert.throws(()=>normalizeWallet('not a wallet'));});
test('exact balances preserve 18 decimals',()=>{assert.equal(formatAmount('0x0'),'0.0');assert.equal(formatAmount(1n),'0.000000000000000001');assert.equal(formatAmount(1234567890123456789n),'1.234567890123456789');});
test('whitelist never claims reciprocal approval',()=>{globalThis.localStorage={getItem:key=>key.endsWith(a)?JSON.stringify([b,b,a]):null};const html=whitelistView({wallet:a},String);assert.match(html,/reciprocal approval unknown/);assert.equal(html.split('data-remove-wallet=').length,2);assert.match(whitelistView({wallet:b},String),/No locally whitelisted wallets/);});

import { publicApproval, approvalStatus, WHITELIST } from '../src/local-tools.js';
test('public approval requests exact contract and zero value',async()=>{
 const calls=[];const p={request:async x=>{calls.push(x);return x.method==='eth_chainId'?'0x144':x.method==='eth_accounts'?[a]:'0x'+'1'.repeat(64);}};
 await publicApproval(p,a,b,true);
 const tx=calls.at(-1).params[0];assert.equal(calls.at(-1).method,'eth_sendTransaction');assert.equal(tx.to,WHITELIST);assert.equal(tx.from,a);assert.equal(tx.value,'0x0');assert.equal(tx.data.length,138);assert.equal(tx.data.slice(10,74),b.slice(2).padStart(64,'0'));assert.equal(tx.data.slice(74),'1'.padStart(64,'0'));
 await publicApproval(p,a,b,false);assert.equal(calls.at(-1).params[0].data.slice(74),'0'.repeat(64));
});
test('wrong chain or account never sends transaction',async()=>{
 for(const [chain,account] of [['0x1',a],['0x144',b]]){
 const p={request:async x=>{if(x.method==='eth_chainId')return chain;if(x.method==='eth_accounts')return [account];assert.fail('unexpected transaction');}};
 await assert.rejects(publicApproval(p,a,b,true));
 }
});
test('invalid targets never request wallet',async()=>{
 const p={request:async()=>assert.fail('unexpected wallet request')};
 for(const target of [a,'0x'+'0'.repeat(40),'bad'])await assert.rejects(publicApproval(p,a,target,true));
});
test('approval reads distinguish unilateral and mutual status',async()=>{
 let reads=0;const p={request:async x=>{if(x.method==='eth_chainId')return '0x144';assert.equal(x.method,'eth_call');assert.equal(x.params[0].to,WHITELIST);return '0x'+String(reads++===0?1:0).padStart(64,'0');}};
 assert.deepEqual(await approvalStatus(p,a,b),{approved:true,mutual:false});
});
test('wallet rejection propagates without success',async()=>{
 const p={request:async x=>{if(x.method==='eth_chainId')return '0x144';if(x.method==='eth_accounts')return [a];throw Error('User rejected');}};
 await assert.rejects(publicApproval(p,a,b,true),/User rejected/);
});
