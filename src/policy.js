import path from 'node:path';

// This is a command-input filter, not a process, network, or OS sandbox.
export function classify(args) {
  if (!args.length) return {allowed:false, reason:'empty command'};
  const [raw,...a] = args;
  const cmd=path.basename(raw);
  if (raw !== cmd) return {allowed:false,reason:'explicit executable path is not supported'};
  if (args.some(x => /[\n\r\0]/.test(x))) return {allowed:false,reason:'control character'};
  if (cmd==='git') {
    // Git options, aliases, hooks, config, external helpers and remote operations are not safely classified.
    const safe=['status','diff','log','show','branch','switch','add','commit','restore'];
    if (safe.includes(a[0]) && !a.some(x=>x.startsWith('--upload-pack') || x.startsWith('--exec') || x.startsWith('--config'))) return {allowed:true,reason:'local git operation'};
    return {allowed:false,reason:'git command not classified as local'};
  }
  const safe = new Set(['ls','pwd','cat','head','tail','wc','rg','grep','find','mkdir','touch','cp','mv','diff','printf']);
  // find can execute arbitrary commands. Other tools can also interact with special files; no OS isolation is implied.
  if (cmd==='find' && a.some(x=>['-exec','-execdir','-ok','-okdir','-delete','-fprint','-fprintf','-fls'].includes(x))) return {allowed:false,reason:'find action'};
  if (safe.has(cmd)) return {allowed:true,reason:'local command'};
  return {allowed:false,reason:'unknown or potentially external action'};
}
