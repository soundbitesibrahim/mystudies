import React, { useMemo, useState, type ReactNode } from 'react';

const subjects = ['Physics 0625','Chemistry 0620','Mathematics','English 0500','Computer Science 0478'];

const topicBank: Record<string, { topic: string; concept: string; questions: {q:string; a:string; hint:string}[] }> = {
  'Physics 0625': {
    topic: 'Forces & motion', concept: 'Resultant force is the overall force after adding forces with direction taken into account.',
    questions: [
      {q:'A car has 900 N driving force and 650 N resistive force. What is the resultant force?',a:'250 N forward',hint:'Subtract the opposing force.'},
      {q:'What happens to the acceleration when the resultant force on an object increases, assuming its mass stays constant?',a:'It increases',hint:'Use F = ma.'},
      {q:'A 4 kg object accelerates at 3 m/s². Find the resultant force.',a:'12 N',hint:'Multiply mass by acceleration.'},
      {q:'Two forces of 18 N right and 7 N left act on an object. What is the resultant?',a:'11 N right',hint:'Opposite directions subtract.'}
    ]
  },
  'Chemistry 0620': {
    topic: 'Atomic structure', concept: 'Atoms contain protons and neutrons in the nucleus, with electrons arranged around it.',
    questions: [
      {q:'Which particle has a positive charge?',a:'Proton',hint:'It is found in the nucleus.'},
      {q:'An atom has 11 protons and 10 electrons. What is its overall charge?',a:'+1',hint:'Compare positive and negative charges.'},
      {q:'What is the relative charge of an electron?',a:'−1',hint:'Electrons are negatively charged.'},
      {q:'Why is an atom normally neutral?',a:'It has equal numbers of protons and electrons',hint:'Positive and negative charges cancel.'}
    ]
  },
  Mathematics: {
    topic: 'Algebra & equations', concept: 'Solve equations by doing the same operation to both sides and keeping the variable isolated.',
    questions: [
      {q:'Solve: 3x + 5 = 20',a:'x = 5',hint:'Subtract 5, then divide by 3.'},
      {q:'Solve: 7x − 14 = 28',a:'x = 6',hint:'Add 14, then divide by 7.'},
      {q:'Expand: 4(x + 3)',a:'4x + 12',hint:'Multiply 4 by every term inside.'},
      {q:'Factorise: 6x + 18',a:'6(x + 3)',hint:'Take out the highest common factor.'}
    ]
  },
  'English 0500': {
    topic: 'Directed writing', concept: 'Strong directed writing stays focused on purpose, audience and form while using precise vocabulary and controlled paragraphs.',
    questions: [
      {q:'What should you decide first in a directed-writing task?',a:'Purpose, audience and form',hint:'Think: why, who, and what type of text.'},
      {q:'Which is stronger for formal writing: “really bad” or “deeply concerning”?',a:'Deeply concerning',hint:'Choose precise vocabulary.'},
      {q:'Why should each paragraph have a clear purpose?',a:'To keep ideas organised and easy to follow',hint:'Think about structure and coherence.'},
      {q:'What should your tone sound like when writing a formal school report?',a:'Controlled, clear and appropriately formal',hint:'Avoid slang and overly casual language.'}
    ]
  },
  'Computer Science 0478': {
    topic: 'Pseudocode — selection', concept: 'Selection lets a program choose between different paths using a condition.',
    questions: [
      {q:'Which structure is normally used when a program must choose between two paths?',a:'IF ... THEN ... ELSE',hint:'It checks a condition.'},
      {q:'What is the result of IF score >= 50 THEN PASS ELSE FAIL when score = 42?',a:'FAIL',hint:'42 is not at least 50.'},
      {q:'What does a condition evaluate to?',a:'TRUE or FALSE',hint:'A decision needs a yes/no outcome.'},
      {q:'Write a simple selection to output “Adult” when age is 18 or more, otherwise “Under 18”.',a:'IF age >= 18 THEN OUTPUT "Adult" ELSE OUTPUT "Under 18"',hint:'Use a comparison and two branches.'}
    ]
  }
};

