import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, BarChart3, BookOpen, Brain, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleAlert, Clock3, FileUp, Flame, Gauge, GraduationCap, Home,
  ListChecks, Menu, Moon, MoreHorizontal, Play, Plus, RotateCcw, Search, Settings,
  Sparkles, Target, Trash2, Trophy, Upload, X, Zap
} from 'lucide-react';

type Subject = { id:string; name:string; code:string; mastery:number; topics:number; done:number; accent:string };
type Topic = { id:string; subject:string; unit:string; name:string; status:string; mastery:number };
type Task = { id:number; subject:string; title:string; mins:number; type:string; why:string; done:boolean; date:string };
type Mistake = { id:number; subject:string; topic:string; prompt:string; answer:string; why:string; repeats:number; resolved:boolean; date:string };
type Exam = { id:number; subject:string; name:string; date:string; topics:string };
type SessionStage = 'learn' | 'recall' | 'practice' | 'result';

type Lesson = { topic:string; learn:string; recall:string; question:string; answer:string; tip:string; choices?:string[] };
const lessons:Record<string,Lesson> = {
  Physics:{topic:'Forces & motion',learn:'A resultant force changes an object’s motion. For the same mass, more resultant force means more acceleration.',recall:'State Newton’s second law and explain what happens to acceleration when force increases.',question:'A 4 kg object has a resultant force of 12 N. What is its acceleration?',answer:'3 m/s²',tip:'Use F = ma, then rearrange to a = F ÷ m.',choices:['3 m/s²','8 m/s²','48 m/s²','0.33 m/s²']},
  Chemistry:{topic:'Atomic structure',learn:'Atoms contain protons and neutrons in the nucleus, with electrons around the nucleus. The proton number identifies the element.',recall:'Give the relative charge of a proton, neutron and electron.',question:'A neutral atom has 11 protons. How many electrons does it have?',answer:'11 electrons',tip:'A neutral atom has equal numbers of protons and electrons.',choices:['1 electron','11 electrons','22 electrons','0 electrons']},
  Mathematics:{topic:'Algebra & equations',learn:'An equation is balanced. Whatever operation you use on one side, use the same operation on the other side.',recall:'Why must the same operation be applied to both sides of an equation?',question:'Solve 3x + 5 = 20.',answer:'x = 5',tip:'Subtract 5 first, then divide by 3.',choices:['x = 3','x = 5','x = 15','x = 25']},
  English:{topic:'Directed writing',learn:'Strong directed writing completes the task, matches audience and purpose, uses an appropriate tone, and organizes ideas clearly.',recall:'Name two things you should check before writing a directed-writing response.',question:'Which opening is most appropriate for a formal request to a school principal?',answer:'I am writing to request that the school consider…',tip:'For formal writing, make the purpose clear and keep the tone respectful.',choices:['Yo, I need you to change this.','I am writing to request that the school consider…','Hey principal, what’s up?','This is kinda annoying so fix it.']},
  'Computer Science':{topic:'Pseudocode — selection',learn:'Selection lets a program choose between paths. IF tests a condition; ELSE handles the alternative.',recall:'Explain the difference between IF and ELSE in a program.',question:'Write pseudocode that outputs PASS when mark is 50 or higher, otherwise FAIL.',answer:'IF mark >= 50 THEN OUTPUT "PASS" ELSE OUTPUT "FAIL"',tip:'Start with the condition, then explicitly handle the alternative.',choices:['IF mark >= 50 THEN OUTPUT "PASS" ELSE OUTPUT "FAIL"','OUTPUT PASS always','LOOP mark >= 50','INPUT PASS']}
};

const seedSubjects:Subject[] = [
  {id:'physics',name:'Physics',code:'0625',mastery:82,topics:34,done:28,accent:'sage'},
  {id:'chemistry',name:'Chemistry',code:'0620',mastery:58,topics:36,done:21,accent:'gold'},
  {id:'maths',name:'Mathematics',code:'',mastery:88,topics:42,done:37,accent:'blue'},
  {id:'english',name:'English',code:'0500',mastery:54,topics:30,done:16,accent:'violet'},
  {id:'cs',name:'Computer Science',code:'0478',mastery:71,topics:31,done:22,accent:'green'}
];
const seedTopics:Topic[] = [
  {id:'p1',subject:'Physics',unit:'Mechanics',name:'Forces & motion',status:'Strong',mastery:82},
  {id:'p2',subject:'Physics',unit:'Mechanics',name:'Energy, work & power',status:'Building',mastery:68},
  {id:'p3',subject:'Physics',unit:'Waves',name:'Wave properties',status:'Strong',mastery:79},
  {id:'c1',subject:'Chemistry',unit:'Particles',name:'Atomic structure',status:'Developing',mastery:48},
  {id:'c2',subject:'Chemistry',unit:'Particles',name:'Bonding',status:'Developing',mastery:57},
  {id:'c3',subject:'Chemistry',unit:'Quantitative chemistry',name:'Moles & equations',status:'Building',mastery:63},
  {id:'m1',subject:'Mathematics',unit:'Algebra',name:'Algebra & equations',status:'Strong',mastery:91},
  {id:'m2',subject:'Mathematics',unit:'Geometry',name:'Angles & polygons',status:'Strong',mastery:84},
  {id:'e1',subject:'English',unit:'Writing',name:'Directed writing',status:'Developing',mastery:54},
  {id:'e2',subject:'English',unit:'Reading',name:'Writer’s effect',status:'Developing',mastery:49},
  {id:'e3',subject:'English',unit:'Writing',name:'Composition',status:'Building',mastery:62},
  {id:'cs1',subject:'Computer Science',unit:'Algorithms',name:'Pseudocode — selection',status:'Building',mastery:71},
  {id:'cs2',subject:'Computer Science',unit:'Programming',name:'Iteration',status:'Developing',mastery:56}
];
const today = () => new Date().toISOString().slice(0,10);
const seedTasks:Task[] = [
  {id:1,subject:'Chemistry',title:'Atomic structure — exam questions',mins:35,type:'Practice',why:'Weak topic + repeated mistakes',done:false,date:today()},
  {id:2,subject:'English',title:'Directed writing — structure',mins:30,type:'Learn',why:'High-priority weakness',done:false,date:today()},
  {id:3,subject:'Physics',title:'Forces & motion — mini test',mins:25,type:'Test',why:'Revision due today',done:false,date:today()},
  {id:4,subject:'Computer Science',title:'Pseudocode selection',mins:20,type:'Practice',why:'Recent logic errors',done:false,date:today()}
];
const seedMistakes:Mistake[] = [
  {id:1,subject:'Chemistry',topic:'Atomic structure',prompt:'Neutral atom with 11 protons',answer:'11 electrons',why:'Forgot the rule',repeats:3,resolved:false,date:today()},
  {id:2,subject:'English',topic:'Directed writing',prompt:'Formal request opening',answer:'Use a clear formal opening',why:'Tone mismatch',repeats:2,resolved:false,date:today()},
  {id:3,subject:'Computer Science',topic:'Pseudocode — selection',prompt:'IF / ELSE logic',answer:'Handle both paths',why:'Logic error',repeats:1,resolved:true,date:today()}
];
const seedExams:Exam[] = [{id:1,subject:'Physics',name:'Physics 0625 mock',date:'2026-09-30',topics:'Forces & motion, energy, waves'}];

