import React, { useEffect, useMemo, useState } from 'react';

type Kind = 'choice' | 'input';
type Question = { id:string; prompt:string; answer:string; hint:string; explain:string; kind:Kind; options?:string[]; points?:number };
type Topic = { title:string; blurb:string; questions:Question[] };

const subjects = ['Physics 0625','Chemistry 0620','Mathematics','English 0500','Computer Science 0478'];
const masterySeed:Record<string,number> = {'Physics 0625':72,'Chemistry 0620':48,'Mathematics':84,'English 0500':53,'Computer Science 0478':61};

const lessons:Record<string,Topic[]> = {
  'Physics 0625': [
    {title:'Forces & motion',blurb:'Link resultant force, mass and acceleration and explain what the motion tells you.',questions:[
      {id:'p1',prompt:'A car has a driving force of 900 N and resistance of 650 N. What is the resultant force?',answer:'250 N forward',hint:'Opposing forces are subtracted.',explain:'900 − 650 = 250 N, so the resultant is 250 N forward.',kind:'choice',options:['1550 N forward','250 N forward','250 N backward','0 N']},
      {id:'p2',prompt:'Which equation links force, mass and acceleration?',answer:'F = ma',hint:'Force equals mass multiplied by acceleration.',explain:'F = ma. Increase force at constant mass and acceleration increases.',kind:'choice',options:['F = m/a','F = ma','F = a/m','F = m + a']},
      {id:'p3',prompt:'A 4 kg object accelerates at 3 m/s². Find the resultant force.',answer:'12 N',hint:'Use F = ma.',explain:'F = 4 × 3 = 12 N.',kind:'input'},
      {id:'p4',prompt:'Two forces of 18 N right and 7 N left act on an object. Resultant?',answer:'11 N right',hint:'Subtract because the directions are opposite.',explain:'18 − 7 = 11 N to the right.',kind:'choice',options:['25 N right','11 N right','11 N left','0 N']},
      {id:'p5',prompt:'An object travels at constant velocity. What is the resultant force?',answer:'0 N',hint:'Constant velocity means zero acceleration.',explain:'If acceleration is zero, F = ma gives a resultant force of 0 N.',kind:'choice',options:['0 N','Equal to its weight','Increasing','Cannot be known']},
      {id:'p6',prompt:'A 5 kg object has a resultant force of 20 N. What is its acceleration?',answer:'4 m/s²',hint:'Rearrange F = ma to a = F/m.',explain:'a = 20 ÷ 5 = 4 m/s².',kind:'input'},
      {id:'p7',prompt:'If the same resultant force acts on a larger mass, acceleration will...',answer:'decrease',hint:'Think about a = F/m.',explain:'With force fixed, increasing mass makes acceleration decrease.',kind:'choice',options:['increase','decrease','stay the same','become zero']},
      {id:'p8',prompt:'What does a zero resultant force mean?',answer:'no acceleration',hint:'Zero resultant force means zero acceleration.',explain:'Zero resultant force gives zero acceleration; velocity can still be constant.',kind:'choice',options:['no movement','no acceleration','no mass','no forces at all']}
    ]}
  ],
  'Chemistry 0620': [
    {title:'Atomic structure',blurb:'Build a reliable mental model of protons, neutrons, electrons and ions.',questions:[
      {id:'c1',prompt:'Which particle has relative charge +1?',answer:'proton',hint:'It is found in the nucleus.',explain:'A proton has relative charge +1 and relative mass 1.',kind:'choice',options:['electron','neutron','proton','atom']},
      {id:'c2',prompt:'An atom has 11 protons and 10 electrons. What is its charge?',answer:'+1',hint:'There is one more positive charge than negative.',explain:'11 positive charges + 10 negative charges leaves +1.',kind:'input'},
      {id:'c3',prompt:'Which particle has almost zero relative mass?',answer:'electron',hint:'It is much lighter than a proton or neutron.',explain:'The electron has relative mass about 1/1840.',kind:'choice',options:['proton','neutron','electron','nucleus']},
      {id:'c4',prompt:'Why is a normal atom electrically neutral?',answer:'equal numbers of protons and electrons',hint:'Positive and negative charges cancel.',explain:'A neutral atom contains equal numbers of positive protons and negative electrons.',kind:'choice',options:['it has no particles','equal numbers of protons and electrons','neutrons are positive','electrons have no charge']},
      {id:'c5',prompt:'A neutral atom has proton number 17. How many electrons?',answer:'17',hint:'Neutral means charges balance.',explain:'A neutral atom has the same number of protons and electrons.',kind:'input'},
      {id:'c6',prompt:'Where are protons and neutrons found?',answer:'nucleus',hint:'Think of the tiny central part of the atom.',explain:'The nucleus contains protons and neutrons.',kind:'choice',options:['electron shell','nucleus','outside the atom','bond']},
      {id:'c7',prompt:'An atom gains one electron. Its charge becomes...',answer:'−1',hint:'An extra negative particle changes the balance.',explain:'One extra electron gives one more negative charge, so the ion is −1.',kind:'choice',options:['+1','0','−1','+2']},
      {id:'c8',prompt:'What determines the proton number of an element?',answer:'number of protons',hint:'The name of the element is fixed by one particle count.',explain:'The proton number is the number of protons in the nucleus and identifies the element.',kind:'choice',options:['number of neutrons','number of shells','number of protons','number of electrons only']}
    ]}
  ],
  'Mathematics': [
    {title:'Algebra & equations',blurb:'Solve, expand and factorise by keeping operations balanced and spotting structure.',questions:[
      {id:'m1',prompt:'Solve: 3x + 5 = 20',answer:'x = 5',hint:'Subtract 5, then divide by 3.',explain:'3x = 15, so x = 5.',kind:'input'},
      {id:'m2',prompt:'Expand: 4(x + 3)',answer:'4x + 12',hint:'Multiply 4 by both terms.',explain:'4 × x + 4 × 3 = 4x + 12.',kind:'input'},
      {id:'m3',prompt:'Factorise: 6x + 18',answer:'6(x + 3)',hint:'Take out the highest common factor.',explain:'Both terms divide by 6, giving 6(x + 3).',kind:'input'},
      {id:'m4',prompt:'Solve: 7x − 14 = 28',answer:'x = 6',hint:'Add 14, then divide by 7.',explain:'7x = 42, so x = 6.',kind:'input'},
      {id:'m5',prompt:'Which is equivalent to 2(x + 4) = 18?',answer:'2x + 8 = 18',hint:'Distribute the 2.',explain:'2 multiplied by x and 4 gives 2x + 8.',kind:'choice',options:['2x + 4 = 18','2x + 8 = 18','x + 8 = 18','2x + 16 = 18']},
      {id:'m6',prompt:'Solve: 5x = 35',answer:'x = 7',hint:'Divide both sides by 5.',explain:'x = 35 ÷ 5 = 7.',kind:'input'},
      {id:'m7',prompt:'What is the highest common factor of 12x and 18?',answer:'6',hint:'What is the largest number dividing both 12 and 18?',explain:'6 is the largest common factor.',kind:'input'},
      {id:'m8',prompt:'Solve: 2x + 9 = 17',answer:'x = 4',hint:'Remove 9 first.',explain:'2x = 8, so x = 4.',kind:'input'}
    ]}
  ],
  'English 0500': [
    {title:'Directed writing',blurb:'Control purpose, audience, form, tone and evidence instead of writing generic paragraphs.',questions:[
      {id:'e1',prompt:'What three things should you identify before writing a directed-writing response?',answer:'purpose, audience and form',hint:'Why are you writing? Who is reading? What text type?',explain:'Purpose, audience and form should drive your content, tone and structure.',kind:'choice',options:['purpose, audience and form','title, font and length','grammar, spelling and punctuation','plot, character and setting']},
      {id:'e2',prompt:'Which phrase is more appropriate for a formal report?',answer:'deeply concerning',hint:'Choose precise formal vocabulary.',explain:'“Deeply concerning” is controlled and precise; “really bad” is vague and casual.',kind:'choice',options:['really bad','deeply concerning','super awful','totally crazy']},
      {id:'e3',prompt:'Why should each paragraph have a clear purpose?',answer:'to organise ideas and keep the reader focused',hint:'Think about coherence.',explain:'A paragraph with one clear job makes the argument easier to follow.',kind:'choice',options:['to make it longer','to organise ideas and keep the reader focused','to use more adjectives','to avoid punctuation']},
      {id:'e4',prompt:'Which opening sounds like a formal school report?',answer:'The event produced several significant outcomes.',hint:'Match the form and audience.',explain:'A report should sound informative and controlled, not like a casual message.',kind:'choice',options:['Guys, this was absolutely insane!','The event produced several significant outcomes.','You will never believe what happened','OMG what a day']},
      {id:'e5',prompt:'In directed writing, evidence should usually be...',answer:'selected and shaped to support the purpose',hint:'Do not dump every detail from the source.',explain:'Strong responses select relevant details and explain them in a way that serves the task.',kind:'choice',options:['copied without change','selected and shaped to support the purpose','ignored','listed randomly']},
      {id:'e6',prompt:'What happens when tone does not match the audience?',answer:'the writing becomes less effective',hint:'Audience affects how your language is received.',explain:'A mismatch in tone can make otherwise good ideas sound unsuitable.',kind:'choice',options:['nothing','the writing becomes less effective','the word count doubles','the grammar automatically improves']},
      {id:'e7',prompt:'Which is the clearest formal instruction?',answer:'Students should submit the form by Friday.',hint:'Look for direct, controlled wording.',explain:'The sentence is concise, precise and appropriate for a formal audience.',kind:'choice',options:['You guys need to get this in ASAP','Students should submit the form by Friday.','Get it done, okay?','Everyone better do this now']},
      {id:'e8',prompt:'A persuasive paragraph is strongest when it combines a point with...',answer:'relevant evidence and explanation',hint:'A claim needs support and reasoning.',explain:'Point + evidence + explanation creates a clearer, more convincing paragraph.',kind:'choice',options:['random facts','relevant evidence and explanation','more rhetorical questions only','a longer conclusion']}
    ]}
  ],
  'Computer Science 0478': [
    {title:'Pseudocode: selection',blurb:'Write conditions correctly and trace which branch of an algorithm will execute.',questions:[
      {id:'s1',prompt:'Which structure chooses between two paths?',answer:'IF ... THEN ... ELSE',hint:'It checks a condition and provides an alternative.',explain:'IF chooses the first path when the condition is true; ELSE gives the alternative.',kind:'choice',options:['FOR ... NEXT','IF ... THEN ... ELSE','REPEAT ... UNTIL','INPUT ... OUTPUT']},
      {id:'s2',prompt:'IF score >= 50 THEN PASS ELSE FAIL. What is produced when score = 42?',answer:'FAIL',hint:'42 is not at least 50.',explain:'The condition is false, so the ELSE branch runs.',kind:'choice',options:['PASS','FAIL','50','TRUE']},
      {id:'s3',prompt:'A condition normally evaluates to...',answer:'TRUE or FALSE',hint:'A decision needs a Boolean result.',explain:'Conditions are Boolean: they evaluate to TRUE or FALSE.',kind:'choice',options:['a string only','TRUE or FALSE','a decimal only','a loop']},
      {id:'s4',prompt:'Which condition correctly checks whether age is at least 18?',answer:'age >= 18',hint:'“At least” includes 18.',explain:'>= means greater than or equal to.',kind:'input'},
      {id:'s5',prompt:'Why is ELSE useful?',answer:'it handles the case where the IF condition is false',hint:'Think about the second branch.',explain:'ELSE provides an alternative path when the IF condition is false.',kind:'choice',options:['it repeats forever','it handles the case where the IF condition is false','it stores data','it declares a variable']},
      {id:'s6',prompt:'What will this output? IF temperature > 30 THEN OUTPUT "Hot" ELSE OUTPUT "Cool" when temperature = 30.',answer:'Cool',hint:'30 is not greater than 30.',explain:'The condition uses >, not >=, so 30 makes it false and outputs Cool.',kind:'choice',options:['Hot','Cool','30','TRUE']},
      {id:'s7',prompt:'Which symbol means “not equal to” in common pseudocode comparisons?',answer:'<>',hint:'It is the opposite of =.',explain:'A common Cambridge-style pseudocode operator is <> for not equal.',kind:'choice',options:['==','<>','<=','=>']},
      {id:'s8',prompt:'Selection is useful because it lets an algorithm...',answer:'make decisions based on conditions',hint:'Different inputs can lead to different paths.',explain:'Selection allows an algorithm to choose an action based on a condition.',kind:'choice',options:['store every value permanently','make decisions based on conditions','always repeat the same step','increase memory automatically']}
    ]}
  ]
};

