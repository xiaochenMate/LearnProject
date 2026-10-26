import React, { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, SkipForward, Square, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { createMathRun, DEFAULT_MATH, finishMath, mathStats, submitMath, validMathRun, validMathSettings, type MathRun, type MathSettings, type Operation } from '../lib/practiceCore';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

const initialRun = (): MathRun => ({ ...createMathRun(DEFAULT_MATH), status: 'ready', deadline: null });
const MathSprintApp: React.FC<{ onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [settings, setSettings, configStorage] = useModuleState('exbeam.practice.math.settings.v1', DEFAULT_MATH, validMathSettings);
  const [run, setRun, storage] = useModuleState('exbeam.practice.math.run.v1', initialRun, validMathRun);
  const [now, setNow] = useState(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const submitted = useRef('');
  const reported = useRef('');
  const active = run.status === 'playing' || run.status === 'paused';
  const stats = mathStats(run.attempts);
  const wrong = run.attempts.filter(a => !a.correct);
  const remaining = run.status === 'playing' && run.deadline ? Math.max(0, run.deadline - now) : run.remaining;
  useEffect(() => {
    if (run.status !== 'playing') return;
    const tick = () => { const time = Date.now(); setNow(time); setRun(current => current.status === 'playing' && current.deadline !== null && time >= current.deadline ? finishMath(current) : current); };
    tick(); const timer = window.setInterval(tick, 200); return () => window.clearInterval(timer);
  }, [run.status, run.deadline, setRun]);
  useEffect(() => { if (run.status === 'playing') input.current?.focus(); }, [run.status, run.question.id]);
  useEffect(() => {
    if (run.status !== 'result' || stats.correct === 0 || reported.current === run.id) return;
    reported.current = run.id;
    onDiscover?.({ key: `math-${run.id}`, kind: 'challenge', title: run.review.length ? '完成心算错题再练' : '完成一轮心算挑战', detail: `${run.settings.duration}秒限时，${run.settings.level}以内，答对${stats.correct}/${run.attempts.length}题，正确率${stats.accuracy}%，${stats.score}分。` });
  }, [run.status, run.id, stats.correct, stats.accuracy, stats.score, run.attempts.length, onDiscover]);
  const start = (review = false) => { submitted.current = ''; setNow(Date.now()); const nextSettings = review ? run.settings : settings; if (review) setSettings(nextSettings); setRun(createMathRun(nextSettings, Date.now(), review ? wrong : [])); };
  const submit = (skip = false) => {
    if (submitted.current === run.question.id || run.status !== 'playing') return;
    if (!skip && !/^\d+$/.test(run.input.trim())) { setRun(s => ({ ...s, feedback: '请输入完整的非负整数。' })); return; }
    submitted.current = run.question.id; setRun(s => submitMath(s, Date.now(), skip));
  };
  const pause = () => setRun(s => s.status === 'playing' ? { ...s, status: 'paused', remaining: Math.max(0, (s.deadline || Date.now()) - Date.now()), deadline: null } : s.status === 'paused' ? { ...s, status: 'playing', deadline: Date.now() + s.remaining } : s);
  return <Workbench title="心算竞速" eyebrow="MATHEMATICS / 04" className="practice practice-math" toolbar={<>
    {active && <IconButton label={run.status === 'paused' ? '继续计时' : '暂停计时'} onClick={pause}>{run.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}</IconButton>}<IconButton label="关闭心算练习" onClick={onClose}><X size={18} /></IconButton>
  </>} status={<><span>{storage && configStorage ? '题目、输入和结果保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>{active ? '离开后倒计时仍按截止时间结算，可先暂停' : '完整提交后判题 · 每题10分'}</span></>}>
    <div className="wb-grid"><aside className="wb-sidebar">
      <label className="wb-field">数值范围<select value={settings.level} disabled={active} onChange={e => setSettings(s => ({ ...s, level: Number(e.target.value) as MathSettings['level'] }))}><option value="20">20以内 · 入门</option><option value="100">100以内 · 标准</option><option value="1000">1000以内 · 进阶</option></select></label>
      <fieldset className="practice-stack" style={{ border: 0, padding: 0, margin: 0 }} disabled={active}><legend className="wb-muted">运算</legend><div className="practice-checks">{(['+', '-', '×', '÷'] as Operation[]).map(op => <label key={op}><input type="checkbox" checked={settings.operations.includes(op)} disabled={settings.operations.length === 1 && settings.operations.includes(op)} onChange={() => setSettings(s => ({ ...s, operations: s.operations.includes(op) ? s.operations.filter(o => o !== op) : [...s.operations, op] }))} />{op}</label>)}</div></fieldset>
      <label className="wb-field">挑战时长<select value={settings.duration} disabled={active} onChange={e => setSettings(s => ({ ...s, duration: Number(e.target.value) as MathSettings['duration'] }))}>{[30, 60, 120].map(n => <option key={n} value={n}>{n}秒</option>)}</select></label>
      <div className="practice-stack"><span className="wb-muted">本轮得分</span><strong className="practice-count">{stats.score}</strong><small className="wb-muted">答对 {stats.correct} 题 · 最高连对 {stats.best} 题</small></div>
      {active && <button className="wb-button" onClick={() => setRun(s => finishMath(s))}><Square size={15} />结束并查看结果</button>}
    </aside><main className="wb-main">
      {run.status !== 'result' ? <>
        <div className="practice-meta"><span>{run.status === 'ready' ? '练习题' : run.status === 'paused' ? '已暂停' : `第${run.attempts.length + 1}题${run.review.length ? ` / 共${run.review.length}题` : ''}`}</span><strong className="practice-number">{Math.ceil(remaining / 1000)}<small>秒</small></strong></div>
        <progress className="practice-progress" value={remaining} max={run.settings.duration * 1000} aria-label="剩余时间" />
        <form className="practice-stage" onSubmit={e => { e.preventDefault(); submit(); }}>
          <div className="practice-equation" aria-label={`${run.question.a} ${run.question.op} ${run.question.b} 等于多少`}><span>{run.question.a}</span><span>{run.question.op}</span><span>{run.question.b}</span><span>=</span><span>?</span></div>
          {run.status === 'ready' ? <button className="wb-button is-primary" type="button" onClick={() => start()}><Play size={17} />开始挑战</button> : <><input className="practice-answer" ref={input} aria-label="心算答案" inputMode="numeric" maxLength={8} value={run.input} disabled={run.status !== 'playing'} autoComplete="off" onChange={e => { const value = e.target.value; if (/^\d{0,8}$/.test(value)) setRun(s => ({ ...s, input: value })); }} /><div className="practice-actions"><button className="wb-button is-primary" type="submit" disabled={run.status !== 'playing'}><Check size={16} />提交答案</button><button className="wb-button" type="button" disabled={run.status !== 'playing'} onClick={() => submit(true)}><SkipForward size={16} />跳过</button></div></>}
        </form>
        {run.feedback && <p className="practice-feedback" role="status">上一题：{run.feedback}</p>}
        {run.status === 'paused' && <div className="wb-notice">当前题目和输入已保留。<button className="wb-button" onClick={pause}><Play size={16} />继续挑战</button></div>}
      </> : <>
        <h3>本轮结果</h3><div className="wb-stats"><div className="wb-stat"><span>得分</span><strong>{stats.score}</strong></div><div className="wb-stat"><span>正确率</span><strong>{stats.accuracy}%</strong></div><div className="wb-stat"><span>正确 / 总题数</span><strong>{stats.correct} / {run.attempts.length}</strong></div><div className="wb-stat"><span>最高连对</span><strong>{stats.best}</strong></div></div>
        <div className="practice-actions"><button className="wb-button is-primary" onClick={() => start()}><Play size={16} />新一轮</button><button className="wb-button" disabled={!wrong.length} onClick={() => start(true)}><RotateCcw size={16} />错题再练 {wrong.length}</button></div>
        <table className="practice-table"><thead><tr><th>题目</th><th>你的答案</th><th>正确答案</th></tr></thead><tbody>{run.attempts.map(a => <tr key={a.id}><td>{a.a} {a.op} {a.b}</td><td className={a.correct ? 'practice-good' : 'practice-bad'}>{a.response || '未作答'}</td><td>{a.answer}</td></tr>)}</tbody></table>
      </>}
    </main></div>
  </Workbench>;
};
export default MathSprintApp;
