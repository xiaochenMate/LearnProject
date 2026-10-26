import React, { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw, Volume2, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { checkClock, initialClock, parsedClockInput, validClock, type ClockSession } from '../lib/practiceSessions';
import { clockTarget, dragClock, normalizeMinutes, timeLabel } from '../lib/practiceCore';
import { usePracticeSpeech } from '../lib/practiceHooks';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

const fields = (total: number, format: '12' | '24') => ({ hour: String(format === '24' ? Math.floor(total / 60) : Math.floor(total / 60) % 12 || 12).padStart(2, '0'), minute: String(total % 60).padStart(2, '0'), pm: total >= 720 });
const ClockApp: React.FC<{ onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [state, setState, storage] = useModuleState('exbeam.practice.clock.v1', initialClock, validClock);
  const [notice, setNotice] = useState('');
  const face = useRef<HTMLDivElement>(null);
  const dragging = useRef<'hour' | 'minute' | null>(null);
  const speech = usePracticeSpeech();
  const display = state.mode === 'read' ? state.target : state.total;
  const editable = state.mode !== 'read' && state.feedback !== 'correct';
  const setTime = (total: number) => setState(s => ({ ...s, total: normalizeMinutes(total), ...fields(normalizeMinutes(total), s.format), feedback: 'pending' }));
  const changeField = (name: 'hour' | 'minute', value: string) => {
    if (!/^\d{0,2}$/.test(value)) return;
    setNotice(''); setState(s => { const next = { ...s, [name]: value, feedback: 'pending' as const }; const parsed = parsedClockInput(next); return s.mode === 'read' || parsed === null ? next : { ...next, total: parsed }; });
  };
  const next = (mode = state.mode, target?: number, step = state.step) => {
    setNotice(''); const value = target ?? clockTarget(step, state.target);
    setState(s => ({ ...s, mode, step, target: value, feedback: 'pending', ...(mode === 'read' ? { hour: '', minute: '', pm: value >= 720 } : mode === 'set' ? { total: 0, ...fields(0, s.format) } : { ...fields(s.total, s.format) }) }));
  };
  const pointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current || !face.current) return;
    const rect = face.current.getBoundingClientRect();
    const angle = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 90;
    setState(s => { const total = dragClock(s.total, dragging.current!, angle); return { ...s, total, ...fields(total, s.format), feedback: 'pending' }; });
  };
  const release = (event: React.PointerEvent<HTMLButtonElement>) => { dragging.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const submit = () => {
    const answer = parsedClockInput(state);
    if (answer === null) { setNotice(`请输入${state.format === '24' ? '0–23' : '1–12'}时和0–59分。`); return; }
    const result = checkClock(state, answer); setState(result);
    if (state.feedback !== 'correct' && result.feedback === 'correct') onDiscover?.({ key: `clock-${state.mode}-${state.target}`, kind: 'challenge', title: state.mode === 'read' ? '读对了钟面时间' : '准确拨出了时间', detail: `${timeLabel(state.target, '24')}，同时掌握${timeLabel(state.target, '12')}的表示。` });
  };
  return <Workbench title="时间实验室" eyebrow="TIME / 03" className="practice practice-clock" toolbar={<>
    <IconButton label="朗读钟面时间" disabled={!speech.available || state.mode === 'read'} onClick={() => speech.speak(`${display < 720 ? '上午' : '下午'}${Math.floor(display / 60) % 12 || 12}点${display % 60}分`)}><Volume2 size={18} /></IconButton><IconButton label="关闭时钟练习" onClick={onClose}><X size={18} /></IconButton>
  </>} status={<><span>{storage ? '练习进度保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>{speech.notice || (!speech.available ? '此浏览器无语音朗读' : '时针每小时30°，分针每分钟6°')}</span></>}>
    <nav className="wb-tabs" aria-label="时钟模式">{([['explore', '自由拨钟'], ['set', '拨时挑战'], ['read', '读时挑战']] as const).map(([mode, label]) => <button key={mode} aria-pressed={state.mode === mode} onClick={() => { if (state.mode !== mode) next(mode); }}>{label}</button>)}</nav>
    <div className="wb-grid"><aside className="wb-sidebar">
      <div className="practice-stack"><span className="wb-muted">时间格式</span><div className="practice-actions">{(['12', '24'] as const).map(format => <button key={format} className={`wb-button ${state.format === format ? 'is-selected' : ''}`} aria-pressed={state.format === format} onClick={() => setState(s => { const value = parsedClockInput(s); return { ...s, format, ...(value === null ? {} : fields(value, format)) }; })}>{format}小时</button>)}</div></div>
      <label className="wb-field">挑战精度<select value={state.step} onChange={e => next(state.mode, undefined, Number(e.target.value) as ClockSession['step'])}><option value="30">整点 / 半点</option><option value="5">每5分钟</option><option value="1">每1分钟</option></select></label>
      <div className="practice-stack"><span className="wb-muted">已完成不同题目</span><strong className="practice-count">{state.solved.length}</strong><small className="wb-muted">待复习 {state.wrong.length} 个时间</small></div>
      {state.wrong.length > 0 && <div className="wb-list">{state.wrong.slice(0, 6).map(t => <div key={t} className="practice-meta"><span>{timeLabel(t)}</span><IconButton label={`重练${timeLabel(t)}`} onClick={() => next('read', t)}><RotateCcw size={16} /></IconButton></div>)}</div>}
    </aside><main className="wb-main">
      <div className="practice-meta"><span>{state.mode === 'explore' ? '拨动钟面' : state.mode === 'set' ? '请拨出目标时间' : `钟面是${state.target < 720 ? '上午' : '下午'}的几点几分？`}</span>{state.mode === 'set' && <strong>{timeLabel(state.target, state.format)}</strong>}</div>
      <div className="practice-stage">
        <div className="practice-clock-face" ref={face} aria-label={state.mode === 'read' ? '待作答钟面' : `钟面${timeLabel(display)}`}>
          {Array.from({ length: 60 }, (_, i) => <span key={i} className={`clock-tick ${i % 5 === 0 ? 'is-major' : ''}`} style={{ '--i': i } as React.CSSProperties} />)}
          {Array.from({ length: 12 }, (_, i) => <span key={i} className="clock-numeral" style={{ '--i': i } as React.CSSProperties}>{i || 12}</span>)}
          {(['hour', 'minute'] as const).map(hand => <button key={hand} type="button" className={`clock-hand clock-${hand}`} aria-label={hand === 'hour' ? '时针' : '分针'} title={hand === 'hour' ? '拖动时针' : '拖动分针'} disabled={!editable} style={{ transform: `rotate(${hand === 'hour' ? display % 720 / 2 : display % 60 * 6}deg)` }} onPointerDown={event => { event.preventDefault(); dragging.current = hand; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={pointerMove} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { dragging.current = null; }} onKeyDown={event => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); setTime(state.total + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1) * (hand === 'hour' ? 60 : 1)); } }} />)}
          <span className="clock-pin" />
        </div>
        {state.mode !== 'read' && <div className="practice-actions"><IconButton label="减少一分钟" disabled={!editable} onClick={() => setTime(state.total - 1)}><ChevronLeft size={18} /></IconButton><span className="practice-number">{state.showDigital ? timeLabel(display, state.format) : '••:••'}</span><IconButton label="增加一分钟" disabled={!editable} onClick={() => setTime(state.total + 1)}><ChevronRight size={18} /></IconButton><IconButton label={state.showDigital ? '隐藏数字时间' : '显示数字时间'} aria-pressed={state.showDigital} onClick={() => setState(s => ({ ...s, showDigital: !s.showDigital }))}>{state.showDigital ? <Eye size={17} /> : <EyeOff size={17} />}</IconButton></div>}
        <div className="practice-time-input"><label className="wb-field">时<input aria-label="小时" inputMode="numeric" value={state.hour} disabled={state.feedback === 'correct'} onChange={e => changeField('hour', e.target.value)} /></label><span>:</span><label className="wb-field">分<input aria-label="分钟" inputMode="numeric" value={state.minute} disabled={state.feedback === 'correct'} onChange={e => changeField('minute', e.target.value)} /></label></div>
        {state.format === '12' && <div className="practice-actions">{[false, true].map(pm => <button key={String(pm)} className={`wb-button ${state.pm === pm ? 'is-selected' : ''}`} aria-pressed={state.pm === pm} disabled={state.feedback === 'correct'} onClick={() => setState(s => { const nextState = { ...s, pm, feedback: 'pending' as const }; const value = parsedClockInput(nextState); return s.mode === 'read' || value === null ? nextState : { ...nextState, total: value }; })}>{pm ? '下午 PM' : '上午 AM'}</button>)}</div>}
      </div>
      {notice && <div className="wb-notice is-error" role="status">{notice}</div>}
      {state.mode !== 'explore' && <div className="practice-actions"><button className="wb-button is-primary" disabled={state.feedback === 'correct'} onClick={submit}><Check size={16} />核对时间</button><button className="wb-button" onClick={() => next()}><ChevronRight size={16} />下一题</button></div>}
      {state.feedback !== 'pending' && <div className={`practice-feedback ${state.feedback === 'wrong' ? 'is-wrong' : ''}`} role="status"><strong>{state.feedback === 'correct' ? '时间正确' : '再检查时针、分针和上下午'}</strong><p>{timeLabel(state.target, '24')} = {timeLabel(state.target, '12')}</p><small>时针位置：{(state.target % 720 / 2).toFixed(1)}°；分针位置：{state.target % 60 * 6}°。</small></div>}
    </main></div>
  </Workbench>;
};
export default ClockApp;