const KEY='mystudies-v8';
function load<T>(name:string,fallback:T):T { try { const raw=localStorage.getItem(`${KEY}-${name}`); return raw?JSON.parse(raw):fallback; } catch { return fallback; } }
function usePersist<T>(name:string,value:T,setter?:React.Dispatch<React.SetStateAction<T>>) { useEffect(()=>{try{localStorage.setItem(`${KEY}-${name}`,JSON.stringify(value))}catch{}},[name,value]); }
function status(n:number){return n>=90?'Mastered':n>=75?'Strong':n>=60?'Building':'Developing'}
function tone(n:number){return n>=85?'strong':n>=50?'mid':'weak'}
function dateLabel(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}

export default function App(){
  const [page,setPage]=useState('Home');
  const [dark,setDark]=useState(()=>load('dark',false));
  const [subjects,setSubjects]=useState<Subject[]>(()=>load('subjects',seedSubjects));
  const [topics,setTopics]=useState<Topic[]>(()=>load('topics',seedTopics));
  const [tasks,setTasks]=useState<Task[]>(()=>load('tasks',seedTasks));
  const [mistakes,setMistakes]=useState<Mistake[]>(()=>load('mistakes',seedMistakes));
  const [exams,setExams]=useState<Exam[]>(()=>load('exams',seedExams));
  const [xp,setXp]=useState(()=>load('xp',2140));
  const [target,setTarget]=useState(()=>load('target',120));
  const [streak,setStreak]=useState(()=>load('streak',12));
  const [query,setQuery]=useState('');
  const [menu,setMenu]=useState(false);
  const [selectedSubject,setSelectedSubject]=useState<string>('Physics');
  const [session,setSession]=useState<{subject:string;title:string;stage:SessionStage;picked?:string;correct?:boolean}|null>(null);
  const [quickOpen,setQuickOpen]=useState(false);
  const [toast,setToast]=useState('');
  usePersist('dark',dark);usePersist('subjects',subjects);usePersist('topics',topics);usePersist('tasks',tasks);usePersist('mistakes',mistakes);usePersist('exams',exams);usePersist('xp',xp);usePersist('target',target);usePersist('streak',streak);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(t)}},[toast]);

  const overall=Math.round(subjects.reduce((sum,s)=>sum+s.mastery,0)/Math.max(1,subjects.length));
  const doneMins=tasks.filter(t=>t.done&&t.date===today()).reduce((a,t)=>a+t.mins,0);
  const unresolved=mistakes.filter(m=>!m.resolved).length;
  const weak=[...subjects].sort((a,b)=>a.mastery-b.mastery)[0];
  const upcoming=[...exams].sort((a,b)=>a.date.localeCompare(b.date))[0];
  const filteredSubjects=subjects.filter(s=>`${s.name} ${s.code}`.toLowerCase().includes(query.trim().toLowerCase()));

  const openSession=(subject:string,title?:string)=>{setSelectedSubject(subject);const lesson=lessons[subject];setSession({subject,title:title||lesson?.topic||'Study topic',stage:'learn'});};
  const completeSession=()=>{
    if(!session)return;
    const subject=session.subject;
    const wasCorrect=session.correct!==false;
    setSubjects(prev=>prev.map(s=>s.name===subject?{...s,mastery:Math.min(100,s.mastery+(wasCorrect?3:1)),done:Math.min(s.topics,s.done+1)}:s));
    setTopics(prev=>prev.map(t=>t.subject===subject&&t.name===lessons[subject]?.topic?{...t,mastery:Math.min(100,t.mastery+(wasCorrect?3:1)),status:status(Math.min(100,t.mastery+(wasCorrect?3:1)))}:t));
    if(!wasCorrect){const l=lessons[subject];setMistakes(prev=>[{id:Date.now(),subject,topic:l.topic,prompt:l.question,answer:l.answer,why:'Needs another attempt',repeats:1,resolved:false,date:today()},...prev]);}
    setXp(x=>x+60);setToast(`${subject} session complete · +60 XP`);setSession(null);
  };
  const resetAll=()=>{setSubjects(seedSubjects);setTopics(seedTopics);setTasks(seedTasks);setMistakes(seedMistakes);setExams(seedExams);setXp(2140);setStreak(12);setTarget(120);setToast('Demo data reset');};

  const nav:[string,typeof Home][]=[['Home',Home],['Study',BookOpen],['My Subjects',GraduationCap],['Planner',CalendarDays],['Mistakes',ListChecks],['Progress',Gauge],['AI Coach',Brain],['Settings',Settings]];
  return <div className={dark?'app dark':'app'}>
    <aside className={menu?'sidebar open':'sidebar'}>
      <div className="brand"><div className="brandmark">M</div><div><b>MyStudies</b><span>Study with a system</span></div><button className="close" onClick={()=>setMenu(false)}><X size={18}/></button></div>
      <div className="navLabel">WORKSPACE</div>
      <nav>{nav.map(([name,Icon])=><button key={name} className={page===name?'active':''} onClick={()=>{setPage(name);setMenu(false)}}><Icon size={18}/><span>{name}</span>{name==='Mistakes'&&unresolved>0?<em>{unresolved}</em>:null}</button>)}</nav>
      <div className="sideBottom">
        <div className="streakBox"><div className="streakIcon"><Flame size={16}/></div><div><b>{streak} day streak</b><span>{doneMins}/{target} min today</span></div><ChevronRight size={14}/></div>
        <button className="profile" onClick={()=>setPage('Settings')}><div className="avatar">I</div><span>Ibrahim</span><MoreHorizontal size={16}/></button>
      </div>
    </aside>

    <main>
      <header>
        <button className="hamb" onClick={()=>setMenu(true)}><Menu size={20}/></button>
        <div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setQuickOpen(true)} onKeyDown={e=>{if(e.key==='Enter'&&query.trim()){setPage('My Subjects');setQuickOpen(false)}}} placeholder="Search subjects, topics, mistakes…"/><kbd>⌘ K</kbd></div>
        <button className="headerAction" onClick={()=>setQuickOpen(v=>!v)}><Sparkles size={17}/><span>Ask coach</span></button>
        <button className="iconbtn" onClick={()=>setDark(v=>!v)} title="Toggle theme"><Moon size={17}/></button><button className="avatar top" onClick={()=>setPage('Settings')}>I</button>
        {quickOpen&&<QuickSearch query={query} weak={weak} onClose={()=>setQuickOpen(false)} onStart={openSession} onPage={setPage}/>} 
      </header>

      {page==='Home'&&<HomePage subjects={subjects} tasks={tasks} mistakes={mistakes} overall={overall} doneMins={doneMins} target={target} streak={streak} xp={xp} upcoming={upcoming} openSession={openSession} setPage={setPage}/>} 
      {page==='Study'&&<StudyPage subjects={subjects} topics={topics} tasks={tasks} selected={selectedSubject} setSelected={setSelectedSubject} openSession={openSession}/>} 
      {page==='My Subjects'&&<SubjectsPage subjects={filteredSubjects} topics={topics} setTopics={setTopics} setSubjects={setSubjects} openSession={openSession} query={query}/>} 
      {page==='Planner'&&<PlannerPage tasks={tasks} setTasks={setTasks} exams={exams} setExams={setExams} setToast={setToast}/>} 
      {page==='Mistakes'&&<MistakesPage mistakes={mistakes} setMistakes={setMistakes} openSession={openSession}/>} 
      {page==='Progress'&&<ProgressPage subjects={subjects} topics={topics} overall={overall} xp={xp} doneMins={doneMins} target={target}/>} 
      {page==='AI Coach'&&<CoachPage subjects={subjects} mistakes={mistakes} tasks={tasks} exams={exams} openSession={openSession}/>} 
      {page==='Settings'&&<SettingsPage dark={dark} setDark={setDark} target={target} setTarget={setTarget} subjects={subjects} setSubjects={setSubjects} topics={topics} setTopics={setTopics} reset={resetAll} setToast={setToast}/>} 
    </main>

    {session&&<SessionModal session={session} setSession={setSession} complete={completeSession}/>} 
    {toast&&<div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
  </div>;
}

