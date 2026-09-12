import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Brain, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3, Flame,
  Gauge, GraduationCap, Home, ListChecks, Menu, Moon, Plus, Search, Settings,
  Sparkles, Target, Trophy, X, Zap, Trash2, RotateCcw
} from 'lucide-react';

type Subject = { name: string; code: string; mastery: number; topics: number; done: number; icon: string };
type Task = { id: number; subject: string; title: string; mins: number; why: string; type: string; done: boolean };
type Mistake = { id: number; subject: string; topic: string; why: string; repeats: number; date: string; resolved: boolean };
type Exam = { id: number; subject: string; name: string; date: string; topics: string };

const initialSubjects: Subject[] = [
  { name: 'Physics', code: '0625', mastery: 82, topics: 34, done: 28, icon: 'PHY' },
  { name: 'Chemistry', code: '0620', mastery: 58, topics: 36, done: 21, icon: 'CHEM' },
  { name: 'Mathematics', code: '', mastery: 88, topics: 42, done: 37, icon: 'MATH' },
  { name: 'English', code: '0500', mastery: 54, topics: 30, done: 16, icon: 'ENG' },
  { name: 'Computer Science', code: '0478', mastery: 71, topics: 31, done: 22, icon: 'CS' },
];
const initialTasks: Task[] = [
  { id: 1, subject: 'Chemistry', title: 'Atomic structure — exam questions', mins: 35, why: 'Weak topic + repeated mistakes', type: 'Practice', done: false },
  { id: 2, subject: 'English', title: 'Directed writing: improve your structure', mins: 30, why: 'High-priority weakness', type: 'Learn', done: false },
  { id: 3, subject: 'Physics', title: 'Forces & motion — mini test', mins: 25, why: 'Revision due today', type: 'Test', done: true },
];
const initialMistakes: Mistake[] = [
  { id: 1, subject: 'Chemistry', topic: 'Atomic structure — electron arrangement', why: 'Forgot the rule', repeats: 3, date: 'Sep 10', resolved: false },
  { id: 2, subject: 'English', topic: 'Formal letter — paragraph structure', why: 'Misunderstood the question', repeats: 2, date: 'Sep 9', resolved: false },
  { id: 3, subject: 'Computer Science', topic: 'Pseudocode — selection', why: 'Logic error', repeats: 1, date: 'Sep 8', resolved: true },
];
const initialExams: Exam[] = [{ id: 1, subject: 'Physics', name: 'Physics 0625', date: '2026-09-30', topics: 'Forces & motion, energy, waves' }];
const tone = (n: number) => n >= 85 ? 'strong' : n >= 50 ? 'mid' : 'weak';
const label = (n: number) => n >= 90 ? 'Mastered' : n >= 75 ? 'Strong' : n >= 60 ? 'Building' : 'Developing';
const store = 'mystudies-v3';

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(`${store}-${key}`); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function save<T>(key: string, value: T) { try { localStorage.setItem(`${store}-${key}`, JSON.stringify(value)); } catch { /* ignore */ } }

