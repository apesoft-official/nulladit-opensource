// Local-only wallet contact preferences. Never used as network authorization.
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TOKEN = '0x332a8e2CeE5398D52616fCABd87966010C5A7a82';
let feedback='', busy=false, balances=null, generation=0;
export function resetLocalTools(){ generation++; feedback=''; busy=false; balances=null; }
export function normalizeWallet(value){ if(typeof value!=='string'||!ADDRESS.test(value.trim()))throw Error('Enter a valid EVM wallet address');return value.trim().toLowerCase(); }
const storageKey=wallet=>'nulladit:local-whitelist:v1:324:'+normalizeWallet(wallet);
function read(wallet){
  const value=JSON.parse(localStorage.getItem(storageKey(wallet))||'[]');
  if(!Array.isArray(value)||value.length>500)throw Error('Invalid local whitelist');
  return [...new Set(value.map(normalizeWallet))].filter(x=>x!==normalizeWallet(wallet));
}
function write(wallet,list){localStorage.setItem(storageKey(wallet),JSON.stringify(list));}
export function whitelistView(state,esc){
  let list=[], error='';
  try{list=read(state.wallet);}catch(e){error=e.message;}
  return `<div class="content-page local-tools"><h2>Wallet whitelist</h2><article class="card">
  <p>Approve wallets locally without a messaging node. These preferences are saved in this browser for the connected wallet only. They are not network permissions and do not reveal whether another person has approved you.</p>
  <p class="wallet-address">${esc(state.wallet)}</p>
  <form id="wallet-whitelist-form"><input name="wallet" placeholder="0x… wallet address" aria-label="Wallet to whitelist" required maxlength="42"><button>Add wallet</button></form>
  <p role="status">${esc(error||feedback)}</p>
  ${list.map(address=>`<div class="contact-row"><strong class="wallet-address">${esc(address)}</strong><small>Added by you · reciprocal approval unknown</small><button class="secondary" data-remove-wallet="${esc(address)}">Remove</button></div>`).join('')}
  ${list.length?'<button id="clear-local-whitelist" class="secondary">Clear all local approvals</button>':'<p>No locally whitelisted wallets yet.</p>'}
  </article><article class="card"><h3>Mutual approval</h3><p>Automatic added-you-back status requires an authenticated shared contact service. Until that service is available, reciprocal approval stays unknown. Local additions never unlock messaging.</p></article></div>`;
}
export function formatAmount(value){const n=BigInt(value);if(n<0n)throw Error('Invalid balance');const base=10n**18n;return String(n/base)+'.'+String(n%base).padStart(18,'0').replace(/0+$/,'').padEnd(1,'0');}
export function walletReadsView(state,esc){
  return `<article class="card local-tools"><h3>Live ZKsync Era balances</h3><p>Read-only wallet RPC. No transaction or signature required.</p><p>ETH: <strong>${esc(balances?.eth??'Not checked')}</strong></p><p>NULL22: <strong>${esc(balances?.token??'Not checked')}</strong></p><button id="read-balances" ${busy?'disabled':''}>${busy?'Reading…':'Refresh balances'}</button><p role="status">${esc(feedback)}</p></article>`;
}
export function bindLocalTools(state,render){
  document.querySelector('#wallet-whitelist-form')?.addEventListener('submit',event=>{
    event.preventDefault();
    try{const wallet=normalizeWallet(state.wallet), address=normalizeWallet(new FormData(event.currentTarget).get('wallet'));if(wallet===address)throw Error('You cannot add your own wallet');const list=read(wallet);if(list.includes(address))throw Error('Wallet already added');if(list.length>=500)throw Error('Local whitelist limit reached');write(wallet,[...list,address]);feedback='Wallet added locally';}catch(e){feedback=e.message;}render();
  });
  document.querySelector('#clear-local-whitelist')?.addEventListener('click',()=>{
    if(!window.confirm('Delete all locally saved wallet approvals for this wallet on this browser?'))return;
    try{localStorage.removeItem(storageKey(state.wallet));feedback='Local approvals deleted';}catch(e){feedback=e.message;}render();
  });
  document.querySelectorAll('[data-remove-wallet]').forEach(button=>button.addEventListener('click',()=>{
    try{const wallet=normalizeWallet(state.wallet);write(wallet,read(wallet).filter(x=>x!==button.dataset.removeWallet));feedback='Local approval removed';}catch(e){feedback=e.message;}render();
  }));
  document.querySelector('#read-balances')?.addEventListener('click',async()=>{
    if(busy)return;const wallet=normalizeWallet(state.wallet), attempt=++generation, provider=window.ethereum;
    const active=()=>attempt===generation&&state.wallet?.toLowerCase()===wallet;
    busy=true;feedback='';balances=null;render();
    try{
      if(!provider?.request||Number.parseInt(await provider.request({method:'eth_chainId'}),16)!==324)throw Error('ZKsync Era wallet required');
      const accounts=await provider.request({method:'eth_accounts'});if(!accounts.some(x=>x.toLowerCase()===wallet))throw Error('Connected account changed');
      const [eth,token]=await Promise.allSettled([
        provider.request({method:'eth_getBalance',params:[wallet,'latest']}),
        provider.request({method:'eth_call',params:[{to:TOKEN,data:'0x70a08231'+wallet.slice(2).padStart(64,'0')},'latest']})
      ]);
      if(Number.parseInt(await provider.request({method:'eth_chainId'}),16)!==324)throw Error('Wallet network changed');
      const decode=(r,strict)=>r.status==='fulfilled'&&(strict?/^0x[0-9a-fA-F]{64}$/:/^0x[0-9a-fA-F]+$/).test(r.value)?formatAmount(r.value):'Unavailable';
      if(active()){balances={eth:decode(eth,false),token:decode(token,true)};feedback='Read from connected wallet RPC; unavailable values are not zero.';}
    }catch(e){if(active())feedback=e.message||'Balance lookup failed';}
    finally{if(active()){busy=false;render();}}
  });
}
