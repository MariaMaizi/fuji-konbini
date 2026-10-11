'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'server')).filter(x=>x.endsWith('.test.cjs')).map(x=>'server/'+x);
tests.push('web/tests/clerk-engine.test.cjs','web/tests/catalog-v23.test.cjs');
// All provider calls in these tests use injected mock responses.
const result=spawnSync(process.execPath,['--test',...tests],{cwd:root,stdio:'inherit'});
process.exit(result.status??1);
