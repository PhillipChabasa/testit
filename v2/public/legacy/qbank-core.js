/* TESTIT question-bank model. No DOM or network dependencies. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const identity = (slot, id) => JSON.stringify([slot, String(id)]);
  const list = value => Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()) : typeof value === 'string' && value.trim() ? [value.trim()] : ['Uncategorized'];
  function validateAttempt(a) {
    if (!a || a.version !== 1 || !['tutor', 'exam'].includes(a.mode) || !['active', 'suspended', 'completed'].includes(a.status) || !Array.isArray(a.items) || !a.items.length || !Number.isInteger(a.index) || a.index < 0 || a.index >= a.items.length) throw Error('Invalid test session');
    if (!Number.isFinite(a.elapsedMs) || a.elapsedMs < 0 || !Number.isFinite(a.durationMs) || a.durationMs < 0 || typeof a.answers !== 'object' || !a.answers || Array.isArray(a.answers) || !Array.isArray(a.flags) || !Array.isArray(a.submitted)) throw Error('Invalid test progress');
    const ids = new Set();
    for (const item of a.items) {
      if (!item || typeof item.key !== 'string' || ids.has(item.key) || typeof item.bank !== 'string' || !item.question || typeof item.question.question !== 'string' || !item.question.options || !Object.hasOwn(item.question.options, item.question.correct_answer)) throw Error('Invalid test question');
      ids.add(item.key);
      if (!Array.isArray(item.order) || item.order.length !== Object.keys(item.question.options).length || new Set(item.order).size !== item.order.length || !item.order.every(k => Object.hasOwn(item.question.options, k))) throw Error('Invalid option order');
      if (Object.hasOwn(a.answers, item.key) && !Object.hasOwn(item.question.options, a.answers[item.key])) throw Error('Invalid saved answer');
      const ranges = a.highlights?.[item.key];
      if (ranges !== undefined && (!Array.isArray(ranges) || !ranges.every(r=>Array.isArray(r) && r.length===2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0]>=0 && r[1]>r[0] && r[1]<=item.question.question.length))) throw Error('Invalid saved highlighting');
    }
    if (!a.flags.every(k=>ids.has(k)) || !a.submitted.every(k=>ids.has(k) && Object.hasOwn(a.answers,k))) throw Error('Invalid saved question references');
    return a;
  }
  function validateStore(data) {
    if (!data || data.version !== 1 || !data.attempts || typeof data.attempts !== 'object' || Array.isArray(data.attempts)) throw Error('Unsupported question-bank data');
    for (const [id, attempt] of Object.entries(data.attempts)) {
      if (!/^[a-zA-Z0-9_~\-]+$/.test(id) || ['__proto__','constructor','prototype'].includes(id) || attempt?.id !== id) throw Error('Invalid attempt identity');
      validateAttempt(attempt);
      if (!attempt.highlights || typeof attempt.highlights !== 'object' || !attempt.questionMs || typeof attempt.questionMs !== 'object' || typeof attempt.revision !== 'string' || !Number.isFinite(attempt.savedAt) || !Number.isFinite(attempt.createdAt) || typeof attempt.name !== 'string' || typeof attempt.timed !== 'boolean' || !(attempt.runningSince === null || Number.isFinite(attempt.runningSince))) throw Error('Invalid session metadata');
    }
    return data;
  }
  function merge(left, right) {
    validateStore(left); validateStore(right);
    const out = clone(left);
    for (const [id, b] of Object.entries(right.attempts)) {
      const a = out.attempts[id];
      if (!a) { out.attempts[id] = clone(b); continue; }
      if (a.revision === b.revision) continue;
      const newer = (a.savedAt || 0) >= (b.savedAt || 0) ? a : b;
      const older = newer === a ? b : a;
      out.attempts[id] = clone(newer);
      // Preserve divergent branches; direct descendants need no recovery copy.
      if (newer.parentRevision !== older.revision) {
        const recoveryId = id + '~' + older.revision;
        if (!out.attempts[recoveryId]) out.attempts[recoveryId] = {...clone(older), id: recoveryId, name: older.name + ' (recovered conflict)', status: older.status === 'completed' ? 'completed' : 'suspended', runningSince: null};
      }
    }
    return out;
  }
  function latest(attempts, key) {
    const responseTime = a => a.responseAt?.[key] || a.completedAt || a.savedAt || 0;
    return Object.values(attempts).filter(a => a.items.some(i => i.key === key) && (a.status === 'completed' || a.submitted.includes(key))).sort((a, b) => responseTime(b) - responseTime(a))[0];
  }
  function eligible(banks, attempts, config) {
    const out = [];
    for (const {key: slot, data} of banks) {
      if (!config.banks.includes(slot)) continue;
      for (const q of data.quiz.questions) {
        const key = identity(slot, q.id);
        const subjects = list(q.subject ?? data.quiz.subject);
        const systems = list(q.system ?? data.quiz.system);
        if (config.subjects.length && !subjects.some(s => config.subjects.includes(s))) continue;
        if (config.systems.length && !systems.some(s => config.systems.includes(s))) continue;
        const a = latest(attempts, key);
        const answered = a ? Object.hasOwn(a.answers, key) : Object.hasOwn(data.answers || {}, q.id);
        const incorrect = a ? answered && a.answers[key] !== q.correct_answer : answered && data.answers[q.id] !== q.correct_answer;
        const flagged = Object.values(attempts).some(t => t.items.some(i => i.key === key) && t.flags.includes(key)) || (data.flags || []).some(id => String(id) === String(q.id));
        if (config.pool === 'unused' && (answered || a)) continue;
        if (config.pool === 'incorrect' && !incorrect) continue;
        if (config.pool === 'flagged' && !flagged) continue;
        out.push({key, bank: slot, bankTitle: data.quiz.title || 'Untitled bank', question: clone(q)});
      }
    }
    return out;
  }
  function shuffle(values, random = Math.random) {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function create(items, config, now = Date.now()) {
    if (!Number.isInteger(config.count) || config.count < 1 || config.count > items.length) throw Error('Choose a whole question count within the available pool.');
    if (!['tutor', 'exam'].includes(config.mode)) throw Error('Choose a test mode.');
    if (config.timed && (!Number.isFinite(config.minutes) || config.minutes <= 0)) throw Error('Choose a positive duration.');
    const selected = shuffle(items).slice(0, config.count).map(i => ({...clone(i), order: shuffle(Object.keys(i.question.options))}));
    return {version: 1, id: uid(), revision: uid(), parentRevision: null, name: config.name?.trim() || 'Practice test', mode: config.mode, timed: !!config.timed, durationMs: config.timed ? config.minutes * 60000 : 0, elapsedMs: 0, runningSince: now, status: 'active', items: selected, index: 0, answers: {}, flags: [], submitted: [], responseAt: {}, highlights: {}, questionMs: {}, createdAt: now, savedAt: now};
  }
  function tick(a, now = Date.now()) {
    if (a.status !== 'active' || a.runningSince === null) return false;
    const delta = Math.max(0, now - a.runningSince);
    a.elapsedMs += delta;
    const key = a.items[a.index].key;
    a.questionMs[key] = (a.questionMs[key] || 0) + delta;
    a.runningSince = now;
    if (a.timed && a.elapsedMs >= a.durationMs) { complete(a, now); return true; }
    return false;
  }
  function complete(a, now = Date.now()) { a.status = 'completed'; a.runningSince = null; a.completedAt = now; a.responseAt ||= {}; for (const item of a.items) a.responseAt[item.key] ||= now; a.submitted = a.items.filter(i => Object.hasOwn(a.answers, i.key)).map(i => i.key); }
  function score(a) {
    const correct = a.items.filter(i => a.answers[i.key] === i.question.correct_answer).length;
    const answered = a.items.filter(i => Object.hasOwn(a.answers, i.key)).length;
    return {correct, answered, incorrect: answered - correct, omitted: a.items.length - answered, total: a.items.length, percent: Math.round(correct / a.items.length * 100)};
  }
  root.QBankCore = {clone, uid, identity, list, validateAttempt, validateStore, merge, latest, eligible, shuffle, create, tick, complete, score};
  if (typeof module !== 'undefined') module.exports = root.QBankCore;
})(globalThis);
