import { NulladitClient } from './api.js';
import { loadIdentity } from './key-storage.js';
import { exportPublicKeys } from './crypto.js';
import { nodeBase } from './session-auth.js';

let contacts = new Map(), history = [], selected = '', feedback = '', busy = false, publicKey = '', health = 'Not checked', balance = '';
export function resetMessenger() {
  contacts.clear(); history = []; selected = ''; feedback = ''; busy = false; publicKey = ''; health = 'Not checked'; balance = '';
}
export function messengerView(state, esc) {
  const disabled = busy ? 'disabled' : '';
  return `<div class="message-layout">
    <aside class="contact-panel" style="overflow:auto">
      <h2>Messages</h2>
      <p>Your account: <strong>${esc(state.identity)}</strong></p>
      <button id="show-key" ${disabled}>Show my public encryption key</button>
      ${publicKey ? `<p style="overflow-wrap:anywhere">${esc(publicKey)}</p>` : ''}
      <p>Exchange account IDs and encryption keys through an independently trusted channel. Both users must approve each other.</p>
      <form id="contact-form" class="contact-form">
        <input name="identity" aria-label="Contact account" placeholder="Permanent account ID" required maxlength="32">
        <input name="key" aria-label="Verified public encryption key" placeholder="Public encryption key" required maxlength="44">
        <label><input type="checkbox" name="verified" required> I verified this key independently</label>
        <button ${disabled}>Approve contact</button>
      </form>
      ${[...contacts.keys()].map(id=>`<button class="contact" data-contact="${esc(id)}" ${disabled}>${esc(id)}</button>`).join('')}
      <button id="refresh-inbox" ${disabled}>Refresh inbox</button>
      <button id="gateway-health" ${disabled}>Check gateway</button>
      <p role="status">${esc(feedback)}</p>
    </aside>
    <section class="chat-panel">
      <header class="chat-head"><h2>${esc(selected || 'Select a contact')}</h2><p>${esc(health)}</p>
      ${selected ? `<button id="withdraw-contact" ${disabled}>Withdraw approval</button>` : ''}</header>
      <div class="chat-body">
        ${history.filter(m=>m.peer===selected).map(m=>`<div class="message ${m.mine?'mine':''}"><div class="bubble">${esc(m.text)}</div><div class="receipt">${m.mine?'Gateway accepted ciphertext; delivery not verified':'Decrypted from preview gateway; sender authentication relies on gateway'}</div></div>`).join('')}
        ${!selected ? '<p>Approve a contact to begin.</p>' : ''}
      </div>
      <form class="composer" id="composer"><input name="message" aria-label="Message" maxlength="2000" placeholder="Experimental encrypted message" ${!selected||busy?'disabled':''} required><button ${!selected||busy?'disabled':''}>Send</button></form>
    </section></div>`;
}
export function bindMessenger(state, render) {
  const on=(id,event,fn)=>document.querySelector(id)?.addEventListener(event,fn);
  const task=async work=>{
    if(busy||!state.session)return;
    const token=state.session, identity=state.identity;
    const active=()=>state.session===token && state.sessionExpires*1000>Date.now();
    busy=true;feedback='';render();
    try {
      const record=await loadIdentity(identity);
      if(!active()||!record?.keys)throw new Error('Session or local device keys unavailable');
      const api=new NulladitClient(nodeBase().origin,identity,record.keys,token);
      await work(api,active);
    } catch(e){if(active())feedback=e.message||'Request failed';}
    finally{if(active()){busy=false;render();}}
  };
  on('#show-key','click',()=>task(async(api,active)=>{
    const keys=await exportPublicKeys(api.keys);if(active())publicKey=keys.encryption_public;
  }));
  on('#contact-form','submit',event=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const id=String(data.get('identity')).trim().toLowerCase().replaceAll(' ','-'),key=String(data.get('key')).trim();
    task(async(api,active)=>{
      if(!/^[a-z0-9_-]{3,32}$/.test(id)||id===api.identity||!data.get('verified')||! /^[A-Za-z0-9+/]{43}=$/.test(key)||atob(key).length!==32)throw new Error('Valid independently verified contact key required');
      if(contacts.has(id)&&contacts.get(id)!==key)throw new Error('Withdraw approval before replacing a trusted key');
      const result=await api.setContact(id);
      if(result.accepted!==true)throw new Error('Approval not confirmed');
      if(active()){contacts.set(id,key);selected=id;feedback='Approval accepted. Your contact must also approve you.';}
    });
  });
  document.querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>{if(!busy){selected=b.dataset.contact;render();}}));
  on('#withdraw-contact','click',()=>{const id=selected;task(async(api,active)=>{
    const result=await api.setContact(id,false);
    if(result.accepted!==true)throw new Error('Withdrawal not confirmed');
    if(active()){contacts.delete(id);history=history.filter(m=>m.peer!==id);selected='';feedback='Approval withdrawn';}
  });});
  on('#composer','submit',event=>{
    event.preventDefault();const message=String(new FormData(event.currentTarget).get('message')),id=selected,key=contacts.get(id);
    task(async(api,active)=>{
      if(!key||!message.trim()||message.length>2000)throw new Error('Valid message and approved contact required');
      const result=await api.send(id,key,message);
      if(result.accepted!==true)throw new Error('Gateway acceptance not confirmed');
      if(active()){history.push({peer:id,mine:true,text:message});feedback='Gateway accepted ciphertext';}
    });
  });
  on('#refresh-inbox','click',()=>task(async(api,active)=>{
    const result=await api.inbox();if(!Array.isArray(result.messages))throw new Error('Invalid inbox response');
    const incoming=[];
    for(const envelope of result.messages){
      if(!active())return;
      if(!contacts.has(envelope.sender))continue;
      incoming.push({peer:envelope.sender,mine:false,text:await api.decrypt(envelope)});
    }
    if(active()){history=[...history.filter(m=>m.mine),...incoming];feedback='Inbox refreshed';}
  }));
  on('#gateway-health','click',()=>task(async(api,active)=>{
    const response=await fetch(new URL('/health',nodeBase()),{cache:'no-store',redirect:'error',credentials:'include',signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok||data.service!=='NULLADIT'||data.status!=='experimental-local-preview')throw new Error('Preview gateway not confirmed');
    if(active())health='Preview gateway reachable';
  }));
}