function HomePage({subjects,tasks,mistakes,overall,doneMins,target,streak,xp,upcoming,openSession,setPage}:{subjects:Subject[];tasks:Task[];mistakes:Mistake[];overall:number;doneMins:number;target:number;streak:number;xp:number;upcoming?:Exam;openSession:(s:string,t?:string)=>void;setPage:(p:string)=>void}){
  const next=tasks.find(t=>!t.done)||{subject:subjects[0]?.name||'Physics',title:lessons[subjects[0]?.name||'Physics'].topic,mins:25,why:'Start a focused session',type:'Study',done:false,id:0,date:today()};
  const pct=Math.min(100,Math.round(doneMins/Math.max(target,1)*100));
  const attention=[...subjects].sort((a,b)=>a.mastery-b.mastery).slice(0,3);
  return <section className="page">
    <div className="homeTop"><div><div className="eyebrow">SATURDAY · {dateLabel(today()).toUpperCase()}</div><h1>Good afternoon, Ibrahim.</h1><p className="muted">You don't need to plan your study. MyStudies already did.</p></div><div className="health"><div className="healthRing" style={{'--p':`${overall*3.6}deg`} as React.CSSProperties}><b>{overall}</b><span>/100</span></div><div><b>Study health</b><span className="up">↑ 6% this week</span></div></div></div>

    <div className="commandHero">
      <div className="heroGlow"></div><div className="heroCopy"><div className="eyebrow light">YOUR NEXT BEST ACTION</div><h2>{next.subject} <span>·</span> {next.title}</h2><p>{next.mins} minutes · {next.type} · <strong>{next.why}</strong></p><div className="heroActions"><button className="primary xl" onClick={()=>openSession(next.subject,next.title)}><Play size={17} fill="currentColor"/> Start session</button><button className="heroGhost" onClick={()=>setPage('Planner')}>View plan <ArrowRight size={16}/></button></div></div><div className="heroSide"><div className="coachOrb"><Brain size={28}/></div><span>Adaptive<br/>recommendation</span></div>
    </div>

    <div className="signalRow"><div className="signal"><Target/><div><span>Today</span><b>{doneMins}/{target} min</b></div><div className="miniBar"><i style={{width:`${pct}%`}}/></div></div><div className="signal"><Flame/><div><span>Streak</span><b>{streak} days</b></div><small>protect it today</small></div><div className="signal"><Zap/><div><span>Level</span><b>{Math.floor(xp/500)+1}</b></div><small>{xp} XP</small></div><div className="signal"><CircleAlert/><div><span>Attention</span><b>{mistakes.filter(m=>!m.resolved).length} mistakes</b></div><small>still unresolved</small></div></div>

    <div className="sectionHead"><div><h3>Needs attention</h3><p>The lowest mastery gets priority.</p></div><button className="linkBtn" onClick={()=>setPage('My Subjects')}>Open subjects <ChevronRight size={14}/></button></div>
    <div className="priorityGrid">{attention.map(s=><button className="priority" key={s.id} onClick={()=>openSession(s.name)}><div className={`subjectGlyph ${s.accent}`}>{s.name.slice(0,2).toUpperCase()}</div><div className="grow"><b>{s.name}</b><span>{status(s.mastery)} · {s.done}/{s.topics} topics</span></div><strong className={tone(s.mastery)}>{s.mastery}%</strong><ChevronRight size={16}/></button>)}</div>

    <div className="twoCol"><div><div className="sectionHead"><div><h3>Today</h3><p>Everything that matters today.</p></div><button className="linkBtn" onClick={()=>setPage('Planner')}>Planner <ChevronRight size={14}/></button></div><div className="listPanel">{tasks.slice(0,5).map(t=><button className={`taskRow ${t.done?'completed':''}`} key={t.id} onClick={()=>openSession(t.subject,t.title)}><div className="timePill">{t.mins}m</div><div className="grow"><span className="kicker">{t.subject} · {t.type}</span><b>{t.title}</b><small>{t.done?'Completed':t.why}</small></div>{t.done?<CheckCircle2 size={18}/>:<ChevronRight size={18}/>}</button>)}</div></div>
      <div><div className="sectionHead"><div><h3>Next exam</h3><p>Stay ahead of the deadline.</p></div><button className="linkBtn" onClick={()=>setPage('Planner')}>All exams</button></div><div className="examFocus">{upcoming?<><div className="examDate"><span>{Math.max(0,Math.ceil((new Date(upcoming.date).getTime()-Date.now())/86400000))}</span><small>days</small></div><div className="grow"><div className="kicker">{upcoming.subject}</div><b>{upcoming.name}</b><span>{dateLabel(upcoming.date)}</span><small>{upcoming.topics}</small></div><ArrowRight/></>:<div className="empty">No exams added yet.</div>}</div></div>
    </div>
  </section>;
}

