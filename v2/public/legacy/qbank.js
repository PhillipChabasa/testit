/* TESTIT Phase 1: local-first tests, integrated with the existing backup/sync envelope. */
(function () {
  'use strict';
  const C = QBankCore, KEY = 'testit_qbank_v1';
  const $ = id => document.getElementById(id);
  const esc = value => safeText(value);
  const empty = () => ({version: 1, attempts: {}});
  let data = empty(), current = null, dirty = false, blocked = false, lastRaw = null;
  let config = {banks: [], subjects: [], systems: [], pool: 'all', count: 10, mode: 'tutor', timed: false, minutes: 15, name: ''};
  let initialized = false, reviewFilter = 'all', message = '';

  function read() {
    const raw = localStorage.getItem(KEY);
    const value = raw ? C.validateStore(JSON.parse(raw)) : empty();
    lastRaw = raw;
    return value;
  }
  try { data = read(); } catch (error) { blocked = true; message = 'Saved test data could not be read. It has been preserved. Export a backup before attempting recovery.'; }
  function banks() { return getAllSavedSlots().filter(({data: d}) => !d.qbankAttempt); }
  function a() { return current ? data.attempts[current] : null; }
  function revision(attempt) { attempt.parentRevision = attempt.revision; attempt.revision = C.uid(); attempt.savedAt = Date.now(); }
  function persist() {
    if (blocked) return false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw !== lastRaw && raw) data = C.merge(data, C.validateStore(JSON.parse(raw)));
      const serialized = JSON.stringify(data);
      localStorage.setItem(KEY, serialized);
      lastRaw = serialized; dirty = false; message = '';
      backupManager.touchLocalModified();
      syncManager.scheduleSync();
      updateSaveStatus();
      return true;
    } catch (error) {
      dirty = true;
      message = 'Changes are only in memory. Storage is full or unavailable. Existing quizzes were not deleted. Export a backup now.';
      updateSaveStatus();
      return false;
    }
  }
  function save() { const attempt = a(); if (attempt) revision(attempt); dirty = true; return persist(); }
  function updateSaveStatus() {
    const alert = document.querySelector('.view.active .qb-save-alert');
    if (alert) { alert.hidden = !message; alert.innerHTML = message ? `${esc(message)} <button class="qb-button" data-action="export">Export backup</button> <button class="qb-button" data-action="retry">Retry save</button>` : ''; }
    if ($('qb-save-state')) $('qb-save-state').textContent = dirty ? 'Not saved' : 'Saved on this device';
  }
  function flush() {
    const attempt = a();
    if (attempt?.status === 'active') { C.tick(attempt); return save(); }
    return dirty ? persist() : !blocked;
  }
  function beforeLeave() {
    const attempt = a();
    if (attempt?.status === 'active') { C.tick(attempt); if (attempt.status === 'active') attempt.status = 'suspended'; attempt.runningSince = null; save(); }
    return true;
  }
  function reload() {
    if (dirty) return;
    try { data = read(); blocked = false; message = ''; if (current && !a()) current = null; renderVisible(); }
    catch { blocked = true; message = 'Incoming test data could not be read. Your existing data has been preserved.'; updateSaveStatus(); }
  }
  function latestFor(slot, question) {
    const key = C.identity(slot, question.id), attempt = C.latest(data.attempts, key);
    if (!attempt) return null;
    return {answered: Object.hasOwn(attempt.answers, key), wrong: Object.hasOwn(attempt.answers, key) && attempt.answers[key] !== question.correct_answer, flagged: attempt.flags.includes(key)};
  }
  function checkboxList(values, selected, kind) {
    return values.map(({value, label, count}) => `<label class="qb-check"><input type="checkbox" data-config="${kind}" value="${esc(value)}" ${selected.includes(value) ? 'checked' : ''}><span>${esc(label)}</span>${count === undefined ? '' : `<small>${count}</small>`}</label>`).join('');
  }
  function metadata(kind) {
    const counts = new Map();
    for (const b of banks().filter(b => config.banks.includes(b.key))) for (const q of b.data.quiz.questions) {
      for (const value of new Set(C.list(q[kind] ?? b.data.quiz[kind]))) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts].sort(([x], [y]) => x.localeCompare(y)).map(([value, count]) => ({value, label: value, count}));
  }
  function pool() { return C.eligible(banks(), data.attempts, config); }
  function renderCreate() {
    const savedBanks = banks();
    config.banks = config.banks.filter(key => savedBanks.some(b => b.key === key));
    if (!initialized) { config.banks = savedBanks.map(b => b.key); initialized = true; }
    const subjects = metadata('subject'), systems = metadata('system');
    config.subjects = config.subjects.filter(s => subjects.some(x => x.value === s));
    config.systems = config.systems.filter(s => systems.some(x => x.value === s));
    $('view-qbank').innerHTML = `<div class="qb-shell">
      <header class="qb-heading"><div><span class="qb-eyebrow">TESTIT · Question bank</span><h1>Create a test</h1><p class="qb-muted">Build a focused session from your saved questions. Your original banks stay intact.</p></div><div class="qb-actions"><button class="qb-button" data-action="sample">Add sample bank</button><button class="qb-button" data-action="import">Import JSON</button></div></header>
      <div class="qb-save-alert" role="alert" hidden></div>
      <form id="qb-create-form"><div class="qb-layout"><div>
        <section class="qb-card"><fieldset><legend>1. Question banks</legend><div class="qb-actions"><button class="qb-button" type="button" data-action="all-banks">Select all</button><button class="qb-button" type="button" data-action="no-banks">Clear</button></div><p class="qb-muted">Select one or more banks. Questions with the same ID in different banks remain separate.</p><div class="qb-checks">${checkboxList(savedBanks.map(b => ({value: b.key, label: b.data.quiz.title || 'Untitled bank', count: b.data.quiz.questions.length})), config.banks, 'banks')}</div>${savedBanks.length ? '' : '<p class="qb-muted">No saved banks yet. Import a JSON quiz or add the sample bank.</p>'}</fieldset></section>
        <section class="qb-card"><fieldset><legend>2. Subjects &amp; systems</legend><p class="qb-muted">No checks means all. Older quizzes without subject/system metadata appear under Uncategorized.</p><h2>Subjects</h2><div class="qb-checks">${checkboxList(subjects, config.subjects, 'subjects')}</div><h2 style="margin-top:24px">Systems</h2><div class="qb-checks">${checkboxList(systems, config.systems, 'systems')}</div></fieldset></section>
        <section class="qb-card"><fieldset><legend>3. Question pool</legend><div class="qb-options">${[['all','All'],['unused','Unused'],['incorrect','Incorrect'],['flagged','Flagged']].map(([v, label]) => `<label class="qb-check"><input type="radio" name="pool" data-config="pool" value="${v}" ${config.pool === v ? 'checked' : ''}>${label}</label>`).join('')}</div><p class="qb-muted">Unused means never submitted or included in a completed test. Incorrect uses the latest submitted response; flags include saved practice and tests.</p></fieldset></section>
        <section class="qb-card"><fieldset><legend>4. Test mode</legend><div class="qb-options">${[['tutor','Tutor'],['exam','Exam']].map(([v, label]) => `<label class="qb-check"><input type="radio" name="mode" data-config="mode" value="${v}" ${config.mode === v ? 'checked' : ''}>${label}</label>`).join('')}</div><p class="qb-muted">Tutor reveals explanations after you submit each answer. Exam keeps all results hidden until you end the test.</p><label class="qb-check"><input type="checkbox" data-config="timed" ${config.timed ? 'checked' : ''}>Timed test</label><p class="qb-muted">The clock runs while the test is active, including explanation time. Suspend pauses it. Leaving this view suspends automatically.</p><label class="qb-field">Duration in minutes<input type="number" min="1" max="1440" step="1" data-config="minutes" value="${config.minutes}" ${config.timed ? '' : 'disabled'}></label></fieldset></section>
      </div><aside class="qb-card qb-summary"><h2>Your session</h2><div class="qb-count" id="qb-available">0</div><p class="qb-muted">eligible questions</p><label class="qb-field">Number of questions<input id="qb-count" type="number" min="1" step="1" data-config="count" value="${config.count}" required></label><label class="qb-field">Test name (optional)<input type="text" maxlength="100" data-config="name" value="${esc(config.name)}" placeholder="e.g. Monday review"></label><p id="qb-form-error" class="qb-error" aria-live="polite"></p><button class="qb-button primary" id="qb-start" type="submit">Start test</button><p class="qb-muted">A new attempt is saved separately. Question and option order stay fixed when you resume.</p></aside></div></form>
      <section class="qb-card"><h2>Previous tests</h2><div id="qb-history" class="qb-history"></div></section></div>`;
    // All controls outside the form have their natural button type. Internal action buttons explicitly use type=button.
    renderAvailability(); renderHistory(); updateSaveStatus();
  }
  function renderAvailability() {
    if (!$('qb-available')) return;
    const count = pool().length;
    $('qb-available').textContent = count;
    $('qb-count').max = count;
    const invalid = blocked || !count || !Number.isInteger(config.count) || config.count < 1 || config.count > count || (config.timed && (!Number.isInteger(config.minutes) || config.minutes < 1 || config.minutes > 1440));
    $('qb-start').disabled = !!invalid;
    $('qb-form-error').textContent = blocked ? 'Resolve the saved-data issue before starting.' : !count ? 'No questions match. Select banks or adjust your filters.' : config.count > count ? `Choose between 1 and ${count} questions.` : invalid ? 'Enter a positive whole count and a duration from 1 to 1440 minutes.' : '';
  }
  function renderHistory() {
    if (!$('qb-history')) return;
    const attempts = Object.values(data.attempts).sort((x, y) => y.savedAt - x.savedAt);
    $('qb-history').innerHTML = attempts.length ? attempts.map(t => `<div class="qb-attempt"><div><strong>${esc(t.name)}</strong><div class="qb-muted">${esc(t.mode === 'tutor' ? 'Tutor' : 'Exam')} · ${t.timed ? 'Timed' : 'Untimed'} · ${t.items.length} questions · ${esc(t.status)}<br>${esc(new Date(t.createdAt).toLocaleString())}</div></div><button class="qb-button" data-action="open" data-id="${esc(t.id)}">${t.status === 'completed' ? 'Results' : 'Resume'}</button></div>`).join('') : '<p class="qb-muted">Your new tests will appear here.</p>';
  }
  function start() {
    if (a()?.status === 'active') beforeLeave();
    try {
      const attempt = C.create(pool(), config);
      data.attempts[attempt.id] = attempt; current = attempt.id; reviewFilter = 'all';
      if (!save()) { attempt.status = 'suspended'; attempt.runningSince = null; renderCreate(); return; }
      showView('test');
    } catch (error) { $('qb-form-error').textContent = error.message; }
  }
  function open(id) {
    if (!data.attempts[id]) return;
    if (a()?.status === 'active') beforeLeave();
    current = id; reviewFilter = 'all';
    const attempt = a();
    if (attempt.status !== 'completed') {
      C.tick(attempt);
      if (attempt.status !== 'completed') { attempt.status = 'active'; attempt.runningSince = Date.now(); }
      save();
    }
    showView('test');
    if (attempt.status === 'completed') renderResults();
  }
  function time(ms) { const secs = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(secs / 60).toString().padStart(2,'0')}:${(secs % 60).toString().padStart(2,'0')}`; }
  function visible(attempt, item) { return attempt.status === 'completed' || (attempt.mode === 'tutor' && attempt.submitted.includes(item.key)); }
  function markedText(text, ranges) {
    let pos = 0, html = '';
    const valid = (ranges || []).filter(r => Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] <= text.length && r[1] > r[0]).sort((x,y) => x[0]-y[0]);
    for (const [start, end] of valid) { if (start < pos) continue; html += esc(text.slice(pos,start)) + '<mark>' + esc(text.slice(start,end)) + '</mark>'; pos=end; }
    return html + esc(text.slice(pos));
  }
  function explanation(attempt, item) {
    const q = item.question, selected = attempt.answers[item.key], correct = selected === q.correct_answer;
    const concept = validConcept(q.concept_card) ? `<h3>Learn the concept</h3><p><strong>${esc(q.concept_card.question)}</strong></p><p>${esc(q.concept_card.answer)}</p><p>${esc(q.concept_card.explanation)}</p><button class="qb-button" data-action="anki">Export concept for Anki</button>` : '';
    return `<section class="qb-explanation" aria-label="Answer explanation"><span class="qb-eyebrow">${selected === undefined ? 'Omitted' : correct ? 'Correct' : 'Incorrect'}</span><h2>Answer explanation</h2><p><strong>Correct answer:</strong> ${esc(q.options[q.correct_answer])}</p>${selected !== undefined && !correct ? `<p><strong>Your answer:</strong> ${esc(q.options[selected])}</p>` : ''}<p>${esc(q.explanation || 'No explanation was included in this question bank.')}</p>${q.option_explanations && typeof q.option_explanations === 'object' ? `<h3>Option reasoning</h3>${item.order.filter(k => typeof q.option_explanations[k] === 'string').map(k => `<p><strong>${esc(q.options[k])}</strong><br>${esc(q.option_explanations[k])}</p>`).join('')}` : ''}${concept}<p class="qb-muted">${esc(item.bankTitle)} · ${esc(C.list(q.subject).join(', '))} · ${esc(C.list(q.system).join(', '))}</p></section>`;
  }
  function reviewItems(attempt) {
    return attempt.items.filter(i => reviewFilter === 'all' || (reviewFilter === 'flagged' ? attempt.flags.includes(i.key) : reviewFilter === 'omitted' ? !Object.hasOwn(attempt.answers,i.key) : Object.hasOwn(attempt.answers,i.key) && attempt.answers[i.key] !== i.question.correct_answer));
  }
  function renderPlayer() {
    const attempt = a();
    if (!attempt) { $('view-test').innerHTML = '<div class="qb-shell qb-card"><h1>No test open</h1><p>Create a test or resume a previous attempt.</p><button class="qb-button primary" data-action="create">Create Test</button></div>'; return; }
    if (C.tick(attempt)) { save(); renderResults(); return; }
    const item = attempt.items[attempt.index], q = item.question;
    const completed = attempt.status === 'completed', revealed = visible(attempt, item), answered = Object.hasOwn(attempt.answers,item.key);
    const progress = completed ? C.score(attempt).answered : attempt.mode === 'tutor' ? attempt.submitted.length : Object.keys(attempt.answers).length;
    $('view-test').innerHTML = `<div class="qb-shell"><div class="qb-save-alert" role="alert" hidden></div><header class="qb-player-header"><div><span class="qb-eyebrow">TESTIT · ${completed ? 'Review' : attempt.mode === 'tutor' ? 'Tutor' : 'Exam'}</span><h1>${esc(attempt.name)}</h1><span class="qb-muted" id="qb-save-state">Saved on this device</span></div><div><div class="qb-timer" id="qb-clock" role="timer" aria-label="${attempt.timed ? 'Time remaining' : 'Elapsed time'}"></div><small>${attempt.timed ? 'Remaining' : 'Elapsed'}</small></div><div class="qb-actions">${completed ? '<button class="qb-button" data-action="results">Results</button>' : '<button class="qb-button" data-action="suspend">Suspend</button><button class="qb-button primary" data-action="finish">End test</button>'}</div></header>
      <div class="qb-player-grid"><aside class="qb-card qb-navigator"><details class="qb-nav-details" ${window.innerWidth>650?'open':''}><summary>Question navigator</summary><h2>Questions</h2><p class="qb-muted">${progress} / ${attempt.items.length} ${attempt.mode === 'tutor' && !completed ? 'submitted' : 'answered'}</p><progress value="${progress}" max="${attempt.items.length}" aria-label="Test progress"></progress>${completed ? `<label class="qb-field">Review filter<select id="qb-review-filter">${[['all','All questions'],['incorrect','Incorrect'],['omitted','Omitted'],['flagged','Flagged']].map(([v,l]) => `<option value="${v}" ${reviewFilter===v?'selected':''}>${l}</option>`).join('')}</select></label>` : ''}<nav class="qb-number-grid" aria-label="Question numbers">${reviewItems(attempt).map(i => { const idx=attempt.items.indexOf(i), done=Object.hasOwn(attempt.answers,i.key), flag=attempt.flags.includes(i.key); return `<button class="qb-number ${idx===attempt.index?'current':''} ${done?'answered':''} ${flag?'flagged':''}" data-action="jump" data-index="${idx}" aria-label="Question ${idx+1}, ${done?'answered':'unanswered'}${flag?', flagged':''}" ${idx===attempt.index?'aria-current="step"':''}>${idx+1}${flag?' ⚑':''}</button>`; }).join('')}</nav>${reviewItems(attempt).length ? '' : '<p>No questions match this filter.</p>'}<p class="qb-muted">Filled: answered<br>Top border: flagged</p><div class="qb-shortcuts">1–9: select answer<br>← / →: navigate<br>F: flag · H: highlight<br>Enter: submit in Tutor<br>Shortcuts pause in form fields.</div></details></aside>
      <article class="qb-card"><div class="qb-question-toolbar"><span class="qb-muted">Question ${attempt.index+1} of ${attempt.items.length}</span><div class="qb-actions"><button class="qb-button" data-action="flag" aria-pressed="${attempt.flags.includes(item.key)}">${attempt.flags.includes(item.key)?'⚑ Flagged':'⚐ Flag'}</button><button class="qb-button" data-action="highlight" title="Select text in the question, then highlight">Highlight selection</button><button class="qb-button" data-action="clear-highlight">Clear highlights</button></div></div><h2 class="qb-stem" id="qb-stem" tabindex="-1">${markedText(q.question, attempt.highlights[item.key])}</h2><div class="qb-answer-list" role="radiogroup" aria-label="Answer choices">${item.order.map((key,idx) => `<button class="qb-answer ${revealed&&key===q.correct_answer?'correct':''} ${revealed&&key===attempt.answers[item.key]&&key!==q.correct_answer?'wrong':''}" role="radio" aria-checked="${attempt.answers[item.key]===key}" data-action="answer" data-option="${esc(key)}" ${revealed||attempt.status!=='active'?'disabled':''}><span class="qb-letter">${String.fromCharCode(65+idx)}</span><span>${esc(q.options[key])}${revealed&&key===q.correct_answer?' <strong>— Correct answer</strong>':''}${revealed&&key===attempt.answers[item.key]?' <strong>— Your answer</strong>':''}</span></button>`).join('')}</div>${revealed ? explanation(attempt,item) : `<p class="qb-muted">${attempt.mode==='tutor'?'Choose an answer, then submit to see the explanation.':'Your choice is saved. Results stay hidden until the test is complete.'}</p>`}<footer class="qb-footer"><button class="qb-button" data-action="previous" ${attempt.index===0?'disabled':''}>← Previous</button>${attempt.mode==='tutor'&&!revealed?`<button class="qb-button primary" data-action="submit-answer" ${answered&&attempt.status==='active'?'':'disabled'}>Submit answer</button>`:''}<button class="qb-button" data-action="next" ${attempt.index===attempt.items.length-1?'disabled':''}>Next →</button></footer></article></div></div>`;
    updateClock(); updateSaveStatus();
  }
  function updateClock() { const attempt=a(); if ($('qb-clock')&&attempt) $('qb-clock').textContent=time(attempt.timed?attempt.durationMs-attempt.elapsedMs:attempt.elapsedMs); }
  function change(mutator) {
    const attempt = a(); if (!attempt) return;
    const expired = C.tick(attempt);
    if (expired) { save(); renderResults(); return; }
    mutator(attempt); save(); renderPlayer();
  }
  function go(index) {
    change(t => { t.index = Math.max(0,Math.min(t.items.length-1,index)); });
    $('qb-stem')?.focus({preventScroll:true});
  }
  function highlight() {
    const selection=window.getSelection(), stem=$('qb-stem');
    if (!selection?.rangeCount || selection.isCollapsed || !stem) { showToast('Select text inside the question first.'); return; }
    const range=selection.getRangeAt(0);
    if (!stem.contains(range.startContainer)||!stem.contains(range.endContainer)) { showToast('Highlight text inside the question only.'); return; }
    const prefix=range.cloneRange(); prefix.selectNodeContents(stem); prefix.setEnd(range.startContainer,range.startOffset);
    const start=prefix.toString().length, end=start+range.toString().length;
    change(t => { const key=t.items[t.index].key; const ranges=[...(t.highlights[key]||[]),[start,end]].sort((x,y)=>x[0]-y[0]); const merged=[]; for(const r of ranges){const last=merged.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push(r);}t.highlights[key]=merged; });
    selection.removeAllRanges();
  }
  function renderResults() {
    const attempt=a(); if (!attempt) return;
    if (attempt.status!=='completed') { renderPlayer(); return; }
    const s=C.score(attempt);
    $('view-test').innerHTML=`<div class="qb-shell"><header class="qb-heading"><div><span class="qb-eyebrow">TESTIT · Completed</span><h1>${esc(attempt.name)}</h1><p class="qb-muted">${attempt.mode==='tutor'?'Tutor':'Exam'} · ${attempt.timed?'Timed':'Untimed'} · ${time(attempt.elapsedMs)} elapsed</p></div><div class="qb-actions"><button class="qb-button" data-action="create">Create another test</button><button class="qb-button primary" data-action="review">Review answers</button></div></header><div class="qb-save-alert" role="alert" hidden></div><section class="qb-card"><h2>Test results</h2><div class="qb-metrics"><div class="qb-metric"><strong>${s.percent}%</strong>Test score (${s.correct}/${s.total})</div><div class="qb-metric"><strong>${s.correct}</strong>Correct</div><div class="qb-metric"><strong>${s.incorrect}</strong>Incorrect</div><div class="qb-metric"><strong>${s.omitted}</strong>Omitted</div></div><p class="qb-muted">Answered accuracy: ${s.answered?Math.round(s.correct/s.answered*100)+'%':'—'} (${s.correct}/${s.answered}). Test score includes omitted questions in its denominator.</p><div class="qb-table-wrap"><table class="qb-table"><thead><tr><th>Question</th><th>Bank</th><th>Result</th><th>Time</th><th>Review</th></tr></thead><tbody>${attempt.items.map((i,idx)=>`<tr><td>${idx+1}${attempt.flags.includes(i.key)?' · Flagged':''}</td><td>${esc(i.bankTitle)}</td><td>${!Object.hasOwn(attempt.answers,i.key)?'Omitted':attempt.answers[i.key]===i.question.correct_answer?'Correct':'Incorrect'}</td><td>${time(attempt.questionMs[i.key]||0)}</td><td><button class="qb-button" data-action="review-item" data-index="${idx}">Review ${idx+1}</button></td></tr>`).join('')}</tbody></table></div></section></div>`;
    updateSaveStatus();
  }
  function confirmFinish() {
    const attempt=a(); if(!attempt||attempt.status!=='active')return;
    const selected=Object.keys(attempt.answers).length;
    const dialog=$('qb-confirm');
    dialog.innerHTML=`<h2>End this test?</h2><p>${selected} answered · ${attempt.items.length-selected} unanswered · ${attempt.flags.length} flagged.</p><p>Answers will be locked and all explanations revealed. Your original question banks and previous attempts remain intact.</p><div class="qb-actions"><button class="qb-button" data-action="cancel-finish">Keep working</button><button class="qb-button primary" data-action="confirm-finish">End test</button></div>`;
    dialog.showModal();
  }
  function renderVisible() { if(getCurrentView()==='qbank')renderCreate(); else if(getCurrentView()==='test') { if(a()?.status==='completed')renderResults(); else renderPlayer(); } }
  function sample() {
    const key='testit_quiz_phase1_sample';
    if(localStorage.getItem(key)){showToast('Sample bank already exists.');return;}
    const quiz={title:'TESTIT · Foundations sample',questions:[
      {id:1,subject:'Medicine',system:'Cardiovascular',question:'A resting adult has a heart rate of 70 beats per minute and a stroke volume of 70 mL. What is the approximate cardiac output?',options:{a:'0.49 L/min',b:'4.9 L/min',c:'49 L/min'},correct_answer:'b',explanation:'Cardiac output equals heart rate multiplied by stroke volume. 70 × 70 = 4,900 mL/min, or 4.9 L/min.',concept_card:{question:'How is cardiac output calculated?',answer:'Heart rate multiplied by stroke volume.',explanation:'Convert millilitres to litres when reporting litres per minute.'},tags:['physiology']},
      {id:2,subject:'Medicine',system:'Respiratory',question:'Which structure is the main site of gas exchange in the lungs?',options:{a:'Alveoli',b:'Trachea',c:'Main bronchi'},correct_answer:'a',explanation:'Alveoli have a thin barrier and a large surface area in close contact with pulmonary capillaries. These properties support diffusion of oxygen and carbon dioxide.',tags:['anatomy']},
      {id:3,subject:'Foundations',system:'Renal',question:'Which nephron segment receives filtrate directly from the glomerular capsule?',options:{a:'Distal convoluted tubule',b:'Collecting duct',c:'Proximal convoluted tubule'},correct_answer:'c',explanation:'Filtrate moves from the glomerular capsule into the proximal convoluted tubule, where much of the filtered water and solute is reabsorbed.',tags:['anatomy']},
      {id:4,subject:'Foundations',system:'Cardiovascular',question:'Which vessel carries blood from the right ventricle toward the lungs?',options:{a:'Pulmonary artery',b:'Pulmonary vein',c:'Aorta'},correct_answer:'a',explanation:'The pulmonary artery carries blood away from the right ventricle into the pulmonary circulation. Arteries are defined by flow away from the heart.',tags:['anatomy']}
    ]};
    try { localStorage.setItem(key,JSON.stringify({quiz,answers:{},flags:[],savedAt:Date.now(),_slot:key}));backupManager.touchLocalModified();syncManager.scheduleSync();config.banks.push(key);initialized=true;renderCreate(); }catch{showToast('Sample could not be saved. Export a backup or free space.');}
  }
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='qb-review-filter'){reviewFilter=el.value;renderPlayer();return;}
    const kind=el.dataset.config;if(!kind)return;
    if(['banks','subjects','systems'].includes(kind)){config[kind]=el.checked?[...config[kind],el.value]:config[kind].filter(v=>v!==el.value);renderCreate();}
    else if(kind==='pool'||kind==='mode'){config[kind]=el.value;renderAvailability();}
    else if(kind==='timed'){config.timed=el.checked;renderCreate();}
  });
  document.addEventListener('input',event=>{const el=event.target,kind=el.dataset.config;if(['count','minutes'].includes(kind)){config[kind]=Number(el.value);renderAvailability();}else if(kind==='name')config.name=el.value;});
  document.addEventListener('submit',event=>{if(event.target.id==='qb-create-form'){event.preventDefault();start();}});
  document.addEventListener('mousedown',event=>{if(event.target.closest('[data-action="highlight"]'))event.preventDefault();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action;
    if(!button.closest('.qb-view')&&!button.closest('#qb-confirm'))return;
    if(action==='sample')sample();
    if(action==='import'){showView('home');$('home-import-details').open=true;$('json-input').focus();}
    if(action==='all-banks'||action==='no-banks'){config.banks=action==='all-banks'?banks().map(b=>b.key):[];renderCreate();}
    if(action==='open')open(button.dataset.id);
    if(action==='create')showView('qbank');
    if(action==='export')backupManager.exportBackup();
    if(action==='retry'){persist();updateSaveStatus();}
    if(action==='suspend'){beforeLeave();showView('qbank');}
    if(action==='finish')confirmFinish();
    if(action==='cancel-finish')$('qb-confirm').close();
    if(action==='confirm-finish') { $('qb-confirm').close();const t=a();if(t&&t.status==='active'){C.tick(t);C.complete(t);save();renderResults();} }
    if(action==='results')renderResults();
    if(action==='review'||action==='review-item'){if(a()){a().index=action==='review'?0:Number(button.dataset.index);reviewFilter='all';renderPlayer();}}
    if(action==='jump')go(Number(button.dataset.index));
    if(action==='previous'&&a())go(a().index-1);
    if(action==='next'&&a())go(a().index+1);
    if(action==='answer')change(t=>{const i=t.items[t.index];if(t.status==='active'&&!visible(t,i))t.answers[i.key]=button.dataset.option;});
    if(action==='submit-answer')change(t=>{const i=t.items[t.index];if(t.status==='active'&&t.mode==='tutor'&&Object.hasOwn(t.answers,i.key)&&!t.submitted.includes(i.key)){t.submitted.push(i.key);t.responseAt ||= {};t.responseAt[i.key]=Date.now();}});
    if(action==='flag')change(t=>{const key=t.items[t.index].key;t.flags=t.flags.includes(key)?t.flags.filter(k=>k!==key):[...t.flags,key];});
    if(action==='highlight')highlight();
    if(action==='clear-highlight')change(t=>{delete t.highlights[t.items[t.index].key];});
    if(action==='anki'&&a()){const i=a().items[a().index];if(visible(a(),i)&&validConcept(i.question.concept_card))exportConcepts('extra',[{card:i.question.concept_card,tags:i.question.tags||[],title:i.bankTitle}]);}
  });
  document.addEventListener('keydown',event=>{
    if(getCurrentView()!=='test'||!a()||$('qb-confirm').open||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const t=a(),i=t.items[t.index];
    if(event.key==='ArrowLeft'){event.preventDefault();go(t.index-1);}
    else if(event.key==='ArrowRight'){event.preventDefault();go(t.index+1);}
    else if(event.key.toLowerCase()==='f'){event.preventDefault();$('view-test').querySelector('[data-action="flag"]')?.click();}
    else if(event.key.toLowerCase()==='h'){event.preventDefault();highlight();}
    else if(/^[1-9]$/.test(event.key)&&!visible(t,i)){event.preventDefault();$('view-test').querySelectorAll('[data-action="answer"]')[Number(event.key)-1]?.click();}
    else if(event.key==='Enter'&&event.target.tagName!=='BUTTON'&&event.target.tagName!=='A'){event.preventDefault();$('view-test').querySelector('[data-action="submit-answer"]')?.click();}
  });
  setInterval(()=>{
    const attempt=a();if(!attempt||attempt.status!=='active')return;
    if(C.tick(attempt)){save();$('qb-confirm').close();renderResults();showToast('Time is up. Your test has been completed.');}
    else {updateClock();if(Date.now()-attempt.savedAt>=10000)save();}
  },1000);
  window.addEventListener('pagehide',beforeLeave);
  let mobileNavigator = window.innerWidth <= 650;
  window.addEventListener('resize',()=>{
    const mobile = window.innerWidth <= 650;
    if (mobile !== mobileNavigator) { const nav=document.querySelector('.qb-nav-details');if(nav)nav.open=!mobile;mobileNavigator=mobile; }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
  window.addEventListener('beforeunload',event=>{flush();if(dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('storage',event=>{if(event.key!==KEY)return;if(a()?.status==='active')beforeLeave();reload();showToast('Test data changed in another tab. This session was suspended.');});
  window.QBank={KEY,renderCreate,renderPlayer,renderResults,beforeLeave,flush,reload,latestFor,
    backupData(){flush();return blocked?null:C.clone(data);},
    canRestore(){return !dirty;},
    merge:C.merge,validate:C.validateStore,
    reset(){current=null;data=empty();lastRaw=null;dirty=false;blocked=false;message='';renderVisible();}
  };
})();