export default function App() {
  const [page, setPage] = useState('Home');
  const [dark, setDark] = useState(() => load('dark', false));
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [sessionTask, setSessionTask] = useState<Task | null>(null);
  const [subjects, setSubjects] = useState(() => load('subjects', initialSubjects));
  const [tasks, setTasks] = useState(() => load('tasks', initialTasks));
  const [mistakes, setMistakes] = useState(() => load('mistakes', initialMistakes));
  const [exams, setExams] = useState(() => load('exams', initialExams));
  const [xp, setXp] = useState(() => load('xp', 2140));

  useEffect(() => save('dark', dark), [dark]);
  useEffect(() => save('subjects', subjects), [subjects]);
  useEffect(() => save('tasks', tasks), [tasks]);
  useEffect(() => save('mistakes', mistakes), [mistakes]);
  useEffect(() => save('exams', exams), [exams]);
  useEffect(() => save('xp', xp), [xp]);

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? subjects.filter(s => `${s.name} ${s.code}`.toLowerCase().includes(q)) : subjects;
  }, [query, subjects]);
  const overall = Math.round(subjects.reduce((sum, s) => sum + s.mastery, 0) / subjects.length);
  const completedMins = tasks.filter(t => t.done).reduce((sum, t) => sum + t.mins, 0);
  const unresolved = mistakes.filter(m => !m.resolved).length;

  const nav = [
    ['Home', Home], ['Study', BookOpen], ['My Subjects', GraduationCap], ['Planner', CalendarDays],
    ['Mistakes', ListChecks], ['Progress', Gauge], ['AI Coach', Brain], ['Settings', Settings]
  ] as const;

  const openSession = (task: Task) => setSessionTask(task);
  const completeSession = () => {
    if (!sessionTask) return;
    setTasks(prev => prev.map(t => t.id === sessionTask.id ? { ...t, done: true } : t));
    setSubjects(prev => prev.map(s => s.name === sessionTask.subject ? { ...s, mastery: Math.min(100, s.mastery + 2), done: Math.min(s.topics, s.done + 1) } : s));
    setXp(v => v + 40);
    setSessionTask(null);
  };

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className={menu ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brandmark">M</div><div><b>MyStudies</b><span>Your study companion</span></div><button className="close" onClick={() => setMenu(false)}><X size={18}/></button></div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'active' : ''} onClick={() => { setPage(name); setMenu(false); }}><Icon size={18}/><span>{name}</span>{name === 'Mistakes' && unresolved > 0 && <em>{unresolved}</em>}</button>)}</nav>
      <div className="sideBottom"><div className="streak"><Flame size={17}/><div><b>{Math.max(1, Math.floor(xp / 180))} day streak</b><span>Keep it going</span></div></div><button className="profile" onClick={() => setPage('Settings')}><div className="avatar">I</div><span>Ibrahim</span><ChevronRight size={16}/></button></div>
    </aside>
    <main>
      <header><button className="hamb" onClick={() => setMenu(true)}><Menu/></button><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && query.trim()) setPage('My Subjects'); }} placeholder="Search subjects…"/><kbd>Ctrl K</kbd></div><button className="iconbtn" onClick={() => setDark(v => !v)}><Moon size={18}/></button><button className="avatar top" onClick={() => setPage('Settings')}>I</button></header>
      {page === 'Home' && <HomePage subjects={subjects} tasks={tasks} overall={overall} completedMins={completedMins} xp={xp} openSession={openSession}/>} 
      {page === 'Study' && <Study tasks={tasks} openSession={openSession}/>} 
      {page === 'My Subjects' && <SubjectsPage items={filteredSubjects} openSession={openSession} onAdd={() => setSubjects(prev => [...prev, { name: `Subject ${prev.length + 1}`, code: '', mastery: 0, topics: 0, done: 0, icon: 'NEW' }])}/>} 
      {page === 'Planner' && <Planner tasks={tasks} exams={exams} setTasks={setTasks} setExams={setExams}/>} 
      {page === 'Mistakes' && <Mistakes mistakes={mistakes} setMistakes={setMistakes} openSession={openSession}/>} 
      {page === 'Progress' && <Progress subjects={subjects} overall={overall} xp={xp}/>} 
      {page === 'AI Coach' && <Coach subjects={subjects} mistakes={mistakes} tasks={tasks} openSession={openSession}/>} 
      {page === 'Settings' && <SettingsPage dark={dark} setDark={setDark} setTasks={setTasks} setSubjects={setSubjects} setMistakes={setMistakes} setExams={setExams} setXp={setXp}/>} 
    </main>
    {sessionTask && <Session task={sessionTask} onClose={() => setSessionTask(null)} onComplete={completeSession}/>} 
  </div>;
}