function StudyPage({subjects,topics,tasks,selected,setSelected,openSession}:{subjects:Subject[];topics:Topic[];tasks:Task[];selected:string;setSelected:(s:string)=>void;openSession:(s:string,t?:string)=>void}){
  const s=subjects.find(x=>x.name===selected)||subjects[0]; const stTopics=topics.filter(t=>t.subject===s?.name); const lesson=s?lessons[s.name]:lessons.Physics;
  return <section className="page"><div className="pageTitle"><div><div className="eyebrow">FOCUSED STUDY</div><h1>Study workspace</h1><p className="muted">Pick a subject. MyStudies turns it into a guided session.</p></div><button className="outline" onClick={()=>openSession(s.name,lesson.topic)}><Play size={14}/> Resume</button></div>
    <div className="subjectSwitcher">{subjects.map(x=><button key={x.id} className={selected===x.name?'selected':''} onClick={()=>setSelected(x.name)}><div className={`tinySubject ${x.accent}`}>{x.name[0]}</div><span>{x.name}</span><strong>{x.mastery}%</strong></button>)}</div>
    <div className="studyLayout"><div><div className="focusPanel"><div className="focusBadge"><Sparkles size={15}/> AI-SELECTED</div><div className="focusIcon"><Brain/></div><div className="kicker">{s.name} · {s.code||'Core'}</div><h2>{lesson.topic}</h2><p>Learn → recall → exam-style practice → feedback. Your answer changes your mastery.</p><button className="primary xl" onClick={()=>openSession(s.name,lesson.topic)}>Start {s.name} session <ArrowRight size={16}/></button></div><div className="sectionHead"><div><h3>{s.name} topics</h3><p>Open any topic and practice it.</p></div></div><div className="topicList">{stTopics.map(t=><button key={t.id} onClick={()=>openSession(t.subject,t.name)}><div className="topicStatus"><span>{t.mastery}</span></div><div className="grow"><b>{t.name}</b><span>{t.unit} · {t.status}</span></div><div className="topicBar"><i style={{width:`${t.mastery}%`}}/></div><ChevronRight size={16}/></button>)}</div></div>
      <aside className="sidePanel"><div className="sidePanelTitle"><b>Session recipe</b><span>25–35 min</span></div>{['Learn the idea','Active recall','Exam practice','Instant feedback'].map((x,i)=><div className="recipe" key={x}><span>{i+1}</span><div><b>{x}</b><small>{i===0?'Build understanding first':i===1?'Answer without notes':i===2?'Use exam wording':'Save mistakes automatically'}</small></div></div>)}<div className="coachTip"><Sparkles size={15}/><p><b>Coach tip</b> Don't chase easy topics. Your lowest mastery is where the next mark is hiding.</p></div></aside>
    </div>
  </section>;
}