const nav = ['Home','Study','My Subjects','Planner','Mistakes','Progress','AI Coach','Settings'];

function Signal({children}:{children:ReactNode}){ return <span className="signal">{children}</span> }

export default function AppNew(){
  const [active,setActive]=useState('Home');
  const [subject,setSubject]=useState('Physics 0625');
  const [dark,setDark]=useState(false);
  const [coachOpen,setCoachOpen]=useState(false);
  const [sessionOpen,setSessionOpen]=useState(false);
  const [qIndex,setQIndex]=useState(0);
  const [answer,setAnswer]=useState('');
  const [feedback,setFeedback]=useState('');
  const [mastery,setMastery]=useState<Record<string,number>>({'Physics 0625':72,'Chemistry 0620':48,'Mathematics':84,'English 0500':53,'Computer Science 0478':61});
  const [xp,setXp]=useState(1240);
  const [streak,setStreak]=useState(9);
  const [history,setHistory]=useState<string[]>([]);

  const bank = topicBank[subject];
  const currentQuestion = bank.questions[qIndex % bank.questions.length];
  const status = useMemo(()=>mastery[subject]>=90?'Mastered':mastery[subject]>=75?'Strong':mastery[subject]>=60?'Building':mastery[subject]>=40?'Developing':'Starting',[mastery,subject]);

  function openStudy(s=subject){ setSubject(s); setActive('Study'); setSessionOpen(true); setFeedback(''); setAnswer(''); setQIndex(0); }
  function nextQuestion(){ setQIndex(v=>v+1); setFeedback(''); setAnswer(''); }
  function submit(){
    if(!answer.trim()) return;
    const clean=answer.trim().toLowerCase();
    const target=currentQuestion.a.toLowerCase();
    const correct = clean===target || target.includes(clean) || clean.includes(target) || (subject==='Physics 0625' && clean.replace(/\s/g,'')===target.replace(/\s/g,''));
    const delta = correct ? 5 : -2;
    setMastery(m=>({...m,[subject]:Math.max(0,Math.min(100,m[subject]+delta))}));
    setXp(x=>x+(correct?35:10));
    setHistory(h=>[`${subject}: ${correct?'correct':'needs review'} — ${currentQuestion.q}`,...h].slice(0,8));
    setFeedback(correct?'Correct. Nice work.':'Not quite. Study the explanation, then try the next variation.');
  }

  const page = active==='Home' ? (
    <div className="page homePage">
      <section className="hero">
        <div className="eyebrow"><Signal>● LIVE COACH</Signal><span>Built around your syllabus</span></div>
        <h1>Know exactly what to study.</h1>
        <p>MyStudies turns your syllabus, performance, mistakes and deadlines into one clear next move.</p>
        <button className="primary big" onClick={()=>openStudy(subject)}>What should I study? <span>→</span></button>
        <div className="heroMeta"><span><b>{xp.toLocaleString()}</b> XP</span><span><b>{streak}</b> day streak</span><span><b>{history.length}</b> recent attempts</span></div>
      </section>
      <section className="focusRow">
        <div className="focusMain">
          <div className="sectionTop"><div><span className="kicker">NEXT BEST ACTION</span><h2>Strengthen {bank.topic}</h2></div><span className="masteryPill">{mastery[subject]}% · {status}</span></div>
          <p>{bank.concept}</p>
          <div className="progressLine"><span style={{width:`${mastery[subject]}%`}}/></div>
          <div className="focusFooter"><span>Recommended because your recent performance can improve here.</span><button className="textButton" onClick={()=>openStudy(subject)}>Start session →</button></div>
        </div>
        <aside className="attention">
          <span className="kicker">NEEDS ATTENTION</span>
          {subjects.filter(s=>mastery[s]<65).slice(0,3).map(s=><button key={s} className="attentionItem" onClick={()=>openStudy(s)}><span>{s}</span><b>{mastery[s]}%</b></button>)}
        </aside>
      </section>
      <section className="subjectsStrip"><div className="sectionTop"><div><span className="kicker">YOUR SUBJECTS</span><h2>Choose a lane</h2></div><button className="textButton" onClick={()=>setActive('My Subjects')}>View all →</button></div><div className="subjectRail">{subjects.map((s,i)=><button className={`subjectTile ${s===subject?'selected':''}`} key={s} onClick={()=>{setSubject(s);openStudy(s)}}><small>{String(i+1).padStart(2,'0')}</small><strong>{s}</strong><span>{mastery[s]}% · {mastery[s]>=75?'Strong':'Focus'}</span></button>)}</div></section>
    </div>
  ) : active==='Study' ? (
    <div className="page studyPage"><div className="studyHeader"><div><span className="kicker">STUDY MODE</span><h1>{subject}</h1><p>{bank.topic} · {mastery[subject]}% mastery</p></div><button className="ghost" onClick={()=>setSessionOpen(true)}>Resume session</button></div><div className="lessonGrid"><div className="lessonLead"><span className="lessonNumber">01</span><h2>{bank.topic}</h2><p>{bank.concept}</p><button className="primary" onClick={()=>setSessionOpen(true)}>Start adaptive session →</button></div><div className="lessonFacts"><div><span>MASTERY</span><b>{mastery[subject]}%</b></div><div><span>LEVEL</span><b>{status}</b></div><div><span>QUESTIONS</span><b>{bank.questions.length}</b></div></div></div><div className="variationList"><span className="kicker">RECENT ACTIVITY</span>{history.length?history.map((x,i)=><div className="activityLine" key={i}><span>{x}</span><b>→</b></div>):<div className="emptyLine">Your attempts will appear here after you answer questions.</div>}</div></div>
  ) : active==='My Subjects' ? (
    <div className="page"><div className="pageTitle"><span className="kicker">SYLLABUS</span><h1>My subjects</h1><p>Each subject stays isolated. No random Physics inside English.</p></div><div className="subjectDirectory">{subjects.map(s=><button key={s} className="directoryItem" onClick={()=>openStudy(s)}><span className="dirNum">{String(subjects.indexOf(s)+1).padStart(2,'0')}</span><div><h3>{s}</h3><p>{topicBank[s].topic}</p></div><strong>{mastery[s]}%</strong><span>Open →</span></button>)}</div></div>
  ) : active==='Planner' ? (
    <div className="page"><div className="pageTitle"><span className="kicker">PLANNER</span><h1>Today, without the guesswork.</h1><p>Study around schoolwork, not against it.</p></div><div className="timeline"><div className="timelineItem done"><span>09:00</span><div><b>Mathematics</b><p>Algebra mixed questions · 45 min</p></div><em>Done</em></div><div className="timelineItem current"><span>16:30</span><div><b>{subject}</b><p>{bank.topic} adaptive session · 35 min</p></div><em>Next</em></div><div className="timelineItem"><span>17:15</span><div><b>Computer Science</b><p>Pseudocode recall · 30 min</p></div><em>Later</em></div></div></div>
  ) : active==='Mistakes' ? (
    <div className="page"><div className="pageTitle"><span className="kicker">MISTAKE BANK</span><h1>Turn mistakes into marks.</h1><p>Every wrong answer becomes useful study data.</p></div><div className="mistakePanel">{history.length?history.map((x,i)=><div className="mistakeRow" key={i}><span className="mistakeDot">!</span><div><b>{x}</b><p>Review the explanation, retry the concept, then test again.</p></div><span>Repeat ↗</span></div>):<div className="emptyState">No mistakes saved yet. Start a session and your first weak point will appear here.</div>}</div></div>
  ) : active==='Progress' ? (
    <div className="page"><div className="pageTitle"><span className="kicker">PROGRESS</span><h1>Your trajectory.</h1><p>Mastery is based on performance, not arbitrary checkmarks.</p></div><div className="progressTable">{subjects.map(s=><div className="progressRow" key={s}><div><b>{s}</b><span>{topicBank[s].topic}</span></div><div className="miniTrack"><span style={{width:`${mastery[s]}%`}}/></div><strong>{mastery[s]}%</strong></div>)}</div></div>
  ) : active==='AI Coach' ? (
    <div className="page coachPage"><div className="pageTitle"><span className="kicker">AI COACH</span><h1>Ask. Decide. Study.</h1><p>Use your real progress to get a specific answer — not generic motivation.</p></div><div className="coachPrompt"><button onClick={()=>openStudy()}>“What should I study right now?”</button><button onClick={()=>openStudy('Chemistry 0620')}>“Why am I weak in Chemistry?”</button><button onClick={()=>openStudy('English 0500')}>“Give me a harder English question.”</button></div></div>
  ) : (
    <div className="page"><div className="pageTitle"><span className="kicker">SETTINGS</span><h1>Make MyStudies yours.</h1><p>Theme, target and study preferences.</p></div><div className="settingsList"><button onClick={()=>setDark(v=>!v)}><span>Appearance</span><b>{dark?'Dark':'Light'}</b></button><button><span>Daily target</span><b>3h 30m</b></button><button><span>Goal</span><b>A / A*</b></button></div></div>
  );

  return <div className={dark?'app dark':'app'}>
    <aside className="sidebar"><div className="brand"><span className="brandMark">M</span><span>MyStudies</span></div><nav>{nav.map(item=><button key={item} className={active===item?'navItem active':'navItem'} onClick={()=>setActive(item)}><span className="navGlyph">{item==='Home'?'⌂':item==='Study'?'◉':item==='My Subjects'?'◫':item==='Planner'?'◷':item==='Mistakes'?'!':item==='Progress'?'↗':item==='AI Coach'?'✦':'⚙'}</span>{item}</button>)}</nav><div className="sidebarBottom"><button className="coachMini" onClick={()=>setCoachOpen(v=>!v)}><span>✦</span><div><b>AI Coach</b><small>Ready when you are</small></div></button><div className="profile"><span className="avatar">I</span><div><b>Ibrahim</b><small>Y9 · A/A*</small></div></div></div></aside>
    <main className="main"><header className="topbar"><div className="crumb">{active}<span>/</span>{subject}</div><div className="topActions"><button className="searchBtn" onClick={()=>setCoachOpen(true)}>Search <kbd>Ctrl K</kbd></button><button className="iconBtn" onClick={()=>setDark(v=>!v)}>{dark?'☀':'◐'}</button><button className="coachTop" onClick={()=>setCoachOpen(true)}>Ask coach <span>↗</span></button></div></header>{page}</main>

    {coachOpen&&<div className="coachDrawer"><div className="drawerHead"><div><span className="kicker">AI COACH</span><h3>What do you need?</h3></div><button onClick={()=>setCoachOpen(false)}>×</button></div><p>I can recommend a subject, explain a weak topic, make questions, or adapt your session.</p><div className="coachChoices"><button onClick={()=>{setCoachOpen(false);openStudy(subject)}}>What should I study?</button><button onClick={()=>{setCoachOpen(false);openStudy('Chemistry 0620')}}>Help my weakest subject</button><button onClick={()=>{setCoachOpen(false);openStudy()}}>Give me questions</button></div></div>}

    {sessionOpen&&<div className="modalShade"><div className="sessionModal"><div className="sessionTop"><div><span className="kicker">ADAPTIVE SESSION · {subject}</span><h2>{bank.topic}</h2></div><button onClick={()=>setSessionOpen(false)}>×</button></div><div className="sessionSteps"><span className="on">Learn</span><span className="on">Recall</span><span className="on">Question</span><span>Mark</span><span>Review</span><span>Mini-test</span></div><div className="questionBox"><span className="questionTag">QUESTION {qIndex+1}</span><h3>{currentQuestion.q}</h3><textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer..."/><div className="questionActions"><button className="hint" onClick={()=>setFeedback(currentQuestion.hint)}>Need a hint</button><button className="primary" onClick={submit}>Check answer</button></div>{feedback&&<div className={feedback.startsWith('Correct')?'feedback good':'feedback'}>{feedback}</div>}</div>{feedback&&<div className="explainBox"><span className="kicker">COACH NOTE</span><p>{currentQuestion.a}. {currentQuestion.hint}</p><button className="textButton" onClick={nextQuestion}>Next variation →</button></div>}</div></div>}
  </div>
}