function HomePage({ subjects, tasks, overall, completedMins, xp, openSession }: { subjects: Subject[]; tasks: Task[]; overall: number; completedMins: number; xp: number; openSession: (task: Task) => void }) {
  const next = tasks.find(t => !t.done) ?? tasks[0];
  return <section className="page">
    <div className="welcome"><div><p className="eyebrow">SATURDAY · SEPTEMBER 12</p><h1>Good afternoon, Ibrahim.</h1><p className="muted">Your plan is ready. Let’s make today count.</p></div><div className="score"><div className="ring"><strong>{overall}</strong><span>/100</span></div><div><b>Study health</b><span className="up">↑ 6% this week</span></div></div></div>
    <div className="hero"><div><div className="pill"><Sparkles size={15}/> AI recommendation</div><h2>What should I study?</h2><p>{next.subject} → {next.title} is the highest-impact next step from your current data.</p><button className="primary" onClick={() => openSession(next)}>Start recommended session <ChevronRight size={18}/></button></div><div className="heroOrb"><Brain size={48}/><span>Next best<br/>action</span></div></div>
    <div className="grid3"><Metric icon={<Target/>} label="Daily target" value={`${completedMins} / 120 min`} progress={Math.min(100, Math.round(completedMins / 120 * 100))}/><Metric icon={<Flame/>} label="Streak" value="12 days" note="Keep it alive"/><Metric icon={<Zap/>} label="XP" value={`+${Math.max(0, xp - 2140)} XP`} note={`${xp} total XP`}/></div>
    <div className="sectionHead"><div><h3>Needs attention</h3><p>Weak areas rise to the top automatically.</p></div></div>
    <div className="attention">{subjects.filter(s => s.mastery < 75).map(s => <button className="attentionRow" key={s.name} onClick={() => openSession({ id: 8000 + s.mastery, subject: s.name, title: `${s.name} weak-topic practice`, mins: 25, why: 'Low mastery', type: 'Practice', done: false })}><div className="subjectDot">{s.name[0]}</div><div className="grow"><b>{s.name}</b><span>{label(s.mastery)} · {s.done}/{s.topics} topics</span></div><div className={`miniScore ${tone(s.mastery)}`}>{s.mastery}%</div><ChevronRight size={17}/></button>)}</div>
    <div className="sectionHead"><div><h3>Today</h3><p>Completing a session actually changes your progress.</p></div></div>
    <div className="tasks">{tasks.map((t, i) => <button className="task" key={t.id} onClick={() => openSession(t)}><div className="taskTime">{t.done ? <CheckCircle2 size={15}/> : <Clock3 size={15}/>} {t.mins}m</div><div className="grow"><span className="tag">{t.subject} · {t.type}</span><b>{t.title}</b><small>{t.done ? 'Completed' : t.why}</small></div><div className="taskNum">0{i + 1}</div><ChevronRight size={18}/></button>)}</div>
  </section>;
}
function Metric({ icon, label, value, progress, note }: { icon: React.ReactNode; label: string; value: string; progress?: number; note?: string }) { return <div className="metric"><div className="metricIcon">{icon}</div><span>{label}</span><strong>{value}</strong>{progress !== undefined ? <div className="bar"><i style={{ width: `${progress}%` }}/></div> : <small>{note}</small>}</div>; }

function SubjectsPage({ items, openSession, onAdd }: { items: Subject[]; openSession: (task: Task) => void; onAdd: () => void }) {
  return <section className="page"><div className="pageTitle"><div><p className="eyebrow">YOUR SYLLABUS</p><h1>My Subjects</h1><p className="muted">Study a subject and your mastery changes instead of staying fake.</p></div><button className="primary small" onClick={onAdd}><Plus size={17}/> Add subject</button></div><div className="subjectGrid">{items.map(s => <div className="subjectCard" key={s.name}><div className="subjectTop"><div className="subjectIcon">{s.icon}</div><span className={`status ${tone(s.mastery)}`}>{label(s.mastery)}</span></div><h3>{s.name}</h3><p>{s.code || 'Core syllabus'} · {s.done}/{s.topics} topics covered</p><div className="mastery"><div><span>Mastery</span><b>{s.mastery}%</b></div><div className="bar"><i style={{ width: `${s.mastery}%` }}/></div></div><button className="outline" onClick={() => openSession({ id: 9000 + s.mastery, subject: s.name, title: `${s.name} focused practice`, mins: 25, why: 'Recommended from mastery', type: 'Practice', done: false })}>Continue studying <ChevronRight size={16}/></button></div>)}</div>{items.length === 0 && <div className="empty">No subjects match your search.</div>}</section>;
}

