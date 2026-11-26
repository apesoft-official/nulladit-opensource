import { chromium } from 'playwright';
import { Wallet, verifyMessage } from 'ethers';
import assert from 'node:assert/strict';
const wallet=Wallet.createRandom();
const other=Wallet.createRandom();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const requests=[];
page.on('requestfailed',r=>console.error('Request failed',new URL(r.url()).pathname,r.failure()?.errorText));
page.on('console',m=>{if(m.type()==='error')console.error('Browser error:',m.text());});
let offers=0, signed=0, approved=false, sent=0;
const nonce='a'.repeat(64), token='b'.repeat(64), session='c'.repeat(64);
await page.exposeFunction('testSign',async(message,address)=>{
  assert.equal(address.toLowerCase(),wallet.address.toLowerCase());
  signed++; return wallet.signMessage(message);
});
await page.addInitScript(({address,other})=>{
  const events={}; let account=address, chain='0x1';
  window.ethereum={isMetaMask:true,on:(name,fn)=>{events[name]=fn;},request:async({method,params})=>{
    if(method==='eth_chainId')return chain;
    if(method==='wallet_switchEthereumChain'){chain=params[0].chainId;return null;}
    if(['eth_accounts','eth_requestAccounts'].includes(method))return [account];
    if(method==='personal_sign')return window.testSign(...params);
    if(method==='eth_getBalance')return '0xde0b6b3a7640000';
    if(method==='eth_call')return '0x'+(2n*10n**18n).toString(16).padStart(64,'0');
    throw Error('Unexpected wallet method '+method);
  }};
  window.testAccountChange=()=>{account=other;events.accountsChanged?.([other]);};
},{address:wallet.address,other:other.address});
await page.route('https://node.nulladit.org/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4173','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'content-type'}});return;}
  const body=req.method()==='POST'?req.postDataJSON():{};
  requests.push(path);
  const expires=Math.floor(Date.now()/1000)+120;
  let result;
  if(path==='/setup/challenge')result={nonce,expires,message:['NULLADIT Account Setup','Action: Authenticate wallet for account setup','Wallet: '+wallet.address,'Chain ID: 324','Nonce: '+nonce,'Expires: '+expires,'No transaction or payment is requested.'].join('\n')};
  else if(path==='/setup/authenticate'){assert.equal(verifyMessage(['NULLADIT Account Setup','Action: Authenticate wallet for account setup','Wallet: '+wallet.address,'Chain ID: 324','Nonce: '+nonce,'Expires: '+(globalThis.challengeExpires||expires),'No transaction or payment is requested.'].join('\n'),body.signature).toLowerCase(),wallet.address.toLowerCase());result={token,wallet:wallet.address,expires};}
  else if(path==='/setup/name'){offers++;result={offer_token:'d'.repeat(64),network_name:'Cedar Loon '+(4827+offers),expires_at:expires,locked:false};}
  else if(path==='/setup/register'){
    const id=body.network_name.toLowerCase().replaceAll(' ','-');
    const message=['NULLADIT Permanent Network Name','Wallet: '+wallet.address.toLowerCase(),'Account: '+id,'Name: '+body.network_name,'Offer: '+body.offer_token,'Chain ID: 324','This name is permanent and cannot be transferred, renamed, or reused.'].join('\n');
    assert.equal(verifyMessage(message,body.wallet_signature).toLowerCase(),wallet.address.toLowerCase());
    assert.ok(body.signed_registration.signature);
    result={registered:true,identity:id,network_name:body.network_name,wallet:wallet.address,fee_waived:true,session:{token:session,expires}};
  }else if(path==='/contacts'){assert.equal(body.session_token,session);assert.ok(body.signed.signature);approved=body.signed.payload.action==='approve';result={accepted:true};}
  else if(path==='/submit'){assert.equal(body.session_token,session);assert.ok(approved);assert.ok(body.signed.signature);assert.ok(!JSON.stringify(body).includes('private smoke message'));sent++;result={accepted:true};}
  else if(path==='/inbox'){assert.equal(body.session_token,session);assert.ok(body.signed.signature);result={messages:[]};}
  else if(path==='/health')result={service:'NULLADIT',status:'experimental-local-preview'};
  else if(path.endsWith('/logout'))result={revoked:true};
  else {await route.fulfill({status:404,body:'{}'});return;}
  if(path==='/setup/challenge')globalThis.challengeExpires=expires;
  await route.fulfill({json:result,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4173','Access-Control-Allow-Credentials':'true'}});
});
try{
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#connect-and-authenticate').click();
  await page.locator('[data-tab=contacts]').click();
  await page.getByLabel('Wallet to whitelist').fill(other.address);
  await page.getByRole('button',{name:'Add wallet'}).click();
  await page.getByText('Wallet added locally',{exact:true}).waitFor();
  await page.locator('[data-remove-wallet]').click();
  await page.getByText('Local approval removed',{exact:true}).waitFor();
  await page.getByLabel('Wallet to whitelist').fill(other.address);
  await page.getByRole('button',{name:'Add wallet'}).click();
  page.once('dialog',d=>d.accept());await page.locator('#clear-local-whitelist').click();
  await page.getByText('Local approvals deleted',{exact:true}).waitFor();
  for(const tab of ['my-node','active-nodes','wallet','updates','governance','settings','messages']){
    await page.locator('[data-tab='+tab+']').click();
    assert.equal(await page.locator('[data-tab='+tab+']').getAttribute('aria-current'),'page');
    if(tab==='wallet'){await page.locator('#read-balances').click();await page.getByText('Read from connected wallet RPC; unavailable values are not zero.').waitFor();}
  }
  await page.locator('#connect-node').click();
  await page.locator('#generate-setup-name').click();
  await page.getByRole('heading',{name:'Cedar Loon 4829'}).waitFor();
  await page.locator('#lock-setup-name').click();
  await page.locator('#show-key').click();
  await page.locator('.contact-panel p').filter({hasText:/^[A-Za-z0-9+/]{43}=$/}).waitFor();
  const key=await page.evaluate(async()=>{const k=await crypto.subtle.generateKey({name:'X25519'},true,['deriveBits']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('raw',k.publicKey))));});
  await page.getByLabel('Contact account').fill('test-recipient');
  await page.getByLabel('Verified public encryption key').fill(key);
  await page.getByLabel('I verified this key independently').check();
  assert.equal(await page.getByLabel('Contact account').inputValue(),'test-recipient');
  assert.equal(await page.getByLabel('Verified public encryption key').inputValue(),key);
  assert.equal(await page.getByLabel('I verified this key independently').isChecked(),true);
  await page.getByRole('button',{name:'Approve contact'}).click();
  await page.getByText('Approval accepted. Your contact must also approve you.').waitFor();
  await page.getByLabel('Message',{exact:true}).fill('private smoke message');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByText('Gateway accepted ciphertext',{exact:true}).waitFor();
  await page.locator('#refresh-inbox').click();
  await page.getByText('Inbox refreshed',{exact:true}).waitFor();
  await page.locator('#gateway-health').click();
  await page.getByText('Preview gateway reachable',{exact:true}).waitFor();
  await page.locator('#withdraw-contact').click();
  await page.getByText('Approval withdrawn',{exact:true}).waitFor();
  assert.equal(approved,false);assert.equal(sent,1);assert.equal(signed,2);
  await page.evaluate(()=>window.testAccountChange());
  await page.locator('#connect-and-authenticate').waitFor();
  assert.deepEqual(errors,[]);
  console.log('Browser wallet signatures, local whitelist, tabs, balances, setup, encrypted send, inbox, health, withdrawal and account invalidation passed');
}catch(error){console.error('UI state:',await page.locator('body').innerText());console.error('Requests:',requests);console.error('Page errors:',errors);throw error;}finally{await browser.close();}
