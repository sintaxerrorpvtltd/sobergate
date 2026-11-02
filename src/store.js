import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
export const home=()=>process.env.SOBERGATE_HOME || path.join(os.homedir(),'.sobergate');
function dir(){fs.mkdirSync(home(),{recursive:true,mode:0o700}); return home()}
const statePath=()=>path.join(dir(),'state.json');
export function state(){
 try {const s=JSON.parse(fs.readFileSync(statePath(),'utf8')); if(!['CLEAR','GUARD','LOCKED'].includes(s.mode) || (s.mode==='LOCKED' && (!Number.isFinite(s.until)||s.until<=0))) throw Error('bad state'); if(s.mode==='LOCKED' && Date.now()>=s.until) {const next={mode:'CLEAR'}; writeState(next); journal('lock_expired'); return next;} return s;}
 catch(e){if(e.code==='ENOENT')return {mode:'CLEAR'}; throw new Error('State unreadable or invalid; refusing to continue.');}
}
export function writeState(s){const p=statePath(), t=p+'.'+crypto.randomUUID()+'.tmp'; fs.writeFileSync(t,JSON.stringify(s)+'\n',{mode:0o600,flag:'wx'}); fs.renameSync(t,p)}
export function journal(type, data={}){fs.appendFileSync(path.join(dir(),'journal.jsonl'),JSON.stringify({at:new Date().toISOString(),type,...data})+'\n',{mode:0o600})}
export function enqueue(args,reason){const id=crypto.randomUUID(); const item={id,at:new Date().toISOString(),program:path.basename(args[0]||'unknown'),reason,status:'pending'}; const p=path.join(dir(),'pending');fs.mkdirSync(p,{recursive:true,mode:0o700});fs.writeFileSync(path.join(p,id+'.json'),JSON.stringify(item,null,2)+'\n',{mode:0o600,flag:'wx'});journal('blocked',{id,program:item.program,reason});return item}
export function pending(){const p=path.join(dir(),'pending');if(!fs.existsSync(p))return [];return fs.readdirSync(p).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(p,f),'utf8')))}
export function discard(id){if(!/^[0-9a-f-]{36}$/.test(id)) throw Error('Invalid action id'); const p=path.join(dir(),'pending',id+'.json');fs.unlinkSync(p);journal('discarded',{id})}