function Planner({ tasks, exams, setTasks, setExams }: { tasks: Task[]; exams: Exam[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; setExams: React.Dispatch<React.SetStateAction<Exam[]>> }) {
  const [tab, setTab] = useState('Today'); const [showTask, setShowTask] = useState(false); const [showExam, setShowExam] = useState(false);
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState('Chemistry'); const [mins, setMins] = useState('30');
  const [examName, setExamName] = useState(''); const [examDate, setExamDate] = useState('2026-10-10');
  const addTask = (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; setTasks(p => [...p, { id: Date.now(), subject, title: title.trim(), mins: Math.max(5, Number(mins) || 30), why: 'Added by you', type: 'Study', done: false }]); setTitle(''); setShowTask(false); };
  const addExam = (e: FormEvent) => { e.preventDefault(); if (!examName.trim()) return; setExams(p => [...p, { id: Date.now(), subject, name: examName.trim(), date: examDate, topics: 'Add topic details later' }]); setExamName(''); setShowExam(false); };
  return <section className="page"><div className="pageTitle"><div><p className="eyebrow">PLAN</p><h1>Planner</h1><p className="muted">Tasks and exams persist after refresh.</p></div><div className="titleActions"><button className="outline" onClick={() => setShowExam(true)}>+ Exam</button><button className="primary small" onClick={() => setShowTask(true)}><Plus size={17}/> Add task</button></div></div>
    <div className="tabs">{['Today','This Week','Upcoming','Homework','Exams'].map(t => <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Exams' ? <div className="examList">{exams.map(x => { const days = Math.max(0, Math.ceil((new Date(x.date).getTime() - Date.now()) / 86400000)); return <div className="exam" key={x.id}><div className="examIcon"><GraduationCap/></div><div className="grow"><span>UPCOMING EXAM · {x.subject.toUpperCase()}</span><b>{x.name}</b><small>{days} days left · {x.topics}</small></div><button className="dots" onClick={() => setExams(p => p.filter(e => e.id !== x.id))}><Trash2 size={16}/></button></div>})}<button className="addLine" onClick={() => setShowExam(true)}><Plus size={16}/> Add an exam</button></div> : <><div className="plannerDate"><h3>Saturday, Sep 12</h3><span>120 min target · {tasks.reduce((a,t) => a + t.mins,0)} min planned</span></div>{tasks.map(t => <div className="planRow" key={t.id}><button className="planCheck" onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}>{t.done ? <CheckCircle2 size={19}/> : <div/>}</button><div className="grow"><span>{t.subject} · {t.type}</span><b className={t.done ? 'doneText' : ''}>{t.title}</b></div><strong>{t.mins} min</strong><button className="dots" onClick={() => setTasks(p => p.filter(x => x.id !== t.id))}><Trash2 size={16}/></button></div>)}<button className="addLine" onClick={() => setShowTask(true)}><Plus size={16}/> Add a task or study block</button></>}
    {showTask && <FormModal title="Add study task" onClose={() => setShowTask(false)} onSubmit={addTask}><label>Task<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chemistry bonding questions"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}>{['Physics','Chemistry','Mathematics','English','Computer Science'].map(x => <option key={x}>{x}</option>)}</select></label><label>Minutes<input type="number" min="5" max="300" value={mins} onChange={e => setMins(e.target.value)}/></label><button className="primary" type="submit">Add task</button></FormModal>}
    {showExam && <FormModal title="Add exam" onClose={() => setShowExam(false)} onSubmit={addExam}><label>Exam name<input autoFocus value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Chemistry 0620"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}>{['Physics','Chemistry','Mathematics','English','Computer Science'].map(x => <option key={x}>{x}</option>)}</select></label><label>Date<input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}/></label><button className="primary" type="submit">Add exam</button></FormModal>}
  </section>;
}
function FormModal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: FormEvent) => void; children: React.ReactNode }) { return <div className="modal"><form className="session formCard" onSubmit={onSubmit}><header><div><b>{title}</b><span>Saved locally</span></div><button className="close" type="button" onClick={onClose}><X/></button></header><div className="formBody">{children}</div></form></div>; }

function Mistakes({ mistakes, setMistakes, openSession }: { mistakes: Mistake[]; setMistakes: React.Dispatch<React.SetStateAction<Mistake[]>>; openSession: (task: Task) => void }) {
  const [filter, setFilter] = useState('All'); const shown = mistakes.filter(m => filter === 'All' || (filter === 'Unresolved' && !m.resolved) || (filter === 'Repeated' && m.repeats > 1));
  return <section className="page"><div className="pageTitle"><div><p className="eyebrow">LEARN FROM ERRORS</p><h1>Mistake Bank</h1><p className="muted">Resolved mistakes stop dominating recommendations.</p></div></div><div className="filterbar">{['All','Unresolved','Repeated'].map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>{shown.map(m => <div className="mistake" key={m.id}><span className={`tag ${m.subject === 'Chemistry' ? 'chem' : 'eng'}`}>{m.subject}</span><h3>{m.topic}</h3><p>Why it went wrong: <b>{m.why}</b></p><div className="mistakeBottom"><span>{m.repeats}× · {m.date} · {m.resolved ? 'Resolved' : 'Unresolved'}</span><div><button className="outline" onClick={() => openSession({ id: 7000 + m.id, subject: m.subject, title: `Review: ${m.topic}`, mins: 20, why: 'Saved mistake', type: 'Review', done: false })}>Review <ChevronRight size={15}/></button>{!m.resolved && <button className="iconbtn" onClick={() => setMistakes(p => p.map(x => x.id === m.id ? { ...x, resolved: true } : x))}><CheckCircle2 size={16}/></button>}</div></div></div>)}{shown.length === 0 && <div className="empty">Nothing here. Good work.</div>}</section>;
}

function Progress({ subjects, overall, xp }: { subjects: Subject[]; overall: number; xp: number }) { return <section className="page"><div className="pageTitle"><div><p className="eyebrow">YOUR PERFORMANCE</p><h1>Progress</h1><p className="muted">This is connected to your study activity.</p></div></div><div className="progressHero"><div><span>Overall mastery</span><strong>{overall}%</strong><p className="up">↑ 8% over the last 30 days</p></div><div className="bars">{subjects.map(s => <div key={s.name}><span>{s.name}</span><div className="bar"><i style={{ width: `${s.mastery}%` }}/></div><b>{s.mastery}%</b></div>)}</div></div><div className="insights"><div><Sparkles/><b>AI insight</b><p>Your lower-mastery subjects are prioritized first. Chemistry and English are currently the best opportunities for improvement.</p></div><div><Trophy/><b>Level {Math.max(1, Math.floor(xp / 250))}</b><p>{xp} XP earned · {250 - (xp % 250)} XP to next level.</p></div></div></section>; }

function Coach({ subjects, mistakes, tasks, openSession }: { subjects: Subject[]; mistakes: Mistake[]; tasks: Task[]; openSession: (task: Task) => void }) {
  const [msg, setMsg] = useState(''); const [reply, setReply] = useState('');
  const next = tasks.find(t => !t.done) ?? { id: 999, subject: 'Chemistry', title: 'Atomic structure practice', mins: 25, why: 'Lowest mastery', type: 'Practice', done: false };
  const send = (e?: FormEvent) => { e?.preventDefault(); if (!msg.trim()) return; const q = msg.toLowerCase(); let r = `Start with ${next.subject} → ${next.title}.`; if (q.includes('30')) r = 'You have 30 minutes: do one focused concept review, then exam questions. Don’t waste the block rereading everything.'; if (q.includes('chem')) r = `Chemistry is at ${subjects.find(s => s.name === 'Chemistry')?.mastery ?? 0}% with ${mistakes.filter(m => m.subject === 'Chemistry' && !m.resolved).length} unresolved mistakes.`; if (q.includes('english')) r = `English is at ${subjects.find(s => s.name === 'English')?.mastery ?? 0}%. Focus on writing structure and question interpretation.`; setReply(r); setMsg(''); };
  return <section className="page coach"><div className="coachHead"><div className="coachLogo"><Brain/></div><p className="eyebrow">YOUR AI STUDY COACH</p><h1>Let’s figure it out.</h1><p className="muted">This coach is connected to your current MyStudies data.</p></div><div className="suggestions">{['What should I study now?','Why am I struggling with Chemistry?','I only have 30 minutes.','Help with English.'].map(q => <button key={q} onClick={() => setMsg(q)}>{q}</button>)}</div><div className="chat"><div className="bubble ai"><Sparkles size={15}/><span>{reply || <>Your current best move is <b>{next.subject} → {next.title}</b>.</>}</span></div><form className="chatInput" onSubmit={send}><input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ask your coach…"/><button className="primary" type="submit">Send</button></form><button className="outline coachAction" onClick={() => openSession(next)}>Start recommended session <ChevronRight size={16}/></button></div></section>;
}

function Study({ tasks, openSession }: { tasks: Task[]; openSession: (task: Task) => void }) { const next = tasks.find(t => !t.done) ?? tasks[0]; return <section className="page"><div className="pageTitle"><div><p className="eyebrow">STUDY</p><h1>Choose your next session</h1><p className="muted">Everything below opens a real study session.</p></div></div><div className="studyOptions"><div className="bigStudy"><Sparkles/><h2>Recommended for you</h2><h3>{next.subject} · {next.title}</h3><p>{next.mins} min · based on your current data</p><button className="primary" onClick={() => openSession(next)}>Start session <ChevronRight/></button></div><div className="studyList"><button onClick={() => openSession({ id: 8101, subject: 'Chemistry', title: 'Practice weak topics', mins: 25, why: 'Lowest mastery', type: 'Practice', done: false })}><Target/><span><b>Practice weak topics</b><small>Improve mastery quickly</small></span><ChevronRight/></button><button onClick={() => openSession({ id: 8102, subject: 'Mistake Bank', title: 'Review repeated mistakes', mins: 20, why: 'Repeated mistakes', type: 'Review', done: false })}><ListChecks/><span><b>Review mistake bank</b><small>Turn mistakes into marks</small></span><ChevronRight/></button><button onClick={() => openSession({ id: 8103, subject: 'Physics', title: 'Physics exam prep', mins: 30, why: 'Exam coming up', type: 'Exam Prep', done: false })}><GraduationCap/><span><b>Exam prep</b><small>Build readiness before the deadline</small></span><ChevronRight/></button></div></div></section>; }

function SettingsPage({ dark, setDark, setTasks, setSubjects, setMistakes, setExams, setXp }: { dark: boolean; setDark: (v: boolean) => void; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>; setMistakes: React.Dispatch<React.SetStateAction<Mistake[]>>; setExams: React.Dispatch<React.SetStateAction<Exam[]>>; setXp: React.Dispatch<React.SetStateAction<number>> }) { const [target, setTarget] = useState(() => load('target', 120)); const [saved, setSaved] = useState(false); const saveTarget = () => { save('target', target); setSaved(true); setTimeout(() => setSaved(false), 900); }; const reset = () => { setTasks(initialTasks); setSubjects(initialSubjects); setMistakes(initialMistakes); setExams(initialExams); setXp(2140); setTarget(120); save('target', 120); }; return <section className="page"><div className="pageTitle"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="muted">Core data is saved in this browser for now.</p></div></div><div className="settings"><div><b>Appearance</b><span>Choose your preferred interface theme.</span><button className="toggle" onClick={() => setDark(!dark)}><i className={dark ? 'on' : ''}/>{dark ? 'Dark mode' : 'Light mode'}</button></div><div><b>Daily study target</b><span>Used when planning your day.</span><div className="inlineEdit"><input type="number" min="15" max="600" value={target} onChange={e => setTarget(Number(e.target.value) || 120)}/><span>min</span><button className="outline" onClick={saveTarget}>{saved ? 'Saved' : 'Save'}</button></div></div><div><b>Reset demo data</b><span>Restore the original sample so you can test the app cleanly.</span><button className="outline" onClick={reset}><RotateCcw size={15}/> Reset demo data</button></div></div></section>; }

function Session({ task, onClose, onComplete }: { task: Task; onClose: () => void; onComplete: () => void }) { const [step, setStep] = useState(1); const [answer, setAnswer] = useState(''); const [checked, setChecked] = useState(false); const steps = ['Learn','Recall','Mini-test']; return <div className="modal"><div className="session"><header><div><span className="tag">{task.subject}</span><h3>{task.title}</h3></div><button className="close" onClick={onClose}><X/></button></header><div className="sessionSteps">{steps.map((s,i) => <span key={s} className={step >= i + 1 ? 'active' : ''}>{i + 1}. {s}</span>)}</div><div className="sessionBody">{step === 1 && <><p className="eyebrow">LEARN</p><h2>Understand before you memorize.</h2><p>Study one small idea. Then close the notes and explain it in your own words.</p><div className="lessonBox"><b>Rule for this session</b><p>Do active recall after every short block. The goal is usable understanding, not just reading.</p></div></>}{step === 2 && <><p className="eyebrow">ACTIVE RECALL</p><h2>Explain it yourself.</h2><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write the idea in your own words…"/><small>{answer.length} characters</small></>}{step === 3 && <><p className="eyebrow">MINI-TEST</p><h2>One final check.</h2><p>Write what you would most likely forget on an exam, then check your response.</p><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer…"/>{checked && <div className="lessonBox"><b>Recorded.</b><p>Your session is ready to be completed.</p></div>}</>}</div><footer>{step > 1 ? <button className="outline" onClick={() => setStep(step - 1)}>Back</button> : <span/>}{step < 3 ? <button className="primary" disabled={step === 2 && answer.trim().length < 8} onClick={() => setStep(step + 1)}>Continue <ChevronRight size={17}/></button> : <>{!checked && <button className="outline" onClick={() => setChecked(true)}>Check</button>}<button className="primary" disabled={!checked} onClick={onComplete}>Complete session <CheckCircle2 size={17}/></button></>}</footer></div></div>; }
