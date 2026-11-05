const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../legacy/qbank-core.js');
const quiz = {title:'Sample',questions:[
  {id:1,subject:'Medicine',system:'Cardiac',question:'Output?',options:{a:'4.9',b:'49'},correct_answer:'a'},
  {id:2,subject:'Medicine',system:'Respiratory',question:'Gas exchange?',options:{a:'Trachea',b:'Alveoli'},correct_answer:'b'},
  {id:3,question:'Legacy?',options:{a:'Yes',b:'No'},correct_answer:'a'}
]};
const banks = [{key:'testit_quiz_sample',data:{quiz,answers:{2:'a'},flags:[3]}}];
const config = {banks:[banks[0].key],subjects:[],systems:[],pool:'all',count:2,mode:'tutor',timed:false,minutes:3};
test('filters retain legacy questions and scope subject/system intersections',()=>{
  assert.equal(C.eligible(banks,{},config).length,3);
  assert.equal(C.eligible(banks,{}, {...config,subjects:['Medicine'],systems:['Cardiac']}).length,1);
  assert.equal(C.eligible(banks,{}, {...config,subjects:['Uncategorized']}).length,1);
  assert.deepEqual(C.eligible(banks,{}, {...config,pool:'incorrect'}).map(i=>i.question.id),[2]);
  assert.deepEqual(C.eligible(banks,{}, {...config,pool:'flagged'}).map(i=>i.question.id),[3]);
  assert.equal(C.eligible(banks,{}, {...config,pool:'unused'}).length,2);
});
test('snapshots preserve source, stable option keys, separate same IDs in different banks',()=>{
  const copy=C.clone(banks),items=C.eligible(banks,{},config),a=C.create(items,config,100);
  assert.equal(a.items.length,2);C.validateAttempt(a);
  assert.deepEqual(banks,copy);
  const saved=C.clone(a);assert.deepEqual(saved.items,a.items);
  assert.notEqual(C.identity('one',1),C.identity('two',1));
  assert.throws(()=>C.create(items,{...config,count:4}));
  assert.throws(()=>C.create(items,{...config,count:1.5}));
  assert.equal(C.create(items,{...config,timed:false,minutes:0}).durationMs,0);
});
test('only finalized answers change pools, newest finalized response wins',()=>{
  const a=C.create(C.eligible(banks,{},config),{...config,count:3},100),item=a.items.find(i=>i.question.id===1);
  a.answers[item.key]='b';a.savedAt=200;
  assert.equal(C.eligible(banks,{[a.id]:a},{...config,pool:'incorrect'}).length,1);
  a.submitted.push(item.key);
  assert.equal(C.eligible(banks,{[a.id]:a},{...config,pool:'incorrect'}).length,2);
  const b=C.clone(a);b.id='later';b.answers[item.key]='a';b.savedAt=300;
  assert.equal(C.eligible(banks,{[a.id]:a,later:b},{...config,pool:'incorrect'}).length,1);
});
test('timestamp timing survives delayed ticks, suspend pauses, expiry completes once',()=>{
  const a=C.create(C.eligible(banks,{},config),{...config,timed:true,minutes:1},1000);
  C.tick(a,11000);assert.equal(a.elapsedMs,10000);
  a.status='suspended';a.runningSince=null;C.tick(a,51000);assert.equal(a.elapsedMs,10000);
  a.status='active';a.runningSince=51000;assert.equal(C.tick(a,102000),true);
  assert.equal(a.status,'completed');assert.equal(a.elapsedMs,61000);
  C.tick(a,200000);assert.equal(a.elapsedMs,61000);
});
test('results include omissions, merge unions attempts and preserves divergent revisions',()=>{
  const a=C.create(C.eligible(banks,{},config),{...config,count:3},100);
  a.answers[a.items[0].key]=a.items[0].question.correct_answer;C.complete(a,200);
  assert.deepEqual(C.score(a),{correct:1,answered:1,incorrect:0,omitted:2,total:3,percent:33});
  const b=C.clone(a);b.revision='branch';b.savedAt=300;
  const merged=C.merge({version:1,attempts:{[a.id]:a}},{version:1,attempts:{[b.id]:b}});
  assert.equal(Object.keys(merged.attempts).length,2);
  assert.equal(Object.keys(C.merge(merged,{version:1,attempts:{[b.id]:b}}).attempts).length,2);
  const next=C.clone(b);next.parentRevision=b.revision;next.revision='next';next.savedAt=400;
  assert.equal(Object.keys(C.merge({version:1,attempts:{[b.id]:b}},{version:1,attempts:{[next.id]:next}}).attempts).length,1);
});
test('malformed future schemas and duplicate presentation entries are rejected',()=>{
  assert.throws(()=>C.validateStore({version:2,attempts:{}}));
  const a=C.create(C.eligible(banks,{},config),config,100);
  a.items[0].order=['a','a'];assert.throws(()=>C.validateAttempt(a));
});
