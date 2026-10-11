(() => {
"use strict";
const APP_KEY = "lifeos-mvp-data-v1";
const THEME_KEY = "lifeos-mvp-theme-v1";
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const uid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const safeText = v => String(v ?? "");
const esc = s => safeText(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateLabel = (date, opts={month:"short",day:"numeric"}) => { if(!date)return "No date"; const d=new Date(`${date}T12:00:00`); return Number.isNaN(d.getTime()) ? "No date" : new Intl.DateTimeFormat(undefined,opts).format(d); };
const initialData = () => ({version:1,profile:{name:"My workspace"},tasks:[],projects:[],notes:[],goals:[],habits:[],habitLogs:{},preferences:{theme:"colorful",weekStartsMonday:true}});
function loadData(){
  try { const raw=localStorage.getItem(APP_KEY); if(!raw)return initialData(); const p=JSON.parse(raw); const d=initialData(); if(!p||typeof p!=="object")return d;
    for(const k of ["profile","tasks","projects","notes","goals","habits","habitLogs","preferences"]) if(p[k]!==undefined)d[k]=p[k];
    ["tasks","projects","notes","goals","habits"].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});
    if(!d.profile||typeof d.profile!=="object")d.profile={name:"My workspace"};
    if(!d.preferences||typeof d.preferences!=="object")d.preferences={theme:"colorful",weekStartsMonday:true};
    if(!d.habitLogs||typeof d.habitLogs!=="object")d.habitLogs={};
    return d;
  } catch { return initialData(); }
}
let data=loadData(), currentView="dashboard", toastTimer=null, searchQuery="", taskFilter="all", taskSort="created", calendarOffset=0;
function save(){try{localStorage.setItem(APP_KEY,JSON.stringify(data));return true}catch{notify("Storage is full or unavailable. Export your data and remove large content.");return false}}
function notify(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2400)}
function themeSet(){document.body.classList.remove("light");data.preferences.theme="colorful";try{localStorage.removeItem(THEME_KEY)}catch{}const meta=$('meta[name="theme-color"]');if(meta)meta.content="#f6f7ff"}
function applyTheme(){themeSet()}
function dueText(date){if(!date)return "No deadline";if(date<todayISO())return `Overdue · ${dateLabel(date)}`;if(date===todayISO())return "Due today";return `Due ${dateLabel(date)}`}
function activeTasks(){return data.tasks.filter(t=>!t.done)}
function setView(view){
  if(!viewNames[view]) view="dashboard";
  if(view===currentView){render();return;}
  const root=$("#view-root");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){currentView=view;render();window.scrollTo({top:0,behavior:"auto"});return;}
  root.classList.remove("is-entering");
  root.classList.add("is-leaving");
  window.setTimeout(()=>{
    currentView=view;
    render();
    root.classList.remove("is-leaving");
    root.classList.add("is-entering");
    window.scrollTo({top:0,behavior:"auto"});
    window.setTimeout(()=>root.classList.remove("is-entering"),560);
  },125);
}
function pageHead(kicker,title,subtitle,button=""){return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p></div>${button?`<div class="button-row">${button}</div>`:""}</div>`}
function btn(label,action,cls="btn",attrs=""){return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`}
function empty(icon,title,desc){return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${desc}</p></div>`}
function stat(icon,cls,label,value,note,progress=null){return `<article class="stat-card"><div class="stat-label"><span>${label}</span><span class="stat-icon ${cls}">${icon}</span></div><div class="stat-value">${value}</div>${progress!==null?`<div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>`:""}<div class="stat-note">${note}</div></article>`}
function taskRow(t){const p=t.priority||"medium";return `<li class="task-row ${t.done?"done":""}"><input class="task-check" type="checkbox" data-action="toggle-task" data-id="${esc(t.id)}" ${t.done?"checked":""} aria-label="${t.done?"Mark incomplete":"Complete"} ${esc(t.title)}"><div class="task-main"><div class="task-text">${esc(t.title)}</div><div class="task-meta"><span class="priority ${esc(p)}">${esc(p)} priority</span>${t.due?`<span>${esc(dueText(t.due))}</span>`:""}${t.projectId?`<span>· ${esc(data.projects.find(p=>p.id===t.projectId)?.name||"Project")}</span>`:""}</div></div><div class="task-actions"><button class="mini-button" data-action="edit-task" data-id="${esc(t.id)}" aria-label="Edit task">✎</button><button class="mini-button" data-action="delete-task" data-id="${esc(t.id)}" aria-label="Delete task">×</button></div></li>`}
function taskListHTML(tasks,limit=Infinity){const arr=tasks.slice(0,limit);return arr.length?`<ul class="task-list">${arr.map(taskRow).join("")}</ul>`:empty("✓","Nothing on the list","Capture a task and make a little progress.")}
function dashboard(){
 const all=data.tasks.length,done=data.tasks.filter(t=>t.done).length,open=activeTasks(),due=open.filter(t=>t.due===todayISO()).length,projectCount=data.projects.filter(p=>p.status!=="completed").length;
 const todayHabits=data.habits.filter(h=>(data.habitLogs[h.id]||[]).includes(todayISO())).length;
 const quick=`<button class="btn btn-primary" data-action="new-task">＋ Quick capture</button>`;
 return pageHead("YOUR PERSONAL WORKSPACE",'Make room for <span class="accent">what matters.</span>',"A calmer place to plan, focus, and move forward.",quick)+
 `<div class="section-head"><div><h2>Today at a glance</h2><p>Small steps add up.</p></div><span class="tag accent">● Local workspace</span></div>
 <div class="grid stats-grid">${stat("✓","mint","Tasks completed",`${done}<small> / ${all}</small>`,"Your overall task progress",all?done/all*100:0)}${stat("▦","violet","Active projects",projectCount,"Projects still in motion")}${stat("◷","amber","Due today",due,"Tasks with today's deadline")}${stat("✳","blue","Habits completed",`${todayHabits}<small> / ${data.habits.length}</small>`,"Today's habit check-in",data.habits.length?todayHabits/data.habits.length*100:0)}</div>
 <div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Today's priorities</h2><p class="panel-subtitle">Keep your focus on the essentials.</p></div>${btn("View all ↗","view-tasks","link-button")}</div><form class="quick-form" id="quick-task-form"><input class="field" name="title" maxlength="180" placeholder="Add a task you want to finish…" required aria-label="New task title"><button class="icon-add" aria-label="Add task">＋</button></form>${taskListHTML(open.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).slice(0,5))}</section>
 <section class="panel dashboard-focus"><div class="panel-head"><div><h2 class="panel-title">Focus space</h2><p class="panel-subtitle">One thing at a time.</p></div><span class="stat-icon mint">✳</span></div><div class="focus-card"><span class="focus-kicker">A GENTLE REMINDER</span><h3>You don't need to do everything today.</h3><p>Choose the next useful step. Give it your attention. Let the rest wait. LifeOS is here to support your priorities—not create more pressure.</p></div><div class="focus-foot"><span class="green-dot"></span>Progress over pressure</div><div class="subtle-line"></div><div class="section-head"><div><h2>Upcoming</h2><p>Next tasks with deadlines</p></div></div>${open.filter(t=>t.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3).map(t=>`<div class="compact-item"><div class="compact-symbol">◷</div><div class="compact-copy"><strong>${esc(t.title)}</strong><span>${esc(dueText(t.due))}</span></div></div>`).join("")||`<p class="panel-subtitle">No deadlines scheduled yet.</p>`}</section></div>
 <div class="grid bottom-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Active projects</h2><p class="panel-subtitle">The bigger picture.</p></div>${btn("Open projects ↗","view-projects","link-button")}</div>${data.projects.filter(p=>p.status!=="completed").slice(0,3).map(p=>`<div class="compact-item"><div class="compact-symbol">▦</div><div class="compact-copy"><strong>${esc(p.name)}</strong><span>${data.tasks.filter(t=>t.projectId===p.id&&!t.done).length} open tasks · ${esc(p.status||"active")}</span></div></div>`).join("")||empty("▦","Your first project","Create a project to group related tasks.")}</section><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Recently updated notes</h2><p class="panel-subtitle">Ideas worth keeping.</p></div>${btn("Open notes ↗","view-notes","link-button")}</div>${data.notes.slice().sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,3).map(n=>`<div class="compact-item"><div class="compact-symbol">▤</div><div class="compact-copy"><strong>${esc(n.title)}</strong><span>Updated ${dateLabel((n.updatedAt||todayISO()).slice(0,10))}</span></div></div>`).join("")||empty("▤","A place for your ideas","Capture a thought before it disappears.")}</section></div>`;
}
function tasksView(){let tasks=data.tasks.slice();if(taskFilter==="open")tasks=tasks.filter(t=>!t.done);if(taskFilter==="done")tasks=tasks.filter(t=>t.done);if(taskFilter==="today")tasks=tasks.filter(t=>t.due===todayISO());if(taskSort==="due")tasks.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));else if(taskSort==="priority"){const n={high:0,medium:1,low:2};tasks.sort((a,b)=>(n[a.priority]??1)-(n[b.priority]??1))}else tasks.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
 return pageHead("GET THINGS DONE","Tasks","Capture, organize, and finish your next actions.",btn("＋ New task","new-task","btn btn-primary"))+`<div class="toolbar"><input class="field" id="task-search" placeholder="Filter tasks…" value="${esc(searchQuery)}"><select class="select-field" id="task-filter"><option value="all" ${taskFilter==="all"?"selected":""}>All tasks</option><option value="open" ${taskFilter==="open"?"selected":""}>Open</option><option value="done" ${taskFilter==="done"?"selected":""}>Completed</option><option value="today" ${taskFilter==="today"?"selected":""}>Due today</option></select><select class="select-field" id="task-sort"><option value="created" ${taskSort==="created"?"selected":""}>Recently added</option><option value="due" ${taskSort==="due"?"selected":""}>Deadline</option><option value="priority" ${taskSort==="priority"?"selected":""}>Priority</option></select></div><section class="panel"><div class="panel-head"><div><h2 class="panel-title">${tasks.length} task${tasks.length===1?"":"s"}</h2><p class="panel-subtitle">Your list, your pace.</p></div><span class="tag">${data.tasks.filter(t=>!t.done).length} remaining</span></div><div id="tasks-list-root">${taskListHTML(tasks.filter(t=>t.title.toLowerCase().includes(searchQuery.toLowerCase())))}</div></section>`;
}
function projectCard(p){const related=data.tasks.filter(t=>t.projectId===p.id),completed=related.filter(t=>t.done).length,progress=related.length?Math.round(completed/related.length*100):0;return `<article class="item-card"><div class="item-top"><span class="item-symbol">▦</span><span class="tag ${p.status==="completed"?"accent":""}">${esc(p.status||"active")}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description||"No description yet.")}</p><div class="goal-progress"><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><small>${completed}/${related.length} tasks complete · ${progress}%</small></div><div class="item-footer"><span>${p.due?`Due ${dateLabel(p.due)}`:"No deadline"}</span><div class="item-actions"><button class="mini-button" data-action="edit-project" data-id="${esc(p.id)}" aria-label="Edit project">✎</button><button class="mini-button" data-action="delete-project" data-id="${esc(p.id)}" aria-label="Delete project">×</button></div></div></article>`}
function projectsView(){return pageHead("MAKE PROGRESS VISIBLE","Projects","Group related tasks into meaningful outcomes.",btn("＋ New project","new-project","btn btn-primary"))+`<div class="toolbar"><input class="field" id="project-search" placeholder="Find a project…" value="${esc(searchQuery)}"></div><div class="grid content-cards">${data.projects.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())||safeText(p.description).toLowerCase().includes(searchQuery.toLowerCase())).map(projectCard).join("")||`<div class="panel empty-wide">${empty("▦","Start with an outcome","Create a project to bring its tasks and milestones together.")}<div class="button-row" style="justify-content:center">${btn("＋ Create project","new-project","btn btn-primary")}</div></div>`}</div>`}
function noteCard(n){const tags=(n.tags||[]).filter(Boolean);return `<article class="item-card note-card"><div class="item-top"><span class="item-symbol">▤</span><span class="tag">${esc(n.folder||"Inbox")}</span></div><h3>${esc(n.title)}</h3><p class="note-body">${esc(n.content||"No content yet.")}</p><div class="note-tags">${tags.map(t=>`<span class="tag violet-tag">#${esc(t)}</span>`).join("")}</div><div class="item-footer"><span>Updated ${dateLabel((n.updatedAt||todayISO()).slice(0,10))}</span><div class="item-actions"><button class="mini-button" data-action="edit-note" data-id="${esc(n.id)}" aria-label="Edit note">✎</button><button class="mini-button" data-action="delete-note" data-id="${esc(n.id)}" aria-label="Delete note">×</button></div></div></article>`}
function notesView(){return pageHead("YOUR SECOND BRAIN","Notes & knowledge","Capture thoughts, save context, and find it later.",btn("＋ New note","new-note","btn btn-primary"))+`<div class="toolbar"><input class="field" id="note-search" placeholder="Search titles, content, and tags…" value="${esc(searchQuery)}"></div><div class="grid content-cards">${data.notes.filter(n=>(n.title+" "+n.content+" "+(n.tags||[]).join(" ")).toLowerCase().includes(searchQuery.toLowerCase())).map(noteCard).join("")||`<div class="panel empty-wide">${empty("▤","Your ideas have a home","Create a note. Markdown-style plain text is supported in this first version.")}<div class="button-row" style="justify-content:center">${btn("＋ Create note","new-note","btn btn-primary")}</div></div>`}</div>`}
function goalCard(g){const target=Math.max(1,Number(g.target)||1),value=Math.max(0,Number(g.progress)||0),pct=Math.min(100,Math.round(value/target*100));return `<article class="item-card"><div class="item-top"><span class="item-symbol">◎</span><span class="tag ${pct===100?"accent":""}">${pct===100?"Achieved":esc(g.status||"in progress")}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description||"Every meaningful change starts with a small step.")}</p><div class="goal-progress"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><small>${value} / ${target} ${esc(g.unit||"steps")} · ${pct}%</small></div><div class="item-footer"><span>${g.due?`Target ${dateLabel(g.due)}`:"Long-term goal"}</span><div class="item-actions"><button class="mini-button" data-action="goal-progress" data-id="${esc(g.id)}" aria-label="Update goal progress">＋</button><button class="mini-button" data-action="edit-goal" data-id="${esc(g.id)}" aria-label="Edit goal">✎</button><button class="mini-button" data-action="delete-goal" data-id="${esc(g.id)}" aria-label="Delete goal">×</button></div></div></article>`}
function goalsView(){const doneToday=data.habits.filter(h=>(data.habitLogs[h.id]||[]).includes(todayISO())).length;return pageHead("A LITTLE BETTER, OFTEN","Goals & habits","Make progress measurable, and consistency easier.",`<button class="btn" data-action="new-habit">＋ Habit</button>${btn("＋ New goal","new-goal","btn btn-primary")}`)+`<div class="grid stats-grid">${stat("◎","violet","Active goals",data.goals.filter(g=>(g.status||"active")!=="completed").length,"Outcomes you are working toward")}${stat("✳","mint","Daily habits",data.habits.length,"Routines you want to keep")}${stat("✓","amber","Habits done today",`${doneToday}<small> / ${data.habits.length}</small>`,"A check-in, not a judgement",data.habits.length?doneToday/data.habits.length*100:0)}${stat("↗","blue","Goals achieved",data.goals.filter(g=>Number(g.progress)>=Number(g.target)&&Number(g.target)>0).length,"Celebrate the milestones")}</div><div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Your goals</h2><p class="panel-subtitle">Progress at your own pace.</p></div>${btn("＋ Add","new-goal","link-button")}</div><div class="grid content-cards" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${data.goals.map(goalCard).join("")||empty("◎","Choose a direction","Add a goal with a measurable target.")}</div></section><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Daily habits</h2><p class="panel-subtitle">${dateLabel(todayISO(),{weekday:"long",month:"short",day:"numeric"})}</p></div>${btn("＋ Add","new-habit","link-button")}</div>${data.habits.map(h=>{const done=(data.habitLogs[h.id]||[]).includes(todayISO());const streak=habitStreak(h.id);return `<div class="habit-row"><div class="compact-symbol">✳</div><div class="habit-copy"><strong>${esc(h.name)}</strong><p>${streak} day streak · ${esc(h.frequency||"Daily")}</p></div><button class="habit-done ${done?"completed":""}" data-action="toggle-habit" data-id="${esc(h.id)}">${done?"✓ Done":"Mark done"}</button><button class="mini-button" data-action="edit-habit" data-id="${esc(h.id)}" aria-label="Edit habit">✎</button><button class="mini-button" data-action="delete-habit" data-id="${esc(h.id)}" aria-label="Delete habit">×</button></div>`}).join("")||empty("✳","Start a small ritual","Add a habit you would like to repeat.")}</section></div>`}
function habitStreak(id){const logs=(data.habitLogs[id]||[]).slice().sort().reverse();let d=new Date(`${todayISO()}T12:00:00`),count=0;const set=new Set(logs);if(!set.has(todayISO()))d.setDate(d.getDate()-1);for(let i=0;i<370;i++){const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;if(!set.has(key))break;count++;d.setDate(d.getDate()-1)}return count}
function calendarView(){const now=new Date(),first=new Date(now.getFullYear(),now.getMonth()+calendarOffset,1),year=first.getFullYear(),month=first.getMonth(),start=new Date(year,month,1),offset=(start.getDay()+6)%7,startDay=new Date(year,month,1-offset);const cells=[];for(let i=0;i<35;i++){const d=new Date(startDay);d.setDate(startDay.getDate()+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const list=data.tasks.filter(t=>t.due===key&&!t.done);cells.push(`<div class="day-cell ${key===todayISO()?"today":""}"><div class="day-name">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}</div><div class="day-number" style="${d.getMonth()!==month?"color:var(--muted)":""}">${d.getDate()}</div>${list.slice(0,2).map(t=>`<span class="day-event" title="${esc(t.title)}">${esc(t.title)}</span>`).join("")}${list.length>2?`<span class="day-name">+${list.length-2} more</span>`:""}</div>`)}
 const upcoming=data.tasks.filter(t=>!t.done&&t.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
 return pageHead("PLAN WITH INTENTION","Planning","A simple monthly view of task deadlines. Scheduled time blocks and reminders are not implemented yet.",btn("＋ Schedule a task","new-task","btn btn-primary"))+`<section class="panel"><div class="panel-head"><div><h2 class="panel-title">${new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(first)}</h2><p class="panel-subtitle">Deadlines from your tasks</p></div><div class="button-row">${btn("←","calendar-prev","btn btn-small","aria-label='Previous month'")}${btn("Today","calendar-today","btn btn-small")}${btn("→","calendar-next","btn btn-small","aria-label='Next month'")}</div></div><div class="week-grid">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>`<div class="day-name">${d}</div>`).join("")}${cells.join("")}</div></section><section class="panel" style="margin-top:15px"><div class="panel-head"><div><h2 class="panel-title">Upcoming deadlines</h2><p class="panel-subtitle">Open tasks with a due date.</p></div></div>${upcoming.length?`<ul class="task-list">${upcoming.map(taskRow).join("")}</ul>`:empty("◷","No deadlines yet","Add a due date to any task to see it here.")}</section>`;
}
function searchView(){const q=searchQuery.trim().toLowerCase();const results=[];if(q){data.tasks.forEach(x=>{if((x.title+" "+x.description).toLowerCase().includes(q))results.push({type:"Task",title:x.title,desc:x.description||dueText(x.due),view:"tasks",id:x.id})});data.projects.forEach(x=>{if((x.name+" "+x.description).toLowerCase().includes(q))results.push({type:"Project",title:x.name,desc:x.description,view:"projects",id:x.id})});data.notes.forEach(x=>{if((x.title+" "+x.content+" "+(x.tags||[]).join(" ")).toLowerCase().includes(q))results.push({type:"Note",title:x.title,desc:x.content,view:"notes",id:x.id})});data.goals.forEach(x=>{if((x.title+" "+x.description).toLowerCase().includes(q))results.push({type:"Goal",title:x.title,desc:x.description,view:"goals",id:x.id})});data.habits.forEach(x=>{if(x.name.toLowerCase().includes(q))results.push({type:"Habit",title:x.name,desc:x.frequency,view:"goals",id:x.id})})}
 return pageHead("FIND YOUR CONTEXT","Universal search","Search across tasks, projects, notes, goals, and habits.")+`<div class="toolbar"><input class="field" id="universal-search" placeholder="Try a word, title, or idea…" value="${esc(searchQuery)}" autofocus></div><div class="search-results">${q?results.map(r=>`<button class="search-result" data-action="open-result" data-view="${r.view}" data-id="${esc(r.id)}"><span class="result-type">${r.type}</span><span class="result-copy"><strong>${esc(r.title)}</strong><span>${esc(r.desc||"No additional details")}</span></span><span>↗</span></button>`).join("")||empty("⌕","No matches","Try a different search term.") : empty("⌕","Search your workspace","Start typing to search your saved LifeOS data.")}</div>`}
function settingsView(){return pageHead("YOUR DATA, YOUR CHOICE","Settings & data","Manage your workspace details and local data.")+`<div class="grid settings-grid"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Workspace preferences</h2><p class="panel-subtitle">Make LifeOS feel like yours.</p></div></div><div class="setting-row"><div class="setting-copy"><strong>Workspace name</strong><span>Shown in your sidebar.</span></div><input class="field" id="profile-name-input" maxlength="50" value="${esc(data.profile.name||"My workspace")}" aria-label="Workspace name"></div><div class="setting-row"><div class="setting-copy"><strong>Keyboard search</strong><span>Use <span class="kbd">/</span> to focus search on compatible keyboards.</span></div><span class="tag accent">Enabled</span></div></section><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Data & recovery</h2><p class="panel-subtitle">Export a copy regularly to protect your work.</p></div></div><div class="warning-note">This version stores data in this browser's localStorage. It is not encrypted, synced, or automatically backed up. Clearing browser data may delete your workspace. Do not store passwords or highly sensitive secrets here.</div><div class="setting-row"><div class="setting-copy"><strong>Export workspace</strong><span>Download tasks, projects, notes, goals, habits, and preferences as JSON.</span></div>${btn("Export JSON","export-data","btn btn-primary")}</div><div class="setting-row"><div class="setting-copy"><strong>Import workspace</strong><span>Restore a JSON export. This replaces the current workspace.</span></div>${btn("Import JSON","import-data","btn")}</div><div class="setting-row"><div class="setting-copy"><strong>Reset workspace</strong><span>Delete all local LifeOS data from this browser.</span></div>${btn("Reset data","reset-data","btn btn-danger")}</div></section></div><section class="panel" style="margin-top:15px"><div class="panel-head"><div><h2 class="panel-title">Feature status</h2><p class="panel-subtitle">Honest status of this local MVP.</p></div></div><div class="grid content-cards"><div class="compact-item"><div class="compact-symbol">✓</div><div class="compact-copy"><strong>Implemented</strong><span>Tasks, projects, notes, goals, habits, deadline calendar, colorful interface, export/import.</span></div></div><div class="compact-item"><div class="compact-symbol">◷</div><div class="compact-copy"><strong>Not yet implemented</strong><span>Accounts, cloud database, cross-device sync, notifications, attachments, recurring tasks, scheduled time blocks.</span></div></div><div class="compact-item"><div class="compact-symbol">◇</div><div class="compact-copy"><strong>AI is disabled</strong><span>No personal content is sent to an AI provider in this version.</span></div></div></div></section>`;
}

function toolsView() {
  return pageHead(
    "YOUR DIGITAL TOOLKIT",
    'Tools that <span class="accent">save you time.</span>',
    "Useful file, text, QR, and data utilities. Processing happens in your browser."
  ) + `
    <div class="grid content-cards tools-grid">

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">▦</span>
          <div>
            <h2 class="panel-title">QR code generator</h2>
            <p class="panel-subtitle">Turn text or a link into a QR code.</p>
          </div>
        </div>
        <label class="tool-label" for="qr-text">Text or URL</label>
        <textarea class="textarea-field" id="qr-text" maxlength="2000"
          placeholder="https://example.com"></textarea>
        <div class="button-row">
          <button class="btn btn-primary" data-tool="make-qr">Generate QR</button>
          <button class="btn" data-tool="download-qr">Download PNG</button>
        </div>
        <div id="qr-output" class="qr-output" aria-live="polite">
          <span class="tool-muted">Your QR code will appear here.</span>
        </div>
      </section>

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">▧</span>
          <div>
            <h2 class="panel-title">Image converter</h2>
            <p class="panel-subtitle">Convert an image to PNG, JPEG, or WebP.</p>
          </div>
        </div>
        <label class="tool-label" for="image-file">Choose an image</label>
        <input class="field" id="image-file" type="file" accept="image/*">
        <label class="tool-label" for="image-format">Output format</label>
        <select class="select-field" id="image-format">
          <option value="image/webp">WebP — smaller files</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
        </select>
        <label class="tool-label" for="image-quality">Quality (JPEG/WebP)</label>
        <input id="image-quality" type="range" min="30" max="100" value="85">
        <button class="btn btn-primary" data-tool="convert-image">Convert and download</button>
        <p class="tool-muted" id="image-status">Choose an image to begin.</p>
      </section>

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">▤</span>
          <div>
            <h2 class="panel-title">Text & data studio</h2>
            <p class="panel-subtitle">Count words, format JSON, and encode text.</p>
          </div>
        </div>
        <textarea class="textarea-field" id="text-studio" rows="7"
          placeholder="Paste text or JSON here…"></textarea>
        <div class="tool-stats" id="text-stats">0 words · 0 characters</div>
        <div class="tool-button-grid">
          <button class="btn" data-tool="count-text">Count text</button>
          <button class="btn" data-tool="format-json">Format JSON</button>
          <button class="btn" data-tool="minify-json">Minify JSON</button>
          <button class="btn" data-tool="url-encode">URL encode</button>
          <button class="btn" data-tool="url-decode">URL decode</button>
          <button class="btn" data-tool="base64-encode">Base64 encode</button>
          <button class="btn" data-tool="base64-decode">Base64 decode</button>
          <button class="btn" data-tool="copy-text">Copy text</button>
          <button class="btn" data-tool="share-text">Share text</button>
        </div>
        <p class="tool-muted" id="text-status" aria-live="polite"></p>
      </section>

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">▣</span>
          <div>
            <h2 class="panel-title">ZIP archive maker</h2>
            <p class="panel-subtitle">Bundle photos, documents, videos, and other files.</p>
          </div>
        </div>
        <label class="tool-label" for="zip-files">Select files</label>
        <input class="field" id="zip-files" type="file" multiple>
        <p class="tool-muted" id="zip-status">Choose files to create an archive.</p>
        <button class="btn btn-primary" data-tool="create-zip">Create ZIP archive</button>
        <p class="tool-muted">ZIP creation packages the selected files; it does not guarantee they will become smaller.</p>
      </section>

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">⇧</span>
          <div>
            <h2 class="panel-title">Share files</h2>
            <p class="panel-subtitle">Use your device's supported share menu.</p>
          </div>
        </div>
        <label class="tool-label" for="share-files">Choose files to share</label>
        <input class="field" id="share-files" type="file" multiple>
        <button class="btn btn-primary" data-tool="share-files">Open share menu</button>
        <p class="tool-muted" id="share-status" aria-live="polite">
          Availability depends on your browser and Android version.
        </p>
      </section>

      <section class="panel tool-panel">
        <div class="tool-heading">
          <span class="item-symbol">⌕</span>
          <div>
            <h2 class="panel-title">Quick utilities</h2>
            <p class="panel-subtitle">Fast text cleanup and practical helpers.</p>
          </div>
        </div>
        <div class="tool-button-grid">
          <button class="btn" data-tool="trim-lines">Trim blank lines</button>
          <button class="btn" data-tool="sort-lines">Sort lines</button>
          <button class="btn" data-tool="unique-lines">Remove duplicate lines</button>
          <button class="btn" data-tool="upper-text">UPPERCASE</button>
          <button class="btn" data-tool="lower-text">lowercase</button>
        </div>
        <p class="tool-muted">These actions use the text in Text & data studio.</p>
      </section>

    </div>`;
}

const viewNames={dashboard:"Overview",tasks:"Tasks",projects:"Projects",notes:"Second brain",goals:"Goals & habits",calendar:"Planning",search:"Universal search",settings:"Settings & data",tools: "Tools"};
let revealObserver=null;
function setupScrollReveals(){
 const root=$("#view-root");if(!root)return;
 if(revealObserver){revealObserver.disconnect();revealObserver=null;}
 const revealItems=root.querySelectorAll(".scroll-reveal,.scroll-reveal-child");
 revealItems.forEach(el=>el.classList.remove("scroll-reveal","scroll-reveal-child","is-visible"));
 [...root.children].forEach(el=>el.classList.add("scroll-reveal"));
 root.querySelectorAll(".stats-grid > *, .dashboard-grid > *, .bottom-grid > *, .content-cards > *, .tools-grid > *, .task-list > *, .item-grid > *, .settings-grid > *, .calendar-grid > *, .compact-item, .task-row, .item-card, .habit-row, .setting-row").forEach((el,i)=>{
   el.classList.add("scroll-reveal-child");
   el.style.setProperty("--reveal-delay",`${Math.min(i%6,5)*58}ms`);
 });
 const targets=root.querySelectorAll(".scroll-reveal,.scroll-reveal-child");
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(reduced||!("IntersectionObserver" in window)){
   targets.forEach(el=>el.classList.add("is-visible"));
   return;
 }
 revealObserver=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
     if(entry.isIntersecting){
       entry.target.classList.add("is-visible");
       revealObserver?.unobserve(entry.target);
     }
   });
 },{threshold:0.06,rootMargin:"0px 0px -5% 0px"});
 targets.forEach(el=>revealObserver.observe(el));
}
function render(){const root=$("#view-root");root.innerHTML=({dashboard,tasks:tasksView,projects:projectsView,notes:notesView,goals:goalsView,calendar:calendarView,search:searchView,tools:toolsView,settings:settingsView}[currentView]||dashboard)();$("#breadcrumb-current").textContent=viewNames[currentView]||"Overview";$$("[data-view]").forEach(b=>{const active=b.dataset.view===currentView;b.classList.toggle("active",active);if(b.closest(".mobile-nav"))active?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current")});$("#nav-task-count").textContent=String(activeTasks().length);$("#profile-name").textContent=data.profile.name||"My workspace";$("#profile-avatar").textContent=(data.profile.name||"S").trim().charAt(0).toUpperCase()||"S";$("#top-avatar").textContent=$("#profile-avatar").textContent;$("#today-date").textContent=new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date());setupScrollReveals();}
function modal(title,body,submitLabel="Save"){const root=$("#modal-root");root.innerHTML=`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Close dialog">×</button></div><form class="modal-form" id="entity-form">${body}<div class="modal-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">${submitLabel}</button></div></form></section></div>`;$("#entity-form").focus?.();const first=$("input,textarea,select",$("#entity-form"));if(first)first.focus(); }
function field(label,name,value="",type="text",opts={}){const id=`field-${name}`;const required=opts.required?"required":"";if(type==="textarea")return `<div class="form-field"><label for="${id}">${label}</label><textarea class="textarea-field" id="${id}" name="${name}" maxlength="${opts.maxlength||5000}" placeholder="${esc(opts.placeholder||"")}" ${required}>${esc(value)}</textarea></div>`;if(type==="select")return `<div class="form-field"><label for="${id}">${label}</label><select class="select-field" id="${id}" name="${name}" ${required}>${opts.options.map(o=>`<option value="${esc(o.value)}" ${o.value===value?"selected":""}>${esc(o.label)}</option>`).join("")}</select></div>`;return `<div class="form-field"><label for="${id}">${label}</label><input class="field" id="${id}" name="${name}" type="${type}" value="${esc(value)}" maxlength="${opts.maxlength||180}" placeholder="${esc(opts.placeholder||"")}" ${required}></div>`}
function taskModal(id){const t=data.tasks.find(x=>x.id===id)||{};const projects=[{value:"",label:"No project"},...data.projects.map(p=>({value:p.id,label:p.name}))];modal(id?"Edit task":"Create a task",`<input type="hidden" name="id" value="${esc(id||"")}">${field("Task title","title",t.title||"","text",{required:true,maxlength:180,placeholder:"What needs to happen?"})}<div class="form-two">${field("Priority","priority",t.priority||"medium","select",{options:[{value:"low",label:"Low"},{value:"medium",label:"Medium"},{value:"high",label:"High"}]})}${field("Deadline","due",t.due||"","date")}</div>${field("Project","projectId",t.projectId||"","select",{options:projects})}${field("Description","description",t.description||"","textarea",{maxlength:2000,placeholder:"Optional details"})}`)}
function projectModal(id){const p=data.projects.find(x=>x.id===id)||{};modal(id?"Edit project":"Create a project",`<input type="hidden" name="id" value="${esc(id||"")}">${field("Project name","name",p.name||"","text",{required:true,maxlength:100,placeholder:"What outcome are you working toward?"})}${field("Description","description",p.description||"","textarea",{maxlength:1200,placeholder:"Why does this project matter?"})}<div class="form-two">${field("Status","status",p.status||"active","select",{options:[{value:"active",label:"Active"},{value:"on-hold",label:"On hold"},{value:"completed",label:"Completed"}]})}${field("Deadline","due",p.due||"","date")}</div>`)}
function noteModal(id){const n=data.notes.find(x=>x.id===id)||{};modal(id?"Edit note":"Create a note",`<input type="hidden" name="id" value="${esc(id||"")}">${field("Title","title",n.title||"","text",{required:true,maxlength:140,placeholder:"Give this idea a name"})}${field("Content","content",n.content||"","textarea",{maxlength:12000,placeholder:"Write your thoughts here…"})}<div class="form-two">${field("Folder","folder",n.folder||"Inbox","text",{maxlength:50,placeholder:"Inbox"})}${field("Tags","tags",(n.tags||[]).join(", "),"text",{maxlength:250,placeholder:"ideas, work, learning"})}</div>`)}
function goalModal(id){const g=data.goals.find(x=>x.id===id)||{};modal(id?"Edit goal":"Create a goal",`<input type="hidden" name="id" value="${esc(id||"")}">${field("Goal title","title",g.title||"","text",{required:true,maxlength:140,placeholder:"What do you want to achieve?"})}${field("Description","description",g.description||"","textarea",{maxlength:1200,placeholder:"Why is this important?"})}<div class="form-two">${field("Current progress","progress",String(g.progress??0),"number",{required:true})}${field("Target","target",String(g.target??10),"number",{required:true})}</div><div class="form-two">${field("Unit","unit",g.unit||"steps","text",{maxlength:35,placeholder:"pages, sessions, etc."})}${field("Target date","due",g.due||"","date")}</div>`)}
function habitModal(id){const h=data.habits.find(x=>x.id===id)||{};modal(id?"Edit habit":"Create a habit",`<input type="hidden" name="id" value="${esc(id||"")}">${field("Habit name","name",h.name||"","text",{required:true,maxlength:100,placeholder:"e.g. Read for 10 minutes"})}${field("Frequency","frequency",h.frequency||"Daily","select",{options:[{value:"Daily",label:"Daily"},{value:"Weekdays",label:"Weekdays"},{value:"Weekly",label:"Weekly"}]})}${field("Why this habit matters","description",h.description||"","textarea",{maxlength:500,placeholder:"Optional reminder to yourself"})}`)}
function formObject(form){return Object.fromEntries(new FormData(form).entries())}
function saveEntity(type,obj){const list=data[type];const existing=obj.id?list.find(x=>x.id===obj.id):null;const now=new Date().toISOString();if(type==="tasks"){obj.title=obj.title.trim();obj.priority=["low","medium","high"].includes(obj.priority)?obj.priority:"medium";obj.done=existing?existing.done:false;obj.createdAt=existing?.createdAt||now;obj.updatedAt=now;obj.projectId=obj.projectId||"";obj.due=obj.due||"";obj.description=obj.description||""}
 if(type==="projects"){obj.name=obj.name.trim();obj.createdAt=existing?.createdAt||now;obj.updatedAt=now;obj.due=obj.due||""}
 if(type==="notes"){obj.title=obj.title.trim();obj.tags=(obj.tags||"").split(",").map(t=>t.trim().replace(/^#/,"")).filter(Boolean).slice(0,20);obj.createdAt=existing?.createdAt||now;obj.updatedAt=now;obj.folder=(obj.folder||"Inbox").trim()||"Inbox"}
 if(type==="goals"){obj.title=obj.title.trim();obj.progress=Math.max(0,Number(obj.progress)||0);obj.target=Math.max(1,Number(obj.target)||1);obj.unit=(obj.unit||"steps").trim();obj.due=obj.due||"";obj.status=obj.progress>=obj.target?"completed":"active";obj.createdAt=existing?.createdAt||now;obj.updatedAt=now}
 if(type==="habits"){obj.name=obj.name.trim();obj.createdAt=existing?.createdAt||now;obj.updatedAt=now}
 if(existing)Object.assign(existing,obj);else{obj.id=uid();list.unshift(obj)}save();$("#modal-root").innerHTML="";render();notify(existing?"Changes saved":"Created successfully")}
function deleteEntity(type,id,label){const item=data[type].find(x=>x.id===id);if(!item)return;if(!confirm(`Delete ${label} "${item.title||item.name}"? This cannot be undone.`))return;data[type]=data[type].filter(x=>x.id!==id);if(type==="projects")data.tasks.forEach(t=>{if(t.projectId===id)t.projectId=""});if(type==="habits")delete data.habitLogs[id];save();render();notify(`${label} deleted`)}
function exportData(){const payload={...data,exportedAt:new Date().toISOString(),app:"LifeOS local MVP"};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`lifeos-backup-${todayISO()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify("Workspace export prepared")}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));if(!parsed||typeof parsed!=="object"||!Array.isArray(parsed.tasks)||!Array.isArray(parsed.projects)||!Array.isArray(parsed.notes)||!Array.isArray(parsed.goals)||!Array.isArray(parsed.habits))throw new Error("This does not look like a LifeOS export.");if(!confirm("Import this backup and replace the current workspace? Export your current data first if you need it."))return;const clean=initialData();for(const k of ["profile","tasks","projects","notes","goals","habits","habitLogs","preferences"])if(parsed[k]!==undefined)clean[k]=parsed[k];data=clean;save();// LifeOS authentication UI.
// Admin access is deliberately not exposed as a visible control. The hidden entry
// is a long-press on the brand mark or Ctrl+Shift+. . Credentials are verified
// by the server; no admin password or privilege is stored in this front-end.
const authScreen=$("#auth-screen");
const authForm=$("#auth-form");
let authMode="signin", brandHoldTimer=null, adminBusy=false;
function setAuthMode(mode){
  authMode=mode;
  const creating=mode==="signup";
  $("#auth-title").textContent=creating?"Create your space.":"Welcome back.";
  $("#auth-subtitle").textContent=creating?"A fresh start for everything on your mind.":"Sign in to pick up where your ideas left off.";
  $("#auth-submit-label").textContent=creating?"Create account":"Sign in";
  $("#auth-switch-copy").textContent=creating?"Already have an account?":"New to LifeOS?";
  $("#auth-switch").textContent=creating?"Sign in":"Create an account";
  $("#auth-password").autocomplete=creating?"new-password":"current-password";
  $("#auth-error").textContent="";
}
$("#auth-switch")?.addEventListener("click",()=>setAuthMode(authMode==="signin"?"signup":"signin"));
async function postAuth(path,payload){
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},credentials:"same-origin",body:JSON.stringify(payload)});
  let result={};try{result=await response.json()}catch{}
  if(!response.ok||result.ok!==true)throw new Error(result.message||"Unable to authenticate. Check your credentials and try again.");
  return result;
}
authForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  const email=$("#auth-email").value.trim(),password=$("#auth-password").value;
  if(!email||password.length<4){$("#auth-error").textContent="Enter a valid email and password.";return;}
  const submit=authForm.querySelector('button[type="submit"]');
  submit.disabled=true;$("#auth-error").textContent="";
  try{
    // This endpoint must be implemented by the application's backend.
    const result=await postAuth(authMode==="signup"?"/api/auth/register":"/api/auth/login",{email,password});
    if(result.user?.name){data.profile.name=String(result.user.name).slice(0,80);save();}
    authScreen.hidden=true;render();notify(authMode==="signup"?"Account created. Welcome to LifeOS.":"Welcome back to LifeOS.");
  }catch(error){
    $("#auth-error").textContent=error.message.includes("Failed to fetch")||error instanceof TypeError
      ?"Authentication server is not connected. Connect the /api/auth service to enable sign-in."
      :error.message;
  }finally{submit.disabled=false;}
});
function openAdminGate(){
  if(authScreen.hidden||adminBusy)return;
  const backdrop=$("#auth-admin-backdrop");
  backdrop.hidden=false;
  $("#auth-admin-message").textContent="";
  $("#auth-admin-form").reset();
  setTimeout(()=>$("#auth-admin-email")?.focus(),40);
}
const brandMark=$("#auth-brand-mark");
brandMark?.addEventListener("pointerdown",()=>{
  clearTimeout(brandHoldTimer);
  brandHoldTimer=setTimeout(openAdminGate,1200);
});
["pointerup","pointerleave","pointercancel","blur"].forEach(name=>brandMark?.addEventListener(name,()=>clearTimeout(brandHoldTimer)));
brandMark?.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("keydown",e=>{
  if(authScreen.hidden)return;
  if(e.ctrlKey&&e.shiftKey&&e.key==="."){e.preventDefault();openAdminGate();}
  if(e.key==="Escape")$("#auth-admin-backdrop").hidden=true;
});
$("#auth-admin-close")?.addEventListener("click",()=>{$("#auth-admin-backdrop").hidden=true;$("#auth-admin-message").textContent="";});
$("#auth-admin-backdrop")?.addEventListener("click",e=>{if(e.target.id==="auth-admin-backdrop")e.currentTarget.hidden=true;});
$("#auth-admin-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(adminBusy)return;
  const email=$("#auth-admin-email").value.trim(),password=$("#auth-admin-password").value;
  const button=e.currentTarget.querySelector('button[type="submit"]');
  adminBusy=true;button.disabled=true;$("#auth-admin-message").textContent="";
  try{
    // Authorization is exclusively server-side. The endpoint must verify the
    // identity, enforce an admin role, rate-limit attempts, and set a secure session.
    const result=await postAuth("/api/auth/admin",{email,password});
    if(result.user?.role!=="admin")throw new Error("This account does not have administrator access.");
    $("#auth-admin-backdrop").hidden=true;authScreen.hidden=true;
    document.documentElement.dataset.role="admin";
    render();notify("Administrator session verified.");
    document.dispatchEvent(new CustomEvent("lifeos:admin-authenticated",{detail:{user:result.user}}));
  }catch(error){
    $("#auth-admin-message").textContent=error.message.includes("Failed to fetch")||error instanceof TypeError
      ?"Admin authentication service is not connected. No administrator access was granted."
      :error.message;
  }finally{adminBusy=false;button.disabled=false;}
});

applyTheme();render();notify("Workspace imported")}catch(e){alert(`Import failed: ${e.message||"Invalid backup file"}`)}};reader.readAsText(file)}
function handleAction(action,el){const id=el.dataset.id;
 switch(action){
 case"go-dashboard":setView("dashboard");break;case"view-tasks":setView("tasks");break;case"view-projects":setView("projects");break;case"view-notes":setView("notes");break;
 case"new-task":taskModal();break;case"edit-task":taskModal(id);break;case"delete-task":deleteEntity("tasks",id,"task");break;
 case"toggle-task":{const t=data.tasks.find(t=>t.id===id);if(t){t.done=el.checked;t.updatedAt=new Date().toISOString();save();render()}}break;
 case"new-project":projectModal();break;case"edit-project":projectModal(id);break;case"delete-project":deleteEntity("projects",id,"project");break;
 case"new-note":noteModal();break;case"edit-note":noteModal(id);break;case"delete-note":deleteEntity("notes",id,"note");break;
 case"new-goal":goalModal();break;case"edit-goal":goalModal(id);break;case"delete-goal":deleteEntity("goals",id,"goal");break;case"goal-progress":{const g=data.goals.find(x=>x.id===id);if(g){const v=prompt(`Current progress for "${g.title}" (target ${g.target} ${g.unit||"steps"}):`,String(g.progress||0));if(v!==null&&v.trim()!==""&&Number.isFinite(Number(v))&&Number(v)>=0){g.progress=Number(v);g.status=g.progress>=g.target?"completed":"active";save();render();notify("Goal progress updated")}else if(v!==null)notify("Enter a valid non-negative number")}}break;
 case"new-habit":habitModal();break;case"edit-habit":habitModal(id);break;case"delete-habit":deleteEntity("habits",id,"habit");break;case"toggle-habit":{const logs=data.habitLogs[id]||[];if(logs.includes(todayISO()))data.habitLogs[id]=logs.filter(x=>x!==todayISO());else data.habitLogs[id]=[...logs,todayISO()];save();render();notify("Habit check-in updated")}break;
 case"calendar-prev":calendarOffset--;render();break;case"calendar-next":calendarOffset++;render();break;case"calendar-today":calendarOffset=0;render();break;
 case"export-data":exportData();break;case"import-data":$("#import-file").click();break;case"reset-data":if(confirm("Permanently clear all LifeOS data stored in this browser? Export a backup first if you may need it.")){data=initialData();save();applyTheme();setView("dashboard");notify("Workspace reset")}break;case"close-modal":$("#modal-root").innerHTML="";break;case"backdrop-close":if(el===event.target)$("#modal-root").innerHTML="";break;
 case"open-result":setView(el.dataset.view);break;
 }
}
document.addEventListener("click",e=>{const el=e.target.closest("[data-action],[data-view]");if(!el)return;if(el.dataset.action==="backdrop-close" && e.target!==el)return;if(el.dataset.view){setView(el.dataset.view);return}handleAction(el.dataset.action,el)});
document.addEventListener("submit",e=>{if(e.target.id==="quick-task-form"){e.preventDefault();const title=new FormData(e.target).get("title").trim();if(!title)return;const now=new Date().toISOString();data.tasks.unshift({id:uid(),title,description:"",priority:"medium",due:"",projectId:"",done:false,createdAt:now,updatedAt:now});save();render();notify("Task captured");return}
 if(e.target.id==="entity-form"){e.preventDefault();const obj=formObject(e.target);const type=currentModalType();if(!type)return;const title=obj.title||obj.name||"";if(!title.trim()){notify("A title is required");return}saveEntity(type,obj)}});
let modalType=null;
const originalTaskModal=taskModal,originalProjectModal=projectModal,originalNoteModal=noteModal,originalGoalModal=goalModal,originalHabitModal=habitModal;
taskModal=function(id){modalType="tasks";originalTaskModal(id)};projectModal=function(id){modalType="projects";originalProjectModal(id)};noteModal=function(id){modalType="notes";originalNoteModal(id)};goalModal=function(id){modalType="goals";originalGoalModal(id)};habitModal=function(id){modalType="habits";originalHabitModal(id)};
function currentModalType(){return modalType}
document.addEventListener("input",e=>{if(e.target.id==="task-search"){searchQuery=e.target.value;const list=activeTasks();const filtered=(taskFilter==="done"?data.tasks.filter(t=>t.done):taskFilter==="today"?data.tasks.filter(t=>t.due===todayISO()):taskFilter==="open"?activeTasks():data.tasks).filter(t=>t.title.toLowerCase().includes(searchQuery.toLowerCase()));$("#tasks-list-root").innerHTML=taskListHTML(filtered)}if(e.target.id==="project-search"){searchQuery=e.target.value;renderPreservingInput(projectsView,"project-search")}if(e.target.id==="note-search"){searchQuery=e.target.value;renderPreservingInput(notesView,"note-search")}if(e.target.id==="universal-search"){searchQuery=e.target.value;renderPreservingInput(searchView,"universal-search")}});
function renderPreservingInput(fn,id){const el=$("#"+id),pos=el?.selectionStart;const html=fn();$("#view-root").innerHTML=html;const newEl=$("#"+id);if(newEl){newEl.focus();try{newEl.setSelectionRange(pos,pos)}catch{}}}
document.addEventListener("change",e=>{if(e.target.id==="task-filter"){taskFilter=e.target.value;render()}if(e.target.id==="task-sort"){taskSort=e.target.value;render()}if(e.target.id==="import-file"){const file=e.target.files?.[0];if(file)importData(file);e.target.value=""}if(e.target.id==="profile-name-input"){const v=e.target.value.trim();data.profile.name=v||"My workspace";save();render();notify("Workspace name saved")}});
$("#global-search").addEventListener("input",e=>{
  searchQuery=e.target.value;
  if(currentView!=="search"){
    const value=searchQuery;
    setView("search");
    window.setTimeout(()=>{const target=$("#universal-search");if(target){target.value=value;target.focus();try{target.setSelectionRange(value.length,value.length)}catch{}}},150);
    return;
  }
  renderPreservingInput(searchView,"universal-search");
  const target=$("#universal-search");
  if(target){target.value=searchQuery;try{target.setSelectionRange(searchQuery.length,searchQuery.length)}catch{}}
});
document.addEventListener("keydown",e=>{if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$("#global-search").focus()}if(e.key==="Escape")$("#modal-root").innerHTML=""});

/* ================================================
   LIFEOS TOOLS — browser-side utilities
   Paste inside the existing app closure.
   ================================================ */

function toolDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function toolText() {
  return document.querySelector("#text-studio")?.value || "";
}

function toolSetText(value, message = "Done.") {
  const box = document.querySelector("#text-studio");
  if (!box) return;
  box.value = value;
  updateToolTextStats();
  const status = document.querySelector("#text-status");
  if (status) status.textContent = message;
}

function updateToolTextStats() {
  const box = document.querySelector("#text-studio");
  const stats = document.querySelector("#text-stats");
  if (!box || !stats) return;

  const value = box.value;
  const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
  stats.textContent =
    `${words} words · ${value.length} characters · ` +
    `${new TextEncoder().encode(value).length} bytes`;
}

function encodeBase64UTF8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64UTF8(value) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function runLifeOSTool(action) {
  const text = toolText();

  try {
    switch (action) {
      case "count-text":
        updateToolTextStats();
        $("#text-status").textContent = "Text statistics updated.";
        break;

      case "format-json":
        toolSetText(JSON.stringify(JSON.parse(text), null, 2), "Valid JSON formatted.");
        break;

      case "minify-json":
        toolSetText(JSON.stringify(JSON.parse(text)), "Valid JSON minified.");
        break;

      case "url-encode":
        toolSetText(encodeURIComponent(text), "Text URL-encoded.");
        break;

      case "url-decode":
        toolSetText(decodeURIComponent(text), "URL-encoded text decoded.");
        break;

      case "base64-encode":
        toolSetText(encodeBase64UTF8(text), "UTF-8 text encoded as Base64.");
        break;

      case "base64-decode":
        toolSetText(decodeBase64UTF8(text), "Base64 decoded as UTF-8 text.");
        break;

      case "copy-text":
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard access is unavailable in this preview. Try HTTPS or a supported browser.");
        }
        navigator.clipboard.writeText(text).then(
          () => notify("Text copied."),
          () => notify("Copy failed. Check clipboard permissions.")
        );
        break;

      case "share-text":
        if (navigator.share) {
          navigator.share({ title: "LifeOS text", text })
            .catch(err => {
              if (err.name !== "AbortError") notify("Sharing was not completed.");
            });
        } else {
          throw new Error("This browser does not support the system share menu.");
        }
        break;

      case "trim-lines":
        toolSetText(
          text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean).join("\n"),
          "Blank lines removed and remaining lines trimmed."
        );
        break;

      case "sort-lines":
        toolSetText(
          text.split(/\r?\n/u).sort((a, b) => a.localeCompare(b)).join("\n"),
          "Lines sorted alphabetically."
        );
        break;

      case "unique-lines":
        toolSetText(
          [...new Set(text.split(/\r?\n/u))].join("\n"),
          "Duplicate lines removed."
        );
        break;

      case "upper-text":
        toolSetText(text.toLocaleUpperCase(), "Converted to uppercase.");
        break;

      case "lower-text":
        toolSetText(text.toLocaleLowerCase(), "Converted to lowercase.");
        break;
    }
  } catch (err) {
    const status = $("#text-status");
    if (status) status.textContent = err.message || "This operation could not be completed.";
  }
}

function makeLifeOSQRCode() {
  const value = $("#qr-text")?.value.trim();
  const output = $("#qr-output");
  if (!output) return;

  if (!value) {
    output.textContent = "Enter text or a URL first.";
    return;
  }

  if (typeof QRCode === "undefined") {
    output.textContent = "QR library did not load. Check your internet connection and reload.";
    return;
  }

  output.replaceChildren();

  try {
    new QRCode(output, {
      text: value,
      width: 220,
      height: 220,
      colorDark: "#111827",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch {
    output.textContent = "Could not generate this QR code. Try shorter text.";
  }
}

function downloadLifeOSQRCode() {
  const output = $("#qr-output");
  const canvas = output?.querySelector("canvas");
  const image = output?.querySelector("img");

  if (canvas) {
    canvas.toBlob(blob => {
      if (blob) toolDownload(blob, "lifeos-qr.png");
    }, "image/png");
  } else if (image?.src) {
    fetch(image.src)
      .then(r => r.blob())
      .then(blob => toolDownload(blob, "lifeos-qr.png"))
      .catch(() => notify("Generate the QR code again before downloading."));
  } else {
    notify("Generate a QR code first.");
  }
}

async function convertLifeOSImage() {
  const file = $("#image-file")?.files?.[0];
  const format = $("#image-format")?.value || "image/webp";
  const quality = Math.min(
    1,
    Math.max(0.3, Number($("#image-quality")?.value || 85) / 100)
  );
  const status = $("#image-status");

  if (!file) {
    if (status) status.textContent = "Choose an image first.";
    return;
  }

  if (!file.type.startsWith("image/")) {
    if (status) status.textContent = "The selected file is not an image.";
    return;
  }

  if (status) status.textContent = "Converting image…";

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");

    if (format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, format, quality)
    );

    if (!blob) throw new Error("This image format could not be created.");

    const extension = format === "image/jpeg" ? "jpg" :
      format === "image/png" ? "png" : "webp";

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "image";
    toolDownload(blob, `${baseName}-converted.${extension}`);

    if (status) {
      status.textContent =
        `Done: ${file.size.toLocaleString()} bytes → ` +
        `${blob.size.toLocaleString()} bytes. Dimensions preserved.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message || "Image conversion failed.";
  }
}

async function createLifeOSZip() {
  const files = Array.from($("#zip-files")?.files || []);
  const status = $("#zip-status");

  if (!files.length) {
    if (status) status.textContent = "Choose at least one file.";
    return;
  }

  if (typeof JSZip === "undefined") {
    if (status) status.textContent = "ZIP library did not load. Check your connection and reload.";
    return;
  }

  if (status) status.textContent = `Preparing ${files.length} file(s)…`;

  try {
    const zip = new JSZip();
    const usedNames = new Set();

    for (const file of files) {
      let name = file.name || "file";
      let unique = name;
      let number = 2;

      while (usedNames.has(unique)) {
        const dot = name.lastIndexOf(".");
        unique = dot > 0
          ? `${name.slice(0, dot)} (${number++})${name.slice(dot)}`
          : `${name} (${number++})`;
      }

      usedNames.add(unique);
      zip.file(unique, file);
    }

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 5 }
    });

    toolDownload(blob, `lifeos-archive-${todayISO()}.zip`);

    if (status) {
      status.textContent =
        `Archive created: ${files.length} file(s), ` +
        `${blob.size.toLocaleString()} bytes.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message || "ZIP creation failed.";
  }
}

async function shareLifeOSFiles() {
  const files = Array.from($("#share-files")?.files || []);
  const status = $("#share-status");

  if (!files.length) {
    if (status) status.textContent = "Choose one or more files first.";
    return;
  }

  if (!navigator.share) {
    if (status) {
      status.textContent =
        "This browser has no system file-share support. " +
        "Use your file manager to share these files instead.";
    }
    return;
  }

  try {
    if (navigator.canShare && !navigator.canShare({ files })) {
      throw new Error("This browser cannot share these selected files.");
    }

    await navigator.share({
      title: "LifeOS files",
      files
    });

    if (status) status.textContent = "Share menu completed.";
  } catch (err) {
    if (err.name === "AbortError") {
      if (status) status.textContent = "Sharing cancelled.";
    } else if (status) {
      status.textContent = err.message || "Could not share these files.";
    }
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-tool]");
  if (!button) return;

  switch (button.dataset.tool) {
    case "make-qr":
      makeLifeOSQRCode();
      break;
    case "download-qr":
      downloadLifeOSQRCode();
      break;
    case "convert-image":
      convertLifeOSImage();
      break;
    case "create-zip":
      createLifeOSZip();
      break;
    case "share-files":
      shareLifeOSFiles();
      break;
    default:
      runLifeOSTool(button.dataset.tool);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "text-studio") updateToolTextStats();
});
applyTheme();render();
const intro=$("#lifeos-intro");
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let showIntro=true;
try{showIntro=sessionStorage.getItem("lifeos-intro-seen")!=="1";if(showIntro)sessionStorage.setItem("lifeos-intro-seen","1");}catch{}
if(intro){
  if(showIntro){window.setTimeout(()=>intro.classList.add("intro-done"),reducedMotion?80:1450);window.setTimeout(()=>intro.remove(),reducedMotion?750:2200);}
  else intro.remove();
}
const initialPage=$("#view-root");
if(initialPage&&!reducedMotion){initialPage.classList.add("is-entering");window.setTimeout(()=>initialPage.classList.remove("is-entering"),560);}
})();