function SubjectsPage({subjects,topics,setTopics,setSubjects,openSession,query}:{subjects:Subject[];topics:Topic[];setTopics:React.Dispatch<React.SetStateAction<Topic[]>>;setSubjects:React.Dispatch<React.SetStateAction<Subject[]>>;openSession:(s:string,t?:string)=>void;query:string}){
  const [newTopic,setNewTopic]=useState('');
  const [importOpen,setImportOpen]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const addSubject=()=>setSubjects(p=>[...p,{id:`s${Date.now()}`,name:`Subject ${p.length+1}`,code:'',mastery:0,topics:0,done:0,accent:'green'}]);
  const importCsv=(file:File)=>{const reader=new FileReader();reader.onload=()=>{const lines=String(reader.result||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(lines.length<2)return;const header=lines[0].split(',').map(x=>x.trim().toLowerCase());const si=header.indexOf('subject'),ui=header.indexOf('unit'),ti=header.indexOf('topic');if(si<0||ti<0)return;const parsed:Topic[]=lines.slice(1).map((line,i)=>{const c=line.split(',');const subject=c[si]?.trim();return {id:`csv-${Date.now()}-${i}`,subject,unit:c[ui]?.trim()||'General',name:c[ti]?.trim(),status:'Not started',mastery:0}}).filter(t=>subjects.some(s=>s.name===t.subject)&&t.name);setTopics(p=>[...p,...parsed]);setSubjects(p=>p.map(s=>{const count=parsed.filter(t=>t.subject===s.name).length;return count?{...s,topics:s.topics+count}:s}));setImportOpen(false)};reader.readAsText(file);};
  return <section className="page"><div className="pageTitle"><div><div className="eyebrow">YOUR SYLLABUS</div><h1>My Subjects</h1><p className="muted">Your syllabus, mastery, and next action live in one place.</p></div><div className="actionRow"><button className="outline" onClick={()=>setImportOpen(v=>!v)}><Upload size={14}/> Import CSV</button><button className="primary" onClick={addSubject}><Plus size={14}/> Add subject</button></div></div>
    {importOpen&&<div className="importBar"><div><b>Import your real syllabus</b><span>CSV columns: Subject, Unit, Topic</span></div><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&importCsv(e.target.files[0])}/><button className="iconOnly" onClick={()=>setImportOpen(false)}><X/></button></div>}
    {query&&<div className="searchNotice">Showing subjects matching <b>“{query}”</b></div>}
    <div className="subjectGrid">{subjects.map(s=><article className={`subjectCard ${s.accent}`} key={s.id}><div className="subjectCardTop"><div className={`subjectGlyph ${s.accent}`}>{s.name.slice(0,2).toUpperCase()}</div><span className={`status ${tone(s.mastery)}`}>{status(s.mastery)}</span></div><h2>{s.name}</h2><p>{s.code?`Cambridge ${s.code}`:'Your subject'}</p><div className="masteryHead"><span>Mastery</span><b>{s.mastery}%</b></div><div className="largeBar"><i style={{width:`${s.mastery}%`}}/></div><div className="subjectMeta"><span>{s.done}/{s.topics} topics</span><span>{topics.filter(t=>t.subject===s.name&&t.mastery<60).length} weak</span></div><div className="subjectActions"><button className="primary" onClick={()=>openSession(s.name)}><Play size={14}/> Study now</button><button className="miniButton" onClick={()=>setSubjects(p=>p.map(x=>x.id===s.id?{...x,mastery:Math.min(100,x.mastery+1)}:x))}>+1 review</button></div></article>)}</div>
    <div className="sectionHead"><div><h3>Quick add a topic</h3><p>This adds a real topic to your selected subject.</p></div></div><QuickTopic subjects={subjects} value={newTopic} setValue={setNewTopic} onAdd={(subject)=>{if(!newTopic.trim())return;setTopics(p=>[...p,{id:`t-${Date.now()}`,subject,unit:'Added topic',name:newTopic.trim(),status:'Not started',mastery:0}]);setSubjects(p=>p.map(s=>s.name===subject?{...s,topics:s.topics+1}:s));setNewTopic('')}}/>
  </section>;
}