const allTopics=(s:string)=>lessons[s] ?? [];
const allQuestions=(s:string)=>allTopics(s).flatMap(t=>t.questions);
const initials=(s:string)=>s==='Computer Science 0478'?'CS':s.split(' ')[0].slice(0,2).toUpperCase();

function normal(v:string){return v.trim().toLowerCase().replace(/\s+/g,' ').replace(/[.,]/g,'');}
function subjectLevel(v:number){return v>=90?'Mastered':v>=75?'Strong':v>=60?'Building':v>=40?'Developing':'Starting';}

export default function AppNew(){
  const [active,setActive]=useState('Home');
  const [subject,setSubject]=useState('Chemistry 0620');
  const [dark,setDark]=useState(false);
  const [drawer,setDrawer]=useState(false);
  const [mastery,setMastery]=useState<Record<string,number>>(masterySeed);
  const [xp,setXp]=useState(1240);
  const [streak,setStreak]=useState(9);
  const [history,setHistory]=useState<{subject:string;question:string;correct:boolean;time:number}[]>([]);
  const [seen,setSeen]=useState<Record<string,string[]>>({});
  const [current,setCurrent]=useState<Question|null>(null);
  const [answer,setAnswer]=useState('');
  const [feedback,setFeedback]=useState<'correct'|'wrong'|''>('');
  const [showHint,setShowHint]=useState(false);

  useEffect(()=>{try{const raw=localStorage.getItem('mystudies-state');if(raw){const s=JSON.parse(raw);if(s.mastery)setMastery(s.mastery);if(s.xp)setXp(s.xp);if(s.streak)setStreak(s.streak);if(s.history)setHistory(s.history);if(s.seen)setSeen(s.seen);}}catch{}}
  ,[]);
  useEffect(()=>{try{localStorage.setItem('mystudies-state',JSON.stringify({mastery,xp,streak,history,seen}));}catch{}},[mastery,xp,streak,history,seen]);

  const topics=allTopics(subject);
  const questions=allQuestions(subject);
  const level=subjectLevel(mastery[subject]);
  const recent=history.filter(h=>h.subject===subject).slice(0,5);
  const weak=[...subjects].sort((a,b)=>mastery[a]-mastery[b]);

  function start(s=subject){
    setSubject(s);setActive('Study');setFeedback('');setAnswer('');setShowHint(false);
    const qs=allQuestions(s); if(!qs.length)return;
    const used=seen[s]??[]; const unused=qs.filter(q=>!used.includes(q.id));
    const pool=unused.length?unused:qs;
    let pick=pool[Math.floor(Math.random()*pool.length)];
    if(qs.length>1 && current && pick.id===current.id) pick=pool.find(q=>q.id!==current.id)??pick;
    setCurrent(pick);
    setSeen(v=>({...v,[s]:unused.length? [...used,pick.id].slice(-qs.length):[pick.id]}));
  }
  function next(){
    const qs=questions;if(!qs.length)return;
    const used=(seen[subject]??[]).slice(-Math.max(0,qs.length-1));
    const candidates=qs.filter(q=>q.id!==current?.id && !used.includes(q.id));
    const pool=candidates.length?candidates:qs.filter(q=>q.id!==current?.id);
    const pick=pool[Math.floor(Math.random()*pool.length)]??qs[0];
    setCurrent(pick);setAnswer('');setFeedback('');setShowHint(false);
    setSeen(v=>({...v,[subject]:[...(v[subject]??[]),pick.id].slice(-qs.length)}));
  }
  function submit(){
    if(!current || !answer.trim() || feedback)return;
    const ok=normal(answer)===normal(current.answer);
    setFeedback(ok?'correct':'wrong');
    setXp(v=>v+(ok?35:8));
    setMastery(v=>({...v,[subject]:Math.max(0,Math.min(100,v[subject]+(ok?3:-1)))}));
    setHistory(v=>[{subject,question:current.prompt,correct:ok,time:Date.now()},...v].slice(0,30));
  }

  const title=active==='Home'?'Command Center':active==='My Subjects'?'My Subjects':active==='Planner'?'Planner':active==='Mistakes'?'Mistake Bank':active==='Progress'?'Progress':active==='AI Coach'?'AI Coach':active==='Settings'?'Settings':'Study';

  return <div className={dark?'app dark':'app'}>
    <aside className="sidebar">
      <div className="brand"><div className="brandLogo">M</div><div><b>MyStudies</b><span>Study with intent.</span></div></div>
      <div className="navLabel">WORKSPACE</div>
      <nav>{['Home','Study','My Subjects','Planner','Mistakes','Progress','AI Coach','Settings'].map(n=><button key={n} className={active===n?'active':''} onClick={()=>setActive(n)}><span className="navIcon">{n==='Home'?'⌂':n==='Study'?'◉':n==='My Subjects'?'□':n==='Planner'?'◷':n==='Mistakes'?'!':n==='Progress'?'↗':n==='AI Coach'?'✦':'⚙'}</span>{n}<span className="navArrow">›</span></button>)}</nav>
      <div className="sidebarBottom"><button className="coachMini" onClick={()=>setDrawer(true)}><span className="spark">✦</span><div><b>Coach</b><small>Ready for your next move</small></div></button><div className="profile"><span className="avatar">I</span><div><b>Ibrahim</b><small>Y9 · A / A*</small></div></div></div>
    </aside>

    <main>
      <header className="topbar"><div className="crumb"><span>{title}</span><i>/</i><b>{subject}</b></div><div className="topActions"><button className="search" onClick={()=>setDrawer(true)}>⌕ <span>Ask anything about your study plan…</span><kbd>Ctrl K</kbd></button><button className="iconBtn" onClick={()=>setDark(v=>!v)}>{dark?'☀':'◐'}</button><button className="coachBtn" onClick={()=>setDrawer(true)}>✦ Coach</button></div></header>

      {active==='Home' && <Home mastery={mastery} xp={xp} streak={streak} weak={weak} onStart={start} setActive={setActive} />}

      {active==='Study' && <div className="page studyPage">
        <div className="studyTop"><div><div className="eyebrow">FOCUSED STUDY</div><h1>{subject}</h1><p>{topics[0]?.title} · {mastery[subject]}% mastery · <b>{level}</b></p></div><div className="studyActions"><button className="outline" onClick={()=>setActive('My Subjects')}>Change subject</button>{!current&&<button className="primary" onClick={()=>start()}>Start session</button>}</div></div>
        <div className="subjectTabs">{subjects.map(s=><button key={s} className={s===subject?'selected':''} onClick={()=>start(s)}><span>{initials(s)}</span><div><b>{s.replace(/ \d+$/,'')}</b><small>{mastery[s]}%</small></div></button>)}</div>
        {!current && <div className="readyPanel"><div className="readyOrb">✦</div><div><div className="eyebrow">NEXT BEST ACTION</div><h2>Strengthen {topics[0]?.title}</h2><p>{topics[0]?.blurb}</p><div className="recipeRow"><span>01 · Learn</span><span>02 · Recall</span><span>03 · Exam question</span><span>04 · Review</span></div><button className="primary xl" onClick={()=>start()}>Start adaptive session →</button></div><div className="readyScore"><strong>{mastery[subject]}%</strong><span>mastery</span><i style={{height:`${mastery[subject]}%`}}/></div></div>}
        {current && <div className="questionLayout">
          <section className="questionPanel">
            <div className="qTop"><span>QUESTION {questions.findIndex(q=>q.id===current.id)+1} / {questions.length}</span><span>{topics[0]?.title}</span></div>
            <div className="qProgress"><i style={{width:`${((questions.findIndex(q=>q.id===current.id)+1)/questions.length)*100}%`}}/></div>
            <div className="questionBody"><div className="qBadge">{current.kind==='choice'?'SELECT ONE':'WRITE YOUR ANSWER'}</div><h2>{current.prompt}</h2>
              {current.kind==='choice' ? <div className="optionGrid">{current.options?.map(o=><button disabled={!!feedback} className={(answer===o?'chosen ':'')+(feedback&&normal(o)===normal(current.answer)?'right ':'')+(feedback&&answer===o&&normal(o)!==normal(current.answer)?'wrong ':'')} key={o} onClick={()=>setAnswer(o)}>{o}<span>{feedback&&normal(o)===normal(current.answer)?'✓':''}{feedback&&answer===o&&normal(o)!==normal(current.answer)?'×':''}</span></button>)}</div> : <input className="answerInput" value={answer} disabled={!!feedback} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit()}} placeholder="Type your answer…" autoFocus />}
              <div className="qControls"><button className="hintBtn" onClick={()=>setShowHint(v=>!v)}>⌁ {showHint?'Hide hint':'Need a hint?'}</button><button className="primary" disabled={!answer.trim()||!!feedback} onClick={submit}>{feedback?'Answered':'Check answer'} <span>→</span></button></div>
              {showHint&&!feedback&&<div className="hintBox"><b>Hint</b><span>{current.hint}</span></div>}
              {feedback&&<div className={feedback==='correct'?'feedback correct':'feedback wrong'}><div className="feedbackIcon">{feedback==='correct'?'✓':'!'}</div><div><b>{feedback==='correct'?'Correct.':'Not quite.'}</b><p>{current.explain}</p>{feedback==='wrong'&&<small>Your answer: <strong>{answer}</strong> · Correct: <strong>{current.answer}</strong></small>}</div></div>}
              {feedback&&<div className="afterRow"><span>{feedback==='correct'?'+35 XP · mastery improved':'Mistake saved · review this topic'}</span><button className="primary" onClick={next}>Next question →</button></div>}
            </div>
          </section>
          <aside className="sessionSide"><div className="sideMetric"><span>SESSION</span><b>{recent.length+1}</b><small>attempts logged</small></div><div className="sideMetric"><span>MASTERY</span><b>{mastery[subject]}%</b><div className="meter"><i style={{width:`${mastery[subject]}%`}}/></div></div><div className="sideSteps"><div className="eyebrow">YOUR METHOD</div>{['Learn','Active recall','Exam question','Mark + explain','Mini-test'].map((x,i)=><div className={feedback&&i<4?'step done':'step'} key={x}><span>{i+1}</span><b>{x}</b>{feedback&&i<4&&<em>✓</em>}</div>)}</div><button className="exitBtn" onClick={()=>{setCurrent(null);setFeedback('');setAnswer('')}}>End session</button></aside>
        </div>}
        {recent.length>0&&<div className="recentStrip"><div className="eyebrow">RECENT ATTEMPTS</div>{recent.map((h,i)=><div key={i}><span className={h.correct?'dot good':'dot bad'}/><p>{h.question}</p><b>{h.correct?'Correct':'Review'}</b></div>)}</div>}
      </div>}

      {active==='My Subjects' && <div className="page"><div className="eyebrow">SYLLABUS</div><div className="pageHeading"><div><h1>My subjects</h1><p>Every subject has its own learning path. No mixed-up topics.</p></div><button className="primary" onClick={()=>setActive('Study')}>Start studying →</button></div><div className="subjectList">{subjects.map((s,i)=><button key={s} className="subjectLine" onClick={()=>start(s)}><span className="subjectIndex">0{i+1}</span><span className="subIcon">{initials(s)}</span><div><b>{s}</b><small>{allTopics(s)[0]?.title} · {allQuestions(s).length} practice questions</small></div><div className="subProgress"><i style={{width:`${mastery[s]}%`}}/></div><strong>{mastery[s]}%</strong><span className={mastery[s]>=75?'level good':mastery[s]>=60?'level':'level weak'}>{subjectLevel(mastery[s])}</span><em>Open →</em></button>)}</div></div>}

      {active==='Planner' && <Planner onStart={start} subject={subject}/>} 
      {active==='Mistakes' && <div className="page"><div className="eyebrow">MISTAKE BANK</div><div className="pageHeading"><div><h1>Turn mistakes into marks.</h1><p>Every wrong answer becomes another chance to fix the exact idea.</p></div><span className="mistakeCount">{history.filter(h=>!h.correct).length} to review</span></div>{history.filter(h=>!h.correct).length===0?<div className="emptyPanel"><div>✓</div><h2>No mistakes yet.</h2><p>Your first incorrect answer will appear here with the topic and explanation.</p></div>:<div className="mistakeList">{history.filter(h=>!h.correct).map((h,i)=><button key={i} onClick={()=>start(h.subject)}><span className="badMark">!</span><div><b>{h.subject}</b><p>{h.question}</p><small>Review topic → try another variation</small></div><em>Practice</em></button>)}</div>}</div>}

      {active==='Progress' && <div className="page"><div className="eyebrow">PROGRESS</div><div className="pageHeading"><div><h1>See the trajectory.</h1><p>Mastery moves from real attempts — not arbitrary checkboxes.</p></div><div className="xpBig"><b>{xp.toLocaleString()}</b><span>XP earned</span></div></div><div className="progressHero"><div><span>OVERALL MASTERY</span><strong>{Math.round(subjects.reduce((a,s)=>a+mastery[s],0)/subjects.length)}%</strong><p>Keep pushing the weakest subject first.</p></div><div className="bars">{subjects.map(s=><div key={s}><span>{initials(s)}</span><div><i style={{width:`${mastery[s]}%`}}/></div><b>{mastery[s]}%</b></div>)}</div></div><div className="progressHistory"><div className="eyebrow">RECENT EVIDENCE</div>{history.slice(0,8).map((h,i)=><div key={i}><span>{new Date(h.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><p>{h.subject}</p><em className={h.correct?'good':'bad'}>{h.correct?'Correct':'Review'}</em></div>)}</div></div>}

      {active==='AI Coach' && <div className="page coachPage"><div className="eyebrow">AI COACH</div><h1>Tell me what is blocking you.</h1><p className="lead">The coach should decide the next useful action, not give you another giant list.</p><div className="coachChoices"><button onClick={()=>start(weak[0])}><span>01</span><div><b>What should I study now?</b><small>Use my weakest subject and current mastery.</small></div><strong>→</strong></button><button onClick={()=>start(subject)}><span>02</span><div><b>Give me a fresh question</b><small>Never just repeat the same question on a new session.</small></div><strong>→</strong></button><button onClick={()=>setActive('Mistakes')}><span>03</span><div><b>Fix my mistakes</b><small>Turn recent errors into targeted practice.</small></div><strong>→</strong></button></div></div>}

      {active==='Settings' && <div className="page"><div className="eyebrow">SETTINGS</div><div className="pageHeading"><div><h1>Make it yours.</h1><p>Preferences are saved in this browser.</p></div></div><div className="settings"><button onClick={()=>setDark(v=>!v)}><span>Appearance</span><b>{dark?'Dark':'Light'} ↔</b></button><button><span>Daily target</span><b>3 h 30 m</b></button><button><span>Goal</span><b>A / A*</b></button><button onClick={()=>{localStorage.removeItem('mystudies-state');location.reload()}}><span>Reset demo data</span><b className="dangerText">Reset</b></button></div></div>}
    </main>

    {drawer&&<div className="drawerOverlay" onClick={()=>setDrawer(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><button className="drawerClose" onClick={()=>setDrawer(false)}>×</button><div className="coachMark">✦</div><div className="eyebrow">MY STUDIES COACH</div><h2>One next move.</h2><p>I can already see your weakest subject is <b>{weak[0]}</b> at {mastery[weak[0]]}%.</p><button className="primary full" onClick={()=>{setDrawer(false);start(weak[0])}}>Start there →</button><div className="coachIdeas"><button onClick={()=>{setDrawer(false);start(weak[0])}}>“What should I study right now?”</button><button onClick={()=>{setDrawer(false);next()}}>“Give me something different.”</button><button onClick={()=>{setDrawer(false);setActive('Mistakes')}}>“Show me what I'm getting wrong.”</button></div></aside></div>}
  </div>
}

function Home({mastery,xp,streak,weak,onStart,setActive}:{mastery:Record<string,number>;xp:number;streak:number;weak:string[];onStart:(s?:string)=>void;setActive:(s:string)=>void}){
 const primary=weak[0]; return <div className="page homePage"><div className="homeIntro"><div><div className="eyebrow">SATURDAY · COMMAND CENTER</div><h1>Good afternoon, Ibrahim.</h1><p>Don't decide what to study. Let MyStudies choose the highest-value move.</p></div><div className="streak"><strong>{streak}</strong><span>day streak</span></div></div><section className="heroCommand"><div><div className="live">● LIVE STUDY COACH</div><h2>Your next move is <span>{allTopics(primary)[0]?.title}</span>.</h2><p>{primary} is currently your weakest subject at <b>{mastery[primary]}%</b>.</p><div className="heroButtons"><button className="heroPrimary" onClick={()=>onStart(primary)}>Start {primary.split(' ')[0]} →</button><button className="heroGhost" onClick={()=>setActive('AI Coach')}>Ask coach</button></div></div><div className="orb"><span>✦</span><small>focused<br/>study</small></div></section><div className="signalRow"><div><span>DAILY TARGET</span><b>2h 10m</b><small>of 3h 30m</small><i style={{width:'62%'}}/></div><div><span>XP</span><b>{xp.toLocaleString()}</b><small>+43 today</small><i style={{width:'68%'}}/></div><div><span>SUBJECTS</span><b>{Object.values(mastery).filter(v=>v>=75).length}/5</b><small>strong or mastered</small><i style={{width:'48%'}}/></div><div><span>FOCUS</span><b>1 topic</b><small>before next break</small><i style={{width:'82%'}}/></div></div><div className="sectionHead"><div><div className="eyebrow">YOUR ATTENTION</div><h3>Start where the marks are.</h3></div><button className="linkBtn" onClick={()=>setActive('My Subjects')}>View subjects →</button></div><div className="attentionList">{weak.slice(0,3).map((s,i)=><button key={s} onClick={()=>onStart(s)}><span className="rank">0{i+1}</span><span className="miniIcon">{initials(s)}</span><div><b>{s}</b><small>{allTopics(s)[0]?.title} · {subjectLevel(mastery[s])}</small></div><div className="tinyProgress"><i style={{width:`${mastery[s]}%`}}/></div><strong>{mastery[s]}%</strong><em>Study →</em></button>)}</div><div className="twoCol"><div><div className="sectionHead"><div><div className="eyebrow">TODAY</div><h3>A simple plan</h3></div></div><div className="taskList"><button onClick={()=>onStart(primary)}><span className="time">01</span><div><b>{allTopics(primary)[0]?.title}</b><small>Adaptive question session · 35 min</small></div><em>Next</em></button><button onClick={()=>onStart('Mathematics')}><span className="time">02</span><div><b>Algebra mixed recall</b><small>Timed practice · 40 min</small></div><em>Later</em></button><button onClick={()=>onStart('Computer Science 0478')}><span className="time">03</span><div><b>Pseudocode selection</b><small>Active recall · 30 min</small></div><em>Later</em></button></div></div><div><div className="sectionHead"><div><div className="eyebrow">UP NEXT</div><h3>Exam prep</h3></div></div><div className="examBox"><span className="examDay">14</span><div><small>SEP</small><b>Y9 Progress Check</b><p>Priority: Chemistry + English</p></div><strong>6 days</strong></div></div></div></div>
}

function Planner({onStart,subject}:{onStart:(s?:string)=>void;subject:string}){return <div className="page"><div className="eyebrow">PLANNER</div><div className="pageHeading"><div><h1>Study around your day.</h1><p>One focused block at a time. Homework and exams stay visible.</p></div><button className="primary" onClick={()=>onStart(subject)}>Start next →</button></div><div className="planner"><div className="dayRail"><span>MON</span><b>14</b><small>Today</small></div><div className="timeline"><div className="timeLine done"><span>09:00</span><div><b>Mathematics</b><p>Algebra mixed recall · 45 min</p></div><em>Done</em></div><div className="timeLine current"><span>16:30</span><div><b>{subject}</b><p>Adaptive question session · 35 min</p></div><button onClick={()=>onStart(subject)}>Start</button></div><div className="timeLine"><span>17:15</span><div><b>Computer Science 0478</b><p>Pseudocode selection · 30 min</p></div><em>Later</em></div></div></div><div className="plannerFooter"><div><div className="eyebrow">HOMEWORK</div><b>English directed writing</b><p>Due tomorrow · 35 min estimated</p></div><div><div className="eyebrow">EXAM</div><b>Y9 Progress Check</b><p>6 days · Chemistry needs attention</p></div></div></div>}
