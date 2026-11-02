import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../bin/sg.js',import.meta.url));
test('isolated lock, deny, journal, expiration and queue',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'sobergate-test-'));const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'sobergate-work-'));
 const env={PATH:process.env.PATH,HOME:home,SOBERGATE_HOME:path.join(home,'state'),LANG:'C'};
 const sg=(...args)=>spawnSync(process.execPath,[cli,...args],{cwd,env,encoding:'utf8'});
 try{
  assert.equal(sg('lock','10h').status,0);assert.match(sg('status').stdout,/LOCKED/);
  assert.equal(sg('exec','--','mkdir','local').status,0);assert.ok(fs.existsSync(path.join(cwd,'local')));
  for(const command of [['git','push'],['git','-c','alias.x=push','x'],['/usr/bin/git','push'],['railway','up'],['vercel','--prod'],['npx','convex','deploy'],['gh','release','create'],['npm','publish'],['sh','-c','git push'],['python3','deploy.py'],['curl','-X','POST','https://example.invalid'],['find','.','-exec','git','push',';']]) assert.equal(sg('exec','--',...command).status,77,command.join(' '));
  assert.equal(sg('clear').status,1);assert.equal(sg('lock','1m').status,1);
  let review=sg('review').stdout;assert.match(review,/railway/);assert.doesNotMatch(review,/example.invalid|deploy.py/);
  const p=path.join(env.SOBERGATE_HOME,'state.json');fs.writeFileSync(p,JSON.stringify({mode:'LOCKED',until:Date.now()-1}));assert.match(sg('status').stdout,/CLEAR/);assert.equal(sg('review').stdout,review);
  assert.match(fs.readFileSync(path.join(env.SOBERGATE_HOME,'journal.jsonl'),'utf8'),/lock_expired/);
 } finally {fs.rmSync(home,{recursive:true,force:true});fs.rmSync(cwd,{recursive:true,force:true})}
});
test('protected prompt rejects compound commands and does not execute them',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'sobergate-shell-'));try{const r=spawnSync(process.execPath,[cli,'shell'],{cwd:home,env:{PATH:process.env.PATH,HOME:home},input:'mkdir ok\nmkdir nope; touch injected\nexit\n',encoding:'utf8'});assert.equal(r.status,0);assert.ok(fs.existsSync(path.join(home,'ok')));assert.ok(!fs.existsSync(path.join(home,'injected')));assert.match(r.stderr,/syntax/)}finally{fs.rmSync(home,{recursive:true,force:true})}
});
test('corrupt state fails closed',()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'sobergate-corrupt-'));try{fs.writeFileSync(path.join(home,'state.json'),'broken');const r=spawnSync(process.execPath,[cli,'exec','--','pwd'],{env:{PATH:process.env.PATH,SOBERGATE_HOME:home},encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/refusing/)}finally{fs.rmSync(home,{recursive:true,force:true})}});