function QuickTopic({subjects,value,setValue,onAdd}:{subjects:Subject[];value:string;setValue:(v:string)=>void;onAdd:(s:string)=>void}){const [subject,setSubject]=useState(subjects[0]?.name||'Physics');return <div className="inlineAdd"><select value={subject} onChange={e=>setSubject(e.target.value)}>{subjects.map(s=><option key={s.name}>{s.name}</option>)}</select><input value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. Electromagnetic induction"/><button className="primary" onClick={()=>onAdd(subject)}><Plus size={14}/> Add topic</button></div>}

function PlannerPage({tasks,setTasks,exams,setExams,setToast}:{tasks:Task[];setTasks:React.Dispatch<React.SetStateAction<Task[]>>;exams:Exam[];setExams:React.Dispatch<React.SetStateAction<Exam[]>>;setToast:(s:string)=>void}){
  const [form,setForm]=useState({subject:'Chemistry',title:'',mins:30,type:'Study'});const [exam,setExam]=useState({subject:'Physics',name:'',date:'',topics:''});
  const toggle=(id:number)=>{setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));setToast('Plan updated')};
  return <section className="page"><div className="pageTitle"><div><div className="eyebrow">YOUR PLAN</div><h1>Planner</h1><p className="muted">Your schedule should remove decisions, not create more.</p></div></div>
    <div className="plannerToolbar"><div className="tabs"><button className="tabActive">Today</button><button>This week</button><button>Upcoming</button><button>Homework</button><button>Exams</button></div><span>{tasks.filter(t=>t.done).length}/{tasks.length} tasks done</span></div>
    <div className="plannerColumns"><div><div className="dateHeading"><div><b>Today</b><span>{dateLabel(today())}</span></div><span>{tasks.filter(t=>t.date===today()&&t.done).length} complete</span></div><div className="listPanel">{tasks.map(t=><div className={`plannerTask ${t.done?'completed':''}`} key={t.id}><button className="checkCircle" onClick={()=>toggle(t.id)}>{t.done&&<Check size={13}/>}</button><div className="grow"><div className="kicker">{t.subject} · {t.type} · {t.mins} min</div><b>{t.title}</b><span>{t.done?'Completed':t.why}</span></div><button className="iconOnly" onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}><Trash2 size={15}/></button></div>)}</div>
    <form className="plannerForm" onSubmit={e=>{e.preventDefault();if(!form.title.trim())return;setTasks(p=>[...p,{id:Date.now(),subject:form.subject,title:form.title.trim(),mins:Number(form.mins)||30,type:form.type,why:'Added by you',done:false,date:today()}]);setForm({...form,title:''});setToast('Task added')}}><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>{['Physics','Chemistry','Mathematics','English','Computer Science'].map(x=><option key={x}>{x}</option>)}</select><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Add a study task…"/><input type="number" min="5" max="240" value={form.mins} onChange={e=>setForm({...form,mins:Number(e.target.value)})}/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{['Study','Practice','Test','Homework'].map(x=><option key={x}>{x}</option>)}</select><button className="primary"><Plus size={14}/> Add</button></form></div>
      <aside className="sidePanel"><div className="sidePanelTitle"><b>Upcoming exams</b><button className="linkBtn">Manage</button></div>{exams.map(e=><div className="examMini" key={e.id}><div className="examDate small"><span>{Math.max(0,Math.ceil((new Date(e.date).getTime()-Date.now())/86400000))}</span><small>days</small></div><div className="grow"><b>{e.name}</b><span>{e.subject} · {dateLabel(e.date)}</span><small>{e.topics}</small></div><button className="iconOnly" onClick={()=>setExams(p=>p.filter(x=>x.id!==e.id))}><Trash2 size={14}/></button></div>)}<form className="examForm" onSubmit={e=>{e.preventDefault();if(!exam.name||!exam.date)return;setExams(p=>[...p,{id:Date.now(),...exam}]);setExam({...exam,name:'',date:'',topics:''});setToast('Exam added')}}><div className="eyebrow">ADD EXAM</div><input value={exam.name} onChange={e=>setExam({...exam,name:e.target.value})} placeholder="Exam name"/><div className="formRow"><select value={exam.subject} onChange={e=>setExam({...exam,subject:e.target.value})}>{['Physics','Chemistry','Mathematics','English','Computer Science'].map(x=><option key={x}>{x}</option>)}</select><input type="date" value={exam.date} onChange={e=>setExam({...exam,date:e.target.value})}/></div><input value={exam.topics} onChange={e=>setExam({...exam,topics:e.target.value})} placeholder="Topics included"/><button className="outline full">Add exam</button></form></aside></div>
  </section>;
}

