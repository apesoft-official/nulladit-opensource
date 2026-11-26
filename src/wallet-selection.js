const announced = new Map();
window.addEventListener('eip6963:announceProvider',event=>{
  const d=event.detail;
  if(d?.provider?.request && typeof d.info?.rdns==='string') announced.set(d.provider,d.info.rdns);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
export function selectProvider(kind, injected=window.ethereum, entries=announced){
  const matches=new Set();
  const rdns=kind==='metamask'?'io.metamask':'com.coinbase.wallet';
  for(const [p,id] of entries)if(id===rdns)matches.add(p);
  if(!matches.size){
    for(const p of (Array.isArray(injected?.providers)?injected.providers:[injected])){
      if(!p?.request)continue;
      if(kind==='metamask'&&p.isMetaMask&&!p.isCoinbaseWallet)matches.add(p);
      if(kind==='coinbase'&&p.isCoinbaseWallet)matches.add(p);
    }
  }
  if(matches.size!==1)throw Error(matches.size?'Multiple matching wallets detected. Disable duplicates and retry.':'Selected wallet extension not detected. Install or enable it in Chrome, then reload.');
  return [...matches][0];
}
