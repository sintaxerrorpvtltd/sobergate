#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import readline from 'node:readline';
import {classify} from '../src/policy.js';
import {state,writeState,journal,enqueue,pending,discard} from '../src/store.js';

function run(args, confirmed=false){
 const s=state(), decision=classify(args);
 if(s.mode!=='CLEAR'&&!decision.allowed){
  if(s.mode==='GUARD'&&confirmed) return execute(args);
  const item=enqueue(args,decision.reason);
  console.error(`SoberGate ${s.mode}: denied ${item.program} (${decision.reason}). Review ID ${item.id}.`);
  return 77;
 }
 return execute(args);
}
function execute(args){if(!args.length)throw Error('Provide a command after --');const result=spawnSync(args[0],args.slice(1),{stdio:'inherit',shell:false});if(result.error){console.error(result.error.message);return 127}return result.status??1}
function parse(line){
 // No shell evaluation, expansion, redirection, pipelines, or command substitution.
 if (/[;&|<>`$\\\n\r]/.test(line)) throw Error('Shell syntax is not supported; use one direct command.');
 const tokens=line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)||[];
 if(tokens.join('').replace(/[^"']/g,'').length%2)throw Error('Unbalanced quotes');
 return tokens.map(t=>t.replace(/"([^"]*)"|'([^']*)'/g,(_,a,b)=>a??b));
}
async function main(){
 const [action='status',...a]=process.argv.slice(2);const s=state();
 if(action==='status'){console.log(`SoberGate: ${s.mode}`+(s.until?` until ${new Date(s.until).toLocaleString()}`:''));return}
 if(action==='lock') {const v=a[0]==='--for'?a[1]:a[0];const m=/^(\d+)(m|h|d)$/.exec(v||'');if(!m||+m[1]===0)throw Error('Use sg lock 10h (units: m, h, d).'); const until=Date.now()+Number(m[1])*({m:60000,h:3600000,d:86400000}[m[2]]);if(!Number.isSafeInteger(until)||until>Date.now()+365*86400000)throw Error('Maximum lock is 365 days.');if(s.mode==='LOCKED'&&until<s.until)throw Error('An active lock cannot be shortened.');writeState({mode:'LOCKED',until});journal('lock_started',{until});console.log(`LOCKED until ${new Date(until).toLocaleString()}`);return}
 if(action==='guard'||action==='clear'){if(s.mode==='LOCKED')throw Error('Lock is active; wait for expiration.');writeState({mode:action.toUpperCase()});journal('mode_changed',{mode:action.toUpperCase()});console.log(action.toUpperCase());return}
 if(action==='review'){let items=pending();if(!items.length)console.log('No pending actions.');else for(const i of items)console.log(`${i.id} | ${i.at} | ${i.program} | ${i.reason} | ${i.status}`);console.log('Arguments are not retained. No queued action runs automatically.');return}
 if(action==='discard'){if(s.mode==='LOCKED')throw Error('Review after lock expires.');discard(a[0]||'');console.log('Discarded.');return}
 if(action==='exec'){let x=a;if(x[0]==='--')x=x.slice(1);process.exitCode=run(x);return}
 if(action==='shell'){console.log('SoberGate command prompt: one direct command per line; type exit. Not an OS sandbox.');const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:process.stdin.isTTY});if(process.stdin.isTTY)rl.setPrompt('sg> '),rl.prompt();for await(const line of rl){if(line.trim()==='exit')break;try {const args=parse(line);if(args.length)run(args)}catch(e){console.error(e.message)}if(process.stdin.isTTY)rl.prompt()}return}
 if(action==='help'||action==='--help'){console.log('sg status | lock 10h | guard | clear | exec -- COMMAND [ARGS...] | shell | review | discard ID');return}
 throw Error('Unknown command; run sg help.');
}
main().catch(e=>{console.error(`SoberGate: ${e.message}`);process.exitCode=1});