function MistakesPage({mistakes,setMistakes,openSession}:{mistakes:Mistake[];setMistakes:React.Dispatch<React.SetStateAction<Mistake[]>>;openSession:(s:string,t?:string)=>void}){const [filter,setFilter]=useState('All');const shown=mistakes.filter(m=>filter==='All'||filter==='Unresolved'&&!m.resolved||filter==='Repeated'&&m.repeats>1||filter==='Resolved'&&m.resolved);return <section className="page"><div className="pageTitle"><div><div className="eyebrow">FEEDBACK LOOP</div><h1>Mistake Bank</h1><p className="muted">Mistakes change what MyStudies recommends next.</p></div></div><div className="filterbar">{['All','Unresolved','Repeated','Resolved'].map(x=><button className={filter===x?'selected':''} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="mistakeSummary"><div><b>{mistakes.length}</b><span>Total mistakes</span></div><div><b>{mistakes.filter(m=>!m.resolved).length}</b><span>Need review</span></div><div><b>{mistakes.filter(m=>m.repeats>1).length}</b><span>Repeated</span></div></div><div className="mistakeList">{shown.map(m=><article className={`mistakeCard ${m.resolved?'resolved':''}`} key={m.id}><div className="mistakeTop"><div><span className="kicker">{m.subject} · {m.topic}</span><h3>{m.prompt}</h3></div><span className={m.repeats>1?'repeat hot':'repeat'}>{m.repeats}×</span></div><div className="answerCompare"><div><small>Your issue</small><p>{m.why}</p></div><ArrowRight/><div><small>Correct direction</small><p>{m.answer}</p></div></div><div className="mistakeActions"><button className="primary" onClick={()=>openSession(m.subject,m.topic)}><Brain size={14}/> Fix this</button><button className="miniButton" onClick={()=>setMistakes(p=>p.map(x=>x.id===m.id?{...x,resolved:!x.resolved}:x))}>{m.resolved?'Mark unresolved':'Resolve'}</button></div></article>)}{shown.length===0&&<div className="empty large">Nothing in this filter yet.</div>}</div></section>}

function ProgressPage({subjects,topics,overall,xp,doneMins,target}:{subjects:Subject[];topics:Topic[];overall:number;xp:number;doneMins:number;target:number}){return <section className="page"><div className="pageTitle"><div><div className="eyebrow">PROGRESS</div><h1>See what is actually improving.</h1><p className="muted">Mastery is a signal from performance, not a fake checklist.</p></div></div><div className="progressHero"><div><span className="kicker">OVERALL MASTERY</span><strong>{overall}%</strong><p>Level {Math.floor(xp/500)+1} · {xp} XP · {doneMins}/{target} min today</p></div><div className="bigRing"><span>{overall}</span></div></div><div className="progressGrid">{subjects.map(s=><div className="progressSubject" key={s.id}><div className="progressSubjectTop"><div className={`subjectGlyph ${s.accent}`}>{s.name[0]}</div><div className="grow"><b>{s.name}</b><span>{s.done}/{s.topics} topics completed</span></div><strong>{s.mastery}%</strong></div><div className="largeBar"><i style={{width:`${s.mastery}%`}}/></div><small>{topics.filter(t=>t.subject===s.name&&t.mastery<60).length} topics below 60%</small></div>)}</div><div className="sectionHead"><div><h3>Topic mastery map</h3><p>Weak topics become future recommendations.</p></div></div><div className="masteryMap">{topics.map(t=><div key={t.id} className="mapItem"><div className="grow"><b>{t.name}</b><span>{t.subject} · {t.unit}</span></div><div className="mapScore"><span className={tone(t.mastery)}>{t.mastery}</span><div className="tinyBar"><i style={{width:`${t.mastery}%`}}/></div></div></div>)}</section>}

function CoachPage({subjects,mistakes,tasks,exams,openSession}:{subjects:Subject[];mistakes:Mistake[];tasks:Task[];exams:Exam[];openSession:(s:string,t?:string)=>void}){const weak=[...subjects].sort((a,b)=>a.mastery-b.mastery)[0];const repeated=mistakes.filter(m=>m.repeats>1&&!m.resolved)[0];const next=tasks.find(t=>!t.done);return <section className="page"><div className="pageTitle"><div><div className="eyebrow">AI COACH</div><h1>Tell me what you need.</h1><p className="muted">This coach uses your current mastery, mistakes, plan, and exams.</p></div></div><div className="coachShell"><div className="coachIntro"><div className="coachOrb large"><Brain size={34}/></div><div><div className="kicker">MY STUDIES COACH</div><h2>Your next move is clear.</h2><p>{weak.name} is currently your lowest-mastery subject at {weak.mastery}%. {repeated?`You also have a repeated ${repeated.subject} mistake.`:'Keep using mistakes to shape the plan.'}</p></div></div><div className="coachActions"><button onClick={()=>openSession(weak.name)}><span>What should I study?</span><ChevronRight/></button><button onClick={()=>next?openSession(next.subject,next.title):openSession(weak.name)}><span>I only have 30 minutes</span><ChevronRight/></button>{exams[0]&&<button onClick={()=>alert(`Prepare for ${exams[0].name} on ${dateLabel(exams[0].date)}. Prioritize weak ${exams[0].subject} topics first.`)}><span>Build my exam plan</span><ChevronRight/></button>}<button onClick={()=>alert(repeated?`You're repeating: ${repeated.topic}. Review the concept, then retest without notes.`:'No repeated mistakes right now.') }><span>Why am I struggling?</span><ChevronRight/></button></div></div><div className="coachGrid"><div className="insightCard"><Sparkles/><span>Recommendation</span><b>Spend your next focused block on {weak.name}.</b><p>Lowest mastery + highest potential gain.</p></div><div className="insightCard"><Target/><span>Plan health</span><b>{tasks.filter(t=>!t.done).length} tasks remain.</b><p>Finish the first recommended task before adding more.</p></div><div className="insightCard"><CircleAlert/><span>Mistake pattern</span><b>{mistakes.filter(m=>!m.resolved).length} unresolved.</b><p>Every unresolved repeat raises its priority.</p></div></div></section>}

function SettingsPage({dark,setDark,target,setTarget,subjects,setSubjects,topics,setTopics,reset,setToast}:{dark:boolean;setDark:(b:boolean)=>void;target:number;setTarget:(n:number)=>void;subjects:Subject[];setSubjects:React.Dispatch<React.SetStateAction<Subject[]>>;topics:Topic[];setTopics:React.Dispatch<React.SetStateAction<Topic[]>>;reset:()=>void;setToast:(s:string)=>void}){const [file,setFile]=useState<File|null>(null);const reader=useRef<HTMLInputElement>(null);return <section className="page"><div className="pageTitle"><div><div className="eyebrow">CONTROL CENTER</div><h1>Settings</h1><p className="muted">Make MyStudies fit the way you actually study.</p></div></div><div className="settingsGrid"><div className="settingCard"><div><b>Appearance</b><span>Choose how MyStudies feels.</span></div><button className="toggle" onClick={()=>setDark(!dark)}><span className={dark?'on':''}></span>{dark?'Dark':'Light'}</button></div><div className="settingCard"><div><b>Daily study target</b><span>Used by your dashboard and coach.</span></div><div className="stepper"><button onClick={()=>setTarget(Math.max(15,target-15))}>−</button><strong>{target} min</strong><button onClick={()=>setTarget(Math.min(360,target+15))}>+</button></div></div><div className="settingCard full"><div><b>Syllabus data</b><span>Import is available in My Subjects using CSV columns: Subject, Unit, Topic.</span></div><button className="outline" onClick={()=>alert('Go to My Subjects → Import CSV.')}><FileUp size={14}/> How to import</button></div><div className="settingCard full"><div><b>Local data</b><span>Your demo data is stored in this browser.</span></div><div className="actionRow"><button className="outline" onClick={()=>{localStorage.clear();window.location.reload()}}><RotateCcw size={14}/> Clear all local data</button><button className="danger" onClick={reset}><Trash2 size={14}/> Reset demo</button></div></div></div><div className="privacyNote"><Sparkles size={16}/><div><b>AI is designed around your data model.</b><p>When a real AI provider is connected later, the same coach functions can use your syllabus, mistakes, timetable, exams, and history without putting secrets in the browser.</p></div></div></section>}

function QuickSearch({query,weak,onClose,onStart,onPage}:{query:string;weak:Subject;onClose:()=>void;onStart:(s:string,t?:string)=>void;onPage:(p:string)=>void}){return <div className="quickSearch"><div className="quickHead"><span>Quick actions</span><button onClick={onClose}><X size={15}/></button></div>{query?<><button onClick={()=>{onPage('My Subjects');onClose()}}><Search/>Search subjects for <b>“{query}”</b><ArrowRight/></button></>:null}<button onClick={()=>{onStart(weak.name);onClose()}}><Sparkles/>Study {weak.name} <span>Lowest mastery</span></button><button onClick={()=>{onPage('Planner');onClose()}}><CalendarDays/>Open today’s plan <ArrowRight/></button><button onClick={()=>{onPage('Mistakes');onClose()}}><CircleAlert/>Review mistakes <ArrowRight/></button></div>}

function SessionModal({session,setSession,complete}:{session:{subject:string;title:string;stage:SessionStage;picked?:string;correct?:boolean};setSession:React.Dispatch<React.SetStateAction<{subject:string;title:string;stage:SessionStage;picked?:string;correct?:boolean}|null>>;complete:()=>void}){const lesson=lessons[session.subject]||lessons.Physics;const submit=()=>{const correct=session.picked===lesson.answer;setSession({...session,correct,stage:'result'})};return <div className="modalBackdrop"><div className="sessionModal"><div className="sessionTop"><div><span className="kicker">{session.subject} · 25 MIN</span><h2>{session.title}</h2></div><button className="iconOnly" onClick={()=>setSession(null)}><X/></button></div><div className="stepperBar">{['learn','recall','practice','result'].map((x,i)=><div className={session.stage===x||['learn','recall','practice','result'].indexOf(session.stage)>i?'doneStep':''} key={x}><span>{i+1}</span>{x}</div>)}</div>
{session.stage==='learn'&&<div className="sessionBody"><div className="sessionTag"><BookOpen size={16}/> Learn</div><p className="lessonLead">{lesson.learn}</p><div className="coachTip large"><Sparkles size={16}/><p><b>Remember:</b> {lesson.tip}</p></div><button className="primary xl" onClick={()=>setSession({...session,stage:'recall'})}>I understand <ArrowRight size={16}/></button></div>}
{session.stage==='recall'&&<div className="sessionBody"><div className="sessionTag"><Brain size={16}/> Active recall</div><h3>{lesson.recall}</h3><textarea placeholder="Answer without looking at notes…"/><button className="primary xl" onClick={()=>setSession({...session,stage:'practice'})}>Check my thinking <ArrowRight size={16}/></button></div>}
{session.stage==='practice'&&<div className="sessionBody"><div className="sessionTag"><Target size={16}/> Exam practice</div><h3>{lesson.question}</h3><div className="choiceGrid">{lesson.choices?.map(c=><button className={session.picked===c?'choice selected':''} onClick={()=>setSession({...session,picked:c})} key={c}>{c}</button>)}</div>{session.picked&&<div className="selectionNote">Selected: <b>{session.picked}</b></div>}<button className="primary xl" disabled={!session.picked} onClick={submit}>Mark answer <Check size={16}/></button></div>}
{session.stage==='result'&&<div className="sessionBody result"><div className={`resultIcon ${session.correct?'good':'bad'}`}>{session.correct?<CheckCircle2 size={38}/>:<CircleAlert size={38}/>}</div><div className="kicker">{session.correct?'CORRECT':'NOT YET'}</div><h2>{session.correct?'Nice. Keep the mark.':'Good attempt. Now fix the gap.'}</h2><p>{session.correct?`Answer: ${lesson.answer}`:`Answer: ${lesson.answer}`}</p><div className="coachTip large"><Sparkles size={16}/><p><b>Coach feedback:</b> {lesson.tip}</p></div><button className="primary xl" onClick={complete}>{session.correct?'Finish session':'Save mistake & finish'}</button></div>}
</div></div>}
