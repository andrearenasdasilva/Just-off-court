import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const T = {
  bg:        "#07070A",
  surface:   "#0D0D12",
  glass:     "rgba(255,255,255,0.04)",
  glassHov:  "rgba(255,255,255,0.07)",
  border:    "rgba(255,255,255,0.07)",
  borderHov: "rgba(255,255,255,0.13)",
  orange:    "#FF4500",
  orangeL:   "#FF6A33",
  orangeGlow:"rgba(255,69,0,0.18)",
  text:      "#F5F5F7",
  sub:       "#86868B",
  muted:     "#48484A",
  green:     "#30D158",
  blue:      "#0A84FF",
  gold:      "#FFD60A",
  red:       "#FF453A",
  purple:    "#BF5AF2",
  cyan:      "#32ADE6",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  input, select, textarea, button { font-family: 'Plus Jakarta Sans', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both; }
  .fade-in { animation: fadeIn .3s ease both; }
  .scale-in { animation: scaleIn .35s cubic-bezier(.16,1,.3,1) both; }
  .card-hover { transition: all .2s cubic-bezier(.16,1,.3,1); }
  .card-hover:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.13) !important; }
  .btn-press:active { transform: scale(.97); }
  .nav-item { transition: all .15s ease; }
  .nav-item:hover { background: rgba(255,255,255,0.06) !important; }
`;

const AVATAR_COLORS = [T.orange,"#0A84FF","#30D158","#FFD60A","#BF5AF2","#FF375F","#32ADE6","#FF9F0A"];

const SECTORS = ["Alimentação & Bebidas","Automóvel","Banca & Seguros","Construção","Desporto & Fitness","Educação","Energia","Farmácia & Saúde","Hotelaria","Indústria","Moda & Lifestyle","Retalho","Tecnologia","Transportes","Outro"];

const TIERS = [
  { id:"game",   label:"Game",   full:"Game Partner",   value:2000,  color:T.green  },
  { id:"set",    label:"Set",    full:"Set Partner",    value:5000,  color:T.blue   },
  { id:"match",  label:"Match",  full:"Match Partner",  value:7500,  color:T.orange },
  { id:"naming", label:"Naming", full:"Naming Partner", value:15000, color:T.gold   },
];

const STATUSES = [
  { id:"prospecting",       label:"Prospeção",       short:"Pros.",   color:T.muted  },
  { id:"contacted",         label:"Contactado",      short:"Cont.",   color:T.blue   },
  { id:"meeting_scheduled", label:"Reunião Marcada", short:"R.Marc.", color:T.purple },
  { id:"meeting_done",      label:"Reunião Feita",   short:"R.Feita", color:T.gold   },
  { id:"interested",        label:"Interessado",     short:"Inter.",  color:T.cyan   },
  { id:"proposal",          label:"Proposta",        short:"Prop.",   color:T.orangeL},
  { id:"closed_won",        label:"Fechado ✓",       short:"Fechado", color:T.green  },
  { id:"closed_lost",       label:"Perdido",         short:"Perdido", color:T.red    },
];

const ACT_TYPES = ["Email enviado","Chamada","Reunião presencial","Reunião online","Follow-up","Proposta enviada","Outro"];

const DEFAULT_AGENTS = [
  { id:"andre",  name:"André Silva", color:T.orange, photo:"", isAdmin:true  },
  { id:"a1",     name:"Agente 1",    color:T.blue,   photo:"", isAdmin:false },
  { id:"a2",     name:"Agente 2",    color:T.green,  photo:"", isAdmin:false },
  { id:"a3",     name:"Agente 3",    color:T.purple, photo:"", isAdmin:false },
  { id:"a4",     name:"Agente 4",    color:T.gold,   photo:"", isAdmin:false },
  { id:"a5",     name:"Agente 5",    color:"#FF375F",photo:"", isAdmin:false },
];

const KEY = "just:v5:crm";
const EMPTY = { companies:[], activities:[], agents:DEFAULT_AGENTS };

/* ─── STORAGE ───────────────────────────────────────────────── */
function useStorage() {
  const [data,setData] = useState(EMPTY);
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    (async()=>{
      try{ const r=await window.storage.get(KEY); if(r){const p=JSON.parse(r.value); if(!p.agents)p.agents=DEFAULT_AGENTS; setData(p);} }catch(_){}
      setReady(true);
    })();
  },[]);
  const save = async d => { setData(d); try{await window.storage.set(KEY,JSON.stringify(d));}catch(_){} };
  return {data,save,ready};
}

/* ─── HELPERS ───────────────────────────────────────────────── */
const fmt = n => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const fmtD = s => s ? new Date(s).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"}) : "—";
const fmtDFull = s => s ? new Date(s).toLocaleDateString("pt-PT",{day:"2-digit",month:"long",year:"numeric"}) : "—";
const statusOf = id => STATUSES.find(s=>s.id===id)||STATUSES[0];
const tierOf   = id => TIERS.find(t=>t.id===id);
const daysUntil = d => d ? Math.ceil((new Date(d)-Date.now())/(1000*60*60*24)) : null;

function useCounter(target, duration=800) {
  const [val,setVal] = useState(0);
  useEffect(()=>{
    let start=0, step=target/((duration/16));
    const t=setInterval(()=>{ start+=step; if(start>=target){setVal(target);clearInterval(t);}else setVal(Math.floor(start)); },16);
    return ()=>clearInterval(t);
  },[target]);
  return val;
}

/* ─── AVATAR ────────────────────────────────────────────────── */
function Avatar({agent,size=36,ring=false}) {
  if(!agent) return null;
  const initials = agent.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,overflow:"hidden",
      background:agent.photo?"transparent":`${agent.color}22`,
      border:`${ring?2:1.5}px solid ${agent.color}${ring?"99":"44"}`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*.36,fontWeight:700,color:agent.color,
      boxShadow:ring?`0 0 0 3px ${T.surface}, 0 0 20px ${agent.color}33`:"none",
    }}>
      {agent.photo?<img src={agent.photo} alt={agent.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials}
    </div>
  );
}

/* ─── PHOTO UPLOAD ──────────────────────────────────────────── */
function PhotoUpload({agent,onPhotoChange,size=80}) {
  const ref = useRef(null);
  function handleFile(e) {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image(); img.onload=()=>{
        const canvas=document.createElement("canvas"); const MAX=300;
        let [w,h]=[img.width,img.height];
        if(w>h){if(w>MAX){h=h*(MAX/w);w=MAX;}}else{if(h>MAX){w=w*(MAX/h);h=MAX;}}
        canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        onPhotoChange(canvas.toDataURL("image/jpeg",.82));
      }; img.src=ev.target.result;
    }; reader.readAsDataURL(file);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      <div style={{position:"relative",cursor:"pointer"}} onClick={()=>ref.current.click()}>
        <Avatar agent={agent} size={size} ring/>
        <div style={{position:"absolute",bottom:2,right:2,width:24,height:24,borderRadius:"50%",
          background:T.orange,border:`2px solid ${T.surface}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,cursor:"pointer"}}>📷</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <GhostBtn onClick={()=>ref.current.click()} sm>Escolher foto</GhostBtn>
        {agent.photo&&<GhostBtn onClick={()=>onPhotoChange("")} sm danger>Remover</GhostBtn>}
      </div>
    </div>
  );
}

/* ─── ROOT ──────────────────────────────────────────────────── */
export default function App() {
  const {data,save,ready} = useStorage();
  const [meId,setMeId] = useState(null);
  const [page,setPage] = useState("dashboard");
  const [modal,setModal] = useState(null);

  if(!ready) return <Splash/>;
  const agents = data.agents||DEFAULT_AGENTS;
  const me = agents.find(a=>a.id===meId);
  if(!me) return <Login agents={agents} onSelect={setMeId}/>;

  const isAdmin=me.isAdmin;
  const companies=data.companies||[];
  const activities=data.activities||[];

  const mut = {
    addCompany(form){
      const dup=companies.find(c=>c.name.toLowerCase()===form.name.toLowerCase()||(form.email&&c.email?.toLowerCase()===form.email.toLowerCase()));
      if(dup){const o=agents.find(a=>a.id===dup.agentId);alert(`⚠️ Empresa já registada por ${o?.name||"outro agente"}.`);return false;}
      save({...data,companies:[...companies,{id:Date.now().toString(),...form,agentId:me.id,status:"prospecting",createdAt:new Date().toISOString()}]});
      return true;
    },
    updateCompany:(id,p)=>save({...data,companies:companies.map(c=>c.id===id?{...c,...p}:c)}),
    addActivity:(cid,form)=>save({...data,activities:[...activities,{id:Date.now().toString(),companyId:cid,agentId:me.id,date:new Date().toISOString(),...form}]}),
    updateAgent:(id,p)=>save({...data,agents:agents.map(a=>a.id===id?{...a,...p}:a)}),
    addAgent:a=>save({...data,agents:[...agents,a]}),
    removeAgent:id=>{if(id===me.id){alert("Não podes remover o teu perfil.");return;}save({...data,agents:agents.filter(a=>a.id!==id)});},
  };

  const ctx = {me,isAdmin,companies,activities,agents,...mut,
    actOf:id=>activities.filter(a=>a.companyId===id).sort((a,b)=>new Date(b.date)-new Date(a.date)),
    agentOf:id=>agents.find(a=>a.id===id),
    setModal,
  };

  // Expiry alerts
  const expiryAlerts = companies.filter(c=>{
    const d=daysUntil(c.partnershipEnd);
    return c.status==="closed_won" && d!==null && d>=0 && d<=30;
  });

  const PAGES = {
    dashboard:<Dashboard ctx={ctx} expiryAlerts={expiryAlerts}/>,
    pipeline:<Pipeline ctx={ctx}/>,
    wallet:<Wallet ctx={ctx}/>,
    profile:<Profile ctx={ctx} onUpdate={p=>mut.updateAgent(me.id,p)}/>,
  };

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:"'Plus Jakarta Sans',sans-serif",color:T.text,overflow:"hidden"}}>
      <style>{FONTS}</style>

      {/* Ambient glow */}
      <div style={{position:"fixed",top:"-20%",left:"10%",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle, ${T.orangeGlow} 0%, transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      <Sidebar page={page} setPage={setPage} me={me} isAdmin={isAdmin} onBack={()=>setMeId(null)} expiryCount={expiryAlerts.length}/>

      <main style={{flex:1,overflow:"auto",position:"relative",zIndex:1}}>
        <div className="fade-in" key={page}>{PAGES[page]}</div>
      </main>

      {modal?.type==="add_company"&&<Modal title="Nova Empresa" onClose={()=>setModal(null)}><CompanyForm onSubmit={f=>{if(mut.addCompany(f))setModal(null);}} onCancel={()=>setModal(null)}/></Modal>}
      {modal?.type==="company"&&<Modal title={modal.payload.name} wide onClose={()=>setModal(null)}><CompanyDetail company={modal.payload} ctx={ctx} onClose={()=>setModal(null)}/></Modal>}
      {modal?.type==="activity"&&<Modal title="Registar Atividade" onClose={()=>setModal(null)}><ActivityForm company={modal.payload} onSubmit={f=>{mut.addActivity(modal.payload.id,f);mut.updateCompany(modal.payload.id,{status:f.newStatus});setModal(null);}} onCancel={()=>setModal(null)}/></Modal>}
    </div>
  );
}

/* ─── SIDEBAR ───────────────────────────────────────────────── */
function Sidebar({page,setPage,me,isAdmin,onBack,expiryCount}) {
  const NAV = [
    {id:"dashboard",icon:"▣",label:"Dashboard"},
    {id:"pipeline", icon:"◈",label:"Pipeline" },
    {id:"wallet",   icon:"◇",label:"Carteira" },
    {id:"profile",  icon:"◉",label:"Perfil"   },
  ];
  return (
    <aside style={{width:230,background:`rgba(13,13,18,0.9)`,backdropFilter:"blur(40px)",
      borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",
      padding:"0 0 20px",position:"relative",zIndex:10,flexShrink:0}}>
      
      {/* Logo */}
      <div style={{padding:"28px 22px 22px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:T.sub,letterSpacing:.5}}>not</div>
        <div style={{fontSize:26,fontWeight:800,letterSpacing:-1.5,lineHeight:1,
          background:`linear-gradient(135deg, ${T.text} 0%, ${T.sub} 100%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>JUST</div>
        <div style={{fontSize:8,fontWeight:700,color:T.muted,letterSpacing:4,textTransform:"uppercase",marginTop:2}}>A CLUB · CRM</div>
      </div>

      {/* Nav */}
      <nav style={{padding:"14px 10px",flex:1,display:"flex",flexDirection:"column",gap:2}}>
        {NAV.map((n,i)=>{
          const active=page===n.id;
          return (
            <button key={n.id} onClick={()=>setPage(n.id)} className="nav-item btn-press"
              style={{background:active?`${T.orange}14`:"transparent",
                border:active?`1px solid ${T.orange}30`:"1px solid transparent",
                color:active?T.orange:T.sub,padding:"10px 13px",borderRadius:11,
                fontSize:13,fontWeight:active?600:400,cursor:"pointer",textAlign:"left",
                display:"flex",alignItems:"center",gap:10,
                animationDelay:`${i*0.05}s`,
              }}>
              <span style={{fontSize:16,width:20,textAlign:"center"}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==="dashboard" && expiryCount>0 &&
                <span style={{background:T.red,color:"#fff",fontSize:10,fontWeight:700,
                  padding:"2px 6px",borderRadius:20,animation:"pulse 2s infinite"}}>{expiryCount}</span>}
            </button>
          );
        })}
      </nav>

      {/* User + back */}
      <div style={{padding:"0 10px",display:"flex",flexDirection:"column",gap:6}}>
        <button onClick={()=>setPage("profile")} className="nav-item" style={{background:T.glass,
          border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 12px",
          display:"flex",alignItems:"center",gap:10,cursor:"pointer",width:"100%",textAlign:"left"}}>
          <Avatar agent={me} size={34} ring/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.name}</div>
            <div style={{fontSize:10,color:isAdmin?T.orange:T.sub,marginTop:1}}>{isAdmin?"Admin ·":""} Off Court</div>
          </div>
        </button>
        <button onClick={onBack} className="nav-item btn-press" style={{background:"transparent",
          border:`1px solid ${T.border}`,color:T.sub,padding:"9px 13px",borderRadius:11,
          fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,width:"100%"}}>
          <span style={{fontSize:14}}>⌂</span> Voltar ao início
        </button>
      </div>
    </aside>
  );
}

/* ─── DASHBOARD ─────────────────────────────────────────────── */
function Dashboard({ctx,expiryAlerts}) {
  const {me,isAdmin,companies,activities,agents,agentOf,setModal} = ctx;
  const mine = isAdmin?companies:companies.filter(c=>c.agentId===me.id);
  const hour = new Date().getHours();
  const greeting = hour<12?"Bom dia":"hour<18?"Boa tarde":"Boa noite";

  const kpis = [
    {label:"Empresas",   v:mine.length,                   color:T.blue,  icon:"🏢",  bg:"#0A84FF"},
    {label:"Reuniões",   v:mine.filter(c=>["meeting_done","interested","proposal","closed_won"].includes(c.status)).length, color:T.purple,icon:"🤝",bg:"#BF5AF2"},
    {label:"Interessados",v:mine.filter(c=>["interested","proposal"].includes(c.status)).length,color:T.gold,icon:"⚡",bg:"#FFD60A"},
    {label:"Fechados",   v:mine.filter(c=>c.status==="closed_won").length,color:T.green,icon:"🏆",bg:"#30D158"},
  ];

  const agentChart = useMemo(()=>{
    if(!isAdmin)return[];
    const map={};
    companies.forEach(c=>{map[c.agentId]=(map[c.agentId]||0)+1;});
    return Object.entries(map).map(([id,count])=>({name:(agentOf(id)?.name||"?").split(" ")[0],count,color:agentOf(id)?.color||T.orange})).sort((a,b)=>b.count-a.count);
  },[companies,isAdmin]);

  const pieData = useMemo(()=>{
    const map={};
    mine.forEach(c=>{const s=statusOf(c.status);map[s.label]=(map[s.label]||{n:0,color:s.color});map[s.label].n++;});
    return Object.entries(map).map(([name,{n,color}])=>({name,value:n,color}));
  },[mine]);

  const recent = useMemo(()=>{
    const list=isAdmin?activities:activities.filter(a=>a.agentId===me.id);
    return [...list].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  },[activities,isAdmin,me]);

  // Leaderboard
  const leaderboard = useMemo(()=>{
    if(!isAdmin)return[];
    return agents.map(a=>({
      agent:a,
      total:companies.filter(c=>c.agentId===a.id).length,
      closed:companies.filter(c=>c.agentId===a.id&&c.status==="closed_won").length,
      revenue:companies.filter(c=>c.agentId===a.id&&c.status==="closed_won"&&c.partnershipValue).reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0),
    })).sort((a,b)=>b.closed-a.closed||b.total-a.total);
  },[companies,agents,isAdmin]);

  return (
    <div style={{padding:"32px 36px",overflow:"auto",minHeight:"100vh"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}} className="fade-up">
        <div>
          <div style={{fontSize:13,color:T.sub,marginBottom:4}}>{greeting}, <span style={{color:me.color,fontWeight:600}}>{me.name.split(" ")[0]}</span> 👋</div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>Dashboard</h1>
        </div>
        <OrangeBtn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</OrangeBtn>
      </div>

      {/* Expiry alerts */}
      {expiryAlerts.length>0&&(
        <div className="fade-up" style={{background:`rgba(255,69,58,0.12)`,border:`1px solid rgba(255,69,58,0.3)`,
          borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.red}}>Parcerias a expirar em breve</div>
            <div style={{fontSize:12,color:T.sub,marginTop:2}}>
              {expiryAlerts.map(c=>`${c.name} (${daysUntil(c.partnershipEnd)}d)`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {kpis.map((k,i)=><KPICard key={k.label} {...k} delay={i*0.06}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isAdmin?"2fr 1fr":"1fr",gap:16,marginBottom:16}}>
        {/* Charts */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {isAdmin&&(
            <GlassCard title="Empresas por Agente" delay={.2}>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={agentChart} margin={{top:5,right:5,left:-25,bottom:0}}>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:T.sub,fontFamily:"Plus Jakarta Sans"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:T.sub}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,fontSize:12,fontFamily:"Plus Jakarta Sans"}} cursor={{fill:"rgba(255,255,255,0.04)"}}/>
                  <Bar dataKey="count" radius={[6,6,0,0]} name="Empresas">
                    {agentChart.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
          <GlassCard title="Pipeline por Estado" delay={isAdmin?.25:.2}>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value">
                    {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                {pieData.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                    <span style={{color:T.sub,flex:1}}>{d.name}</span>
                    <span style={{fontWeight:700,color:T.text,fontVariantNumeric:"tabular-nums"}}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Leaderboard / Activity */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {isAdmin&&leaderboard.length>0&&(
            <GlassCard title="🏆 Leaderboard" delay={.3}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {leaderboard.slice(0,5).map((d,i)=>(
                  <div key={d.agent.id} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:13,fontWeight:800,color:i===0?T.gold:T.muted,width:18,textAlign:"center"}}>{i+1}</div>
                    <Avatar agent={d.agent} size={30}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.agent.name.split(" ")[0]}</div>
                      <div style={{fontSize:10,color:T.sub}}>{d.total} emp. · {d.closed} fechados</div>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:T.green}}>{fmt(d.revenue)}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <GlassCard title="Atividade Recente" delay={.35}>
        {recent.length===0?<EmptyState text="Sem atividade registada" small/>:(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {recent.map(a=>{
              const co=ctx.companies.find(c=>c.id===a.companyId);
              const ag=ctx.agentOf(a.agentId);
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                  background:"rgba(255,255,255,0.02)",borderRadius:10,border:`1px solid ${T.border}`}}>
                  <Avatar agent={ag} size={30}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600}}>{co?.name||"—"} <span style={{color:T.sub,fontWeight:400}}>· {a.type}</span></div>
                    {a.notes&&<div style={{fontSize:11,color:T.sub,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.notes}</div>}
                  </div>
                  <div style={{fontSize:11,color:T.muted,whiteSpace:"nowrap"}}>{fmtD(a.date)}</div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function KPICard({label,v,color,icon,bg,delay=0}) {
  const count = useCounter(v);
  return (
    <div className="card-hover fade-up" style={{background:T.glass,backdropFilter:"blur(20px)",
      border:`1px solid ${T.border}`,borderRadius:16,padding:"20px 22px",
      position:"relative",overflow:"hidden",cursor:"default",animationDelay:`${delay}s`}}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",
        background:`${bg}18`,filter:"blur(20px)",pointerEvents:"none"}}/>
      <div style={{fontSize:22,marginBottom:10}}>{icon}</div>
      <div style={{fontSize:32,fontWeight:800,color,letterSpacing:-1,fontVariantNumeric:"tabular-nums"}}>{count}</div>
      <div style={{fontSize:11,color:T.sub,marginTop:4,fontWeight:500,textTransform:"uppercase",letterSpacing:.8}}>{label}</div>
    </div>
  );
}

/* ─── PIPELINE ──────────────────────────────────────────────── */
function Pipeline({ctx}) {
  const {me,isAdmin,companies,agents,agentOf,setModal} = ctx;
  const [search,setSearch] = useState("");
  const [fAgent,setFAgent] = useState("all");
  const [fStatus,setFStatus] = useState("all");
  const [view,setView] = useState("list"); // list | kanban

  const list = useMemo(()=>companies.filter(c=>{
    if(!isAdmin&&c.agentId!==me.id)return false;
    if(fAgent!=="all"&&c.agentId!==fAgent)return false;
    if(fStatus!=="all"&&c.status!==fStatus)return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  }),[companies,isAdmin,me,fAgent,fStatus,search]);

  return (
    <div style={{padding:"32px 36px",overflow:"auto",minHeight:"100vh"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}} className="fade-up">
        <div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>Pipeline</h1>
          <div style={{fontSize:13,color:T.sub,marginTop:3}}>{list.length} empresa{list.length!==1?"s":""}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* View toggle */}
          <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:3,display:"flex",gap:2}}>
            {[{v:"list",icon:"☰"},{v:"kanban",icon:"⊞"}].map(b=>(
              <button key={b.v} onClick={()=>setView(b.v)} style={{
                background:view===b.v?`${T.orange}22`:"transparent",
                border:view===b.v?`1px solid ${T.orange}40`:"1px solid transparent",
                color:view===b.v?T.orange:T.sub,
                padding:"6px 12px",borderRadius:7,fontSize:14,cursor:"pointer"}}>{b.icon}</button>
            ))}
          </div>
          <OrangeBtn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</OrangeBtn>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}} className="fade-up" style2={{animationDelay:".05s"}}>
        <div style={{flex:"1 1 200px",position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar empresa..."
            style={{...IS,width:"100%",paddingLeft:36,background:"rgba(255,255,255,0.04)"}}/>
        </div>
        {isAdmin&&(
          <select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={{...SS,minWidth:140}}>
            <option value="all">Todos os agentes</option>
            {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...SS,minWidth:140}}>
          <option value="all">Todos os estados</option>
          {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {list.length===0?<EmptyState text="Nenhuma empresa encontrada"/>:(
        view==="list"
          ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {list.map((c,i)=><CompanyRow key={c.id} company={c} ctx={ctx} delay={i*0.03}/>)}
            </div>
          : <KanbanView list={list} ctx={ctx}/>
      )}
    </div>
  );
}

function KanbanView({list,ctx}) {
  const cols = STATUSES.slice(0,6); // Show main pipeline stages
  return (
    <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:16,minHeight:400}}>
      {cols.map(s=>{
        const cards = list.filter(c=>c.status===s.id);
        return (
          <div key={s.id} style={{minWidth:220,maxWidth:220,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"0 4px"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:s.color}}/>
              <span style={{fontSize:12,fontWeight:600,color:T.sub,flex:1}}>{s.label}</span>
              <span style={{fontSize:11,color:T.muted,background:"rgba(255,255,255,0.05)",padding:"1px 7px",borderRadius:20}}>{cards.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cards.map(c=><KanbanCard key={c.id} company={c} ctx={ctx}/>)}
              {cards.length===0&&<div style={{background:"rgba(255,255,255,0.02)",border:`1px dashed ${T.border}`,borderRadius:12,padding:"20px 0",textAlign:"center",fontSize:12,color:T.muted}}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({company:c,ctx}) {
  const tier=tierOf(c.tier), owner=ctx.agentOf(c.agentId);
  return (
    <div onClick={()=>ctx.setModal({type:"company",payload:c})} className="card-hover"
      style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer"}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:6,lineHeight:1.3}}>{c.name}</div>
      <div style={{fontSize:11,color:T.sub,marginBottom:8}}>{c.sector}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {tier&&<span style={{fontSize:10,color:tier.color,background:`${tier.color}15`,padding:"2px 7px",borderRadius:20,border:`1px solid ${tier.color}30`}}>{tier.label}</span>}
        {c.partnershipValue&&<span style={{fontSize:11,fontWeight:700,color:T.green}}>{fmt(c.partnershipValue)}</span>}
      </div>
      {owner&&ctx.isAdmin&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:8}}><Avatar agent={owner} size={16}/><span style={{fontSize:10,color:T.sub}}>{owner.name.split(" ")[0]}</span></div>}
    </div>
  );
}

function CompanyRow({company:c,ctx,delay=0}) {
  const {me,isAdmin,actOf,agentOf,setModal} = ctx;
  const st=statusOf(c.status), tier=tierOf(c.tier), acts=actOf(c.id);
  const owner=agentOf(c.agentId), canEdit=isAdmin||c.agentId===me.id;
  const exp=daysUntil(c.partnershipEnd);
  return (
    <div onClick={()=>setModal({type:"company",payload:c})} className="card-hover fade-up"
      style={{background:T.glass,backdropFilter:"blur(20px)",border:`1px solid ${T.border}`,
        borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",
        animationDelay:`${delay}s`}}>
      <div style={{width:3,height:44,borderRadius:3,background:st.color,flexShrink:0,boxShadow:`0 0 8px ${st.color}66`}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5}}>
          <span style={{fontWeight:700,fontSize:14}}>{c.name}</span>
          {tier&&<Chip color={tier.color}>{tier.full}</Chip>}
          <Chip color={st.color}>{st.label}</Chip>
          {c.partnershipValue&&<Chip color={T.green}>{fmt(c.partnershipValue)}</Chip>}
          {exp!==null&&exp<=30&&exp>=0&&<Chip color={T.red}>Expira em {exp}d</Chip>}
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,color:T.sub}}>{c.sector}</span>
          {isAdmin&&owner&&<div style={{display:"flex",alignItems:"center",gap:5}}><Avatar agent={owner} size={16}/><span style={{fontSize:12,color:owner.color}}>{owner.name}</span></div>}
          {acts[0]&&<span style={{fontSize:12,color:T.muted}}>Último: {fmtD(acts[0].date)}</span>}
        </div>
      </div>
      {canEdit&&(
        <button onClick={e=>{e.stopPropagation();setModal({type:"activity",payload:c});}} className="btn-press"
          style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,color:T.text,
            padding:"7px 14px",borderRadius:9,fontSize:12,cursor:"pointer",fontWeight:600,flexShrink:0,
            transition:"all .15s"}}>+ Atividade</button>
      )}
    </div>
  );
}

/* ─── COMPANY DETAIL ────────────────────────────────────────── */
function CompanyDetail({company:c,ctx,onClose}) {
  const {me,isAdmin,actOf,agentOf,updateCompany,setModal} = ctx;
  const canEdit=isAdmin||c.agentId===me.id;
  const acts=actOf(c.id), commission=c.partnershipValue?c.partnershipValue*(c.commissionRate??0.5):null;
  const exp=daysUntil(c.partnershipEnd);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* Status bar visual */}
      <div style={{display:"flex",gap:4}}>
        {STATUSES.map(s=>{
          const active=c.status===s.id;
          const idx=STATUSES.findIndex(x=>x.id===c.status);
          const sIdx=STATUSES.findIndex(x=>x.id===s.id);
          const past=sIdx<=idx;
          return (
            <div key={s.id} style={{flex:1,height:4,borderRadius:2,
              background:active?s.color:past?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)",
              boxShadow:active?`0 0 8px ${s.color}`:"none",transition:"all .3s"}} title={s.label}/>
          );
        })}
      </div>

      {canEdit&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div><label style={LS}>Estado</label><select value={c.status} onChange={e=>updateCompany(c.id,{status:e.target.value})} style={{...SS,width:"100%"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div><label style={LS}>Nível</label><select value={c.tier||""} onChange={e=>updateCompany(c.id,{tier:e.target.value})} style={{...SS,width:"100%"}}><option value="">—</option>{TIERS.map(t=><option key={t.id} value={t.id}>{t.full} · {fmt(t.value)}</option>)}</select></div>
          <div><label style={LS}>Valor Real (€)</label><input type="number" value={c.partnershipValue||""} onChange={e=>updateCompany(c.id,{partnershipValue:Number(e.target.value)})} style={{...IS,width:"100%"}} placeholder="5000"/></div>
        </div>
      )}

      {canEdit&&(
        <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Contrato & Comissão</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
            <div><label style={LS}>Início</label><input type="date" value={c.partnershipStart||""} onChange={e=>updateCompany(c.id,{partnershipStart:e.target.value})} style={{...IS,width:"100%"}}/></div>
            <div><label style={LS}>Fim</label><input type="date" value={c.partnershipEnd||""} onChange={e=>updateCompany(c.id,{partnershipEnd:e.target.value})} style={{...IS,width:"100%"}}/></div>
            <div><label style={LS}>% Comissão</label><input type="number" min="0" max="100" value={c.commissionRate!=null?Math.round(c.commissionRate*100):50} onChange={e=>updateCompany(c.id,{commissionRate:Number(e.target.value)/100})} style={{...IS,width:"100%"}}/></div>
            <div style={{background:`${T.green}11`,border:`1px solid ${T.green}30`,borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.green,marginBottom:4,fontWeight:600}}>COMISSÃO</div>
              <div style={{fontSize:20,fontWeight:800,color:T.green}}>{commission!==null?fmt(commission):"—"}</div>
            </div>
          </div>
          {exp!==null&&exp<=30&&exp>=0&&<div style={{marginTop:10,padding:"8px 12px",background:`${T.red}11`,border:`1px solid ${T.red}30`,borderRadius:8,fontSize:12,color:T.red}}>⚠️ Esta parceria expira em {exp} dia{exp!==1?"s":""}!</div>}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[["Setor",c.sector],["Email",c.email||"—"],["Contacto",c.contact||"—"],["Agente",agentOf(c.agentId)?.name||"—"],["Criado",fmtDFull(c.createdAt)],["Notas",c.notes||"—"]].map(([l,v])=>(
          <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px",border:`1px solid ${T.border}`}}>
            <div style={LS}>{l}</div><div style={{fontSize:12,marginTop:3,color:T.sub}}>{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:T.sub}}>Histórico · {acts.length}</div>
          {canEdit&&<SmBtn onClick={()=>{onClose();setModal({type:"activity",payload:c});}}>+ Registar</SmBtn>}
        </div>
        {acts.length===0?<EmptyState text="Sem atividade" small/>:(
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto",paddingRight:4}}>
            {acts.map(a=>(
              <div key={a.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:11,padding:"12px 14px",
                borderLeft:`3px solid ${T.orange}`,borderTop:`1px solid ${T.border}`,
                borderRight:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontWeight:600,fontSize:12,color:T.orangeL}}>{a.type}</span>
                  <span style={{fontSize:11,color:T.muted}}>{fmtD(a.date)}</span>
                </div>
                {a.notes&&<div style={{fontSize:12,color:T.sub,lineHeight:1.5}}>{a.notes}</div>}
                {a.outcome&&<div style={{fontSize:12,color:T.text,marginTop:6,padding:"4px 0",borderTop:`1px solid ${T.border}`}}>→ {a.outcome}</div>}
                {a.secondMeeting&&<div style={{fontSize:11,color:T.green,marginTop:5}}>✓ Interesse em 2ª reunião</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── WALLET ────────────────────────────────────────────────── */
function Wallet({ctx}) {
  const {me,isAdmin,companies,agents,agentOf} = ctx;
  const walletData = useMemo(()=>{
    const target=isAdmin?agents:agents.filter(a=>a.id===me.id);
    return target.map(agent=>{
      const mine=companies.filter(c=>c.agentId===agent.id);
      const closed=mine.filter(c=>c.status==="closed_won"&&c.partnershipValue);
      const active=mine.filter(c=>["interested","proposal"].includes(c.status)&&c.partnershipValue);
      return {agent,
        earned:closed.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0),
        pending:active.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0),
        deals:closed.length,revenue:closed.reduce((s,c)=>s+c.partnershipValue,0)};
    });
  },[companies,agents,isAdmin,me]);

  const totalEarned=walletData.reduce((s,d)=>s+d.earned,0);
  const totalPending=walletData.reduce((s,d)=>s+d.pending,0);
  const totalRevenue=walletData.reduce((s,d)=>s+d.revenue,0);

  return (
    <div style={{padding:"32px 36px",overflow:"auto",minHeight:"100vh"}}>
      <div style={{marginBottom:28}} className="fade-up">
        <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>Carteira</h1>
        <div style={{fontSize:13,color:T.sub,marginTop:3}}>{isAdmin?"Comissões de toda a equipa":"As tuas comissões"}</div>
      </div>

      {isAdmin&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}} className="fade-up">
          {[
            {label:"Total em Comissões", v:fmt(totalEarned), color:T.green, icon:"💰"},
            {label:"Revenue Total",      v:fmt(totalRevenue),color:T.blue,  icon:"📊"},
            {label:"Pipeline Potencial", v:fmt(totalPending),color:T.gold,  icon:"⏳"},
          ].map(s=>(
            <div key={s.label} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:16,padding:"22px 24px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-15,right:-15,width:70,height:70,borderRadius:"50%",background:`${s.color}15`,filter:"blur(15px)"}}/>
              <div style={{fontSize:24,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:24,fontWeight:800,color:s.color,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
              <div style={{fontSize:11,color:T.sub,marginTop:4,textTransform:"uppercase",letterSpacing:.8}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:isAdmin?"repeat(2,1fr)":"1fr",gap:16,marginBottom:28}}>
        {walletData.map((d,i)=>(
          <div key={d.agent.id} className="card-hover fade-up" style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"24px",animationDelay:`${i*0.07}s`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <Avatar agent={d.agent} size={48} ring/>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{d.agent.name}</div>
                <div style={{fontSize:12,color:T.sub,marginTop:2}}>{d.deals} parceria{d.deals!==1?"s":""} fechada{d.deals!==1?"s":""}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:`${T.green}0D`,border:`1px solid ${T.green}25`,borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:T.green,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Ganho</div>
                <div style={{fontSize:22,fontWeight:800,color:T.green,fontVariantNumeric:"tabular-nums"}}>{fmt(d.earned)}</div>
              </div>
              <div style={{background:`${T.gold}0D`,border:`1px solid ${T.gold}25`,borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:T.gold,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Potencial</div>
                <div style={{fontSize:22,fontWeight:800,color:T.gold,fontVariantNumeric:"tabular-nums"}}>{fmt(d.pending)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deals table */}
      <GlassCard title="Parcerias Fechadas">
        {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agentId===me.id)).length===0
          ?<EmptyState text="Nenhuma parceria fechada com valor registado" small/>
          :(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agentId===me.id)).map(c=>{
              const comm=c.partnershipValue*(c.commissionRate??0.5), tier=tierOf(c.tier), owner=agentOf(c.agentId);
              return (
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                  background:"rgba(255,255,255,0.02)",borderRadius:12,border:`1px solid ${T.border}`}}>
                  <div style={{width:3,height:38,borderRadius:2,background:T.green,flexShrink:0,boxShadow:`0 0 8px ${T.green}66`}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{c.name}</div>
                    <div style={{fontSize:11,color:T.sub,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                      {tier&&<span style={{color:tier.color}}>{tier.full}</span>}
                      {isAdmin&&owner&&<div style={{display:"flex",alignItems:"center",gap:4}}><Avatar agent={owner} size={13}/><span>{owner.name}</span></div>}
                      {c.partnershipStart&&<span>{fmtD(c.partnershipStart)} → {fmtD(c.partnershipEnd)}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",marginRight:8}}>
                    <div style={{fontSize:10,color:T.muted,marginBottom:2}}>Valor</div>
                    <div style={{fontSize:13,fontWeight:700}}>{fmt(c.partnershipValue)}</div>
                  </div>
                  <div style={{background:`${T.green}0D`,border:`1px solid ${T.green}25`,borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:T.green,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>Comissão · {Math.round((c.commissionRate??0.5)*100)}%</div>
                    <div style={{fontSize:17,fontWeight:800,color:T.green}}>{fmt(comm)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ─── PROFILE ───────────────────────────────────────────────── */
function Profile({ctx,onUpdate}) {
  const {me,isAdmin,agents,addAgent,removeAgent} = ctx;
  const [name,setName]=useState(me.name);
  const [photo,setPhoto]=useState(me.photo||"");
  const [color,setColor]=useState(me.color);
  const [saved,setSaved]=useState(false);
  const [newAgentModal,setNewAgentModal]=useState(false);

  function handleSave(){onUpdate({name,photo,color});setSaved(true);setTimeout(()=>setSaved(false),2000);}

  return (
    <div style={{padding:"32px 36px",overflow:"auto",minHeight:"100vh"}}>
      <div style={{marginBottom:28}} className="fade-up">
        <h1 style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>Perfil</h1>
        <div style={{fontSize:13,color:T.sub,marginTop:3}}>Personaliza as tuas informações</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:720,marginBottom:32}}>
        <GlassCard title="Editar Perfil">
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"center",paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
              <PhotoUpload agent={{...me,name,photo,color}} onPhotoChange={setPhoto} size={88}/>
            </div>
            <div><label style={LS}>Nome</label><input value={name} onChange={e=>setName(e.target.value)} style={{...IS,width:"100%"}} placeholder="O teu nome"/></div>
            <div>
              <label style={LS}>Cor do Avatar</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:5}}>
                {AVATAR_COLORS.map(c=>(
                  <div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",
                    border:color===c?`2px solid #fff`:`2px solid transparent`,
                    boxShadow:color===c?`0 0 0 3px ${c}55`:"none",transition:"all .15s"}}/>
                ))}
              </div>
            </div>
            <button onClick={handleSave} className="btn-press" style={{
              background:saved?T.green:T.orange,color:"#fff",border:"none",
              padding:"12px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
              transition:"background .3s",boxShadow:saved?`0 0 20px ${T.green}44`:`0 0 20px ${T.orange}44`}}>
              {saved?"✓ Guardado!":"Guardar Alterações"}
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Preview">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:250,gap:16}}>
            <Avatar agent={{...me,name,photo,color}} size={88} ring/>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:20,letterSpacing:-.5}}>{name||"—"}</div>
              {me.isAdmin&&<div style={{fontSize:12,color,background:`${color}18`,padding:"4px 14px",borderRadius:20,
                border:`1px solid ${color}33`,display:"inline-block",marginTop:8,fontWeight:600}}>Admin</div>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 16px"}}>
                <div style={{fontSize:18,fontWeight:800,color}}>{ctx.companies.filter(c=>c.agentId===me.id).length}</div>
                <div style={{fontSize:10,color:T.sub,marginTop:2}}>Empresas</div>
              </div>
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 16px"}}>
                <div style={{fontSize:18,fontWeight:800,color:T.green}}>{ctx.companies.filter(c=>c.agentId===me.id&&c.status==="closed_won").length}</div>
                <div style={{fontSize:10,color:T.sub,marginTop:2}}>Fechados</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {isAdmin&&(
        <div style={{maxWidth:720}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700}}>Equipa Off Court</div>
            <SmBtn onClick={()=>setNewAgentModal(true)}>+ Novo Agente</SmBtn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {agents.map(a=>(
              <div key={a.id} className="card-hover" style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:13,
                padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                <Avatar agent={a} size={42} ring/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{a.name}</div>
                  <div style={{fontSize:11,color:T.sub,marginTop:1,display:"flex",gap:8}}>
                    <span>{a.isAdmin?"Admin":"Agente"}</span>
                    <span>· {ctx.companies.filter(c=>c.agentId===a.id).length} empresas</span>
                  </div>
                </div>
                {!a.isAdmin&&(
                  <button onClick={()=>{if(confirm(`Remover ${a.name}?`))removeAgent(a.id);}}
                    style={{background:"none",border:`1px solid ${T.red}33`,color:T.red,padding:"5px 12px",borderRadius:8,fontSize:12,cursor:"pointer"}}>Remover</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {newAgentModal&&(
        <Modal title="Novo Agente" onClose={()=>setNewAgentModal(false)}>
          <NewAgentForm onSubmit={a=>{addAgent(a);setNewAgentModal(false);}} onCancel={()=>setNewAgentModal(false)}/>
        </Modal>
      )}
    </div>
  );
}

function NewAgentForm({onSubmit,onCancel}) {
  const [name,setName]=useState(""), [photo,setPhoto]=useState(""), [color,setColor]=useState(AVATAR_COLORS[1]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"center"}}>
        <PhotoUpload agent={{name:name||"?",photo,color}} onPhotoChange={setPhoto} size={80}/>
      </div>
      <div><label style={LS}>Nome *</label><input value={name} onChange={e=>setName(e.target.value)} style={{...IS,width:"100%"}} placeholder="Nome do agente"/></div>
      <div>
        <label style={LS}>Cor</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:5}}>
          {AVATAR_COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?`2px solid #fff`:`2px solid transparent`,transition:"all .15s"}}/>)}
        </div>
      </div>
      <FormActions onCancel={onCancel} onSubmit={()=>{if(!name){alert("Escreve um nome");return;}onSubmit({id:Date.now().toString(),name,photo,color,isAdmin:false});}} label="Criar Agente"/>
    </div>
  );
}

/* ─── FORMS ─────────────────────────────────────────────────── */
function CompanyForm({onSubmit,onCancel}) {
  const [f,setF]=useState({name:"",email:"",contact:"",sector:"",notes:""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Nome *</label><input value={f.name} onChange={e=>s("name",e.target.value)} style={{...IS,width:"100%"}} placeholder="Empresa XYZ"/></div>
        <div><label style={LS}>Email</label><input value={f.email} onChange={e=>s("email",e.target.value)} style={{...IS,width:"100%"}} placeholder="geral@empresa.pt"/></div>
        <div><label style={LS}>Contacto</label><input value={f.contact} onChange={e=>s("contact",e.target.value)} style={{...IS,width:"100%"}} placeholder="João Silva"/></div>
        <div><label style={LS}>Setor *</label><select value={f.sector} onChange={e=>s("sector",e.target.value)} style={{...SS,width:"100%"}}><option value="">Selecionar...</option>{SECTORS.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      </div>
      <div><label style={LS}>Notas</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:72,resize:"vertical",width:"100%"}} placeholder="Como chegaste a esta empresa..."/></div>
      <FormActions onCancel={onCancel} onSubmit={()=>{if(!f.name||!f.sector){alert("Preenche nome e setor");return;}onSubmit(f);}} label="Adicionar"/>
    </div>
  );
}

function ActivityForm({company:c,onSubmit,onCancel}) {
  const [f,setF]=useState({type:"Email enviado",notes:"",outcome:"",secondMeeting:false,newStatus:c?.status||"contacted"});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Tipo</label><select value={f.type} onChange={e=>s("type",e.target.value)} style={{...SS,width:"100%"}}>{ACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Novo Estado</label><select value={f.newStatus} onChange={e=>s("newStatus",e.target.value)} style={{...SS,width:"100%"}}>{STATUSES.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}</select></div>
      </div>
      <div><label style={LS}>Resumo</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:72,resize:"vertical",width:"100%"}} placeholder="Como correu? O que foi discutido?"/></div>
      <div><label style={LS}>Próximo Passo</label><input value={f.outcome} onChange={e=>s("outcome",e.target.value)} style={{...IS,width:"100%"}} placeholder="Ex: Reunião marcada para..."/></div>
      <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,userSelect:"none",padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:9,border:`1px solid ${T.border}`}}>
        <input type="checkbox" checked={f.secondMeeting} onChange={e=>s("secondMeeting",e.target.checked)} style={{accentColor:T.orange,width:15,height:15}}/>
        Demonstrou interesse em 2ª reunião
      </label>
      <FormActions onCancel={onCancel} onSubmit={()=>onSubmit(f)} label="Guardar Atividade"/>
    </div>
  );
}

/* ─── LOGIN ─────────────────────────────────────────────────── */
function Login({agents,onSelect}) {
  return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <style>{FONTS}</style>
      {/* Ambient */}
      <div style={{position:"fixed",top:"10%",left:"20%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle, ${T.orangeGlow} 0%, transparent 65%)`,pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"10%",right:"15%",width:400,height:400,borderRadius:"50%",background:`radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 65%)`,pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}} className="fade-up">
          <div style={{fontSize:14,fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:T.sub,letterSpacing:.5}}>not</div>
          <div style={{fontSize:52,fontWeight:800,letterSpacing:-3,lineHeight:.95,
            background:`linear-gradient(135deg, ${T.text} 30%, ${T.sub} 100%)`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>JUST</div>
          <div style={{fontSize:9,fontWeight:700,color:T.muted,letterSpacing:5,textTransform:"uppercase",marginTop:4}}>A CLUB</div>
          <div style={{width:36,height:2,background:`linear-gradient(90deg, transparent, ${T.orange}, transparent)`,margin:"18px auto 0",borderRadius:1}}/>
          <div style={{fontSize:13,color:T.sub,marginTop:14,fontWeight:500}}>Off Court · CRM</div>
        </div>

        <div className="scale-in" style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(40px) saturate(180%)",
          border:`1px solid ${T.border}`,borderRadius:22,padding:"28px 24px",
          boxShadow:"0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)"}}>
          <div style={{fontWeight:800,fontSize:16,marginBottom:4,letterSpacing:-.3}}>Bem-vindo de volta</div>
          <div style={{fontSize:13,color:T.sub,marginBottom:22}}>Seleciona o teu perfil para entrar</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {agents.map((a,i)=>(
              <button key={a.id} onClick={()=>onSelect(a.id)} className="btn-press"
                style={{background:a.isAdmin?`${a.color}10`:"rgba(255,255,255,0.02)",
                  border:`1px solid ${a.isAdmin?a.color+"33":T.border}`,
                  color:T.text, padding:"12px 14px", borderRadius:13, fontSize:14,
                  cursor:"pointer", textAlign:"left",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  transition:"all .2s cubic-bezier(.16,1,.3,1)",
                  animationDelay:`${i*.06}s`}} className2="scale-in btn-press"
                onMouseEnter={e=>{e.currentTarget.style.background=a.isAdmin?`${a.color}18`:"rgba(255,255,255,0.05)";e.currentTarget.style.transform="scale(1.01)";}}
                onMouseLeave={e=>{e.currentTarget.style.background=a.isAdmin?`${a.color}10`:"rgba(255,255,255,0.02)";e.currentTarget.style.transform="scale(1)";}}>
                <div style={{display:"flex",alignItems:"center",gap:13}}>
                  <Avatar agent={a} size={40} ring/>
                  <span style={{fontWeight:a.isAdmin?700:500}}>{a.name}</span>
                </div>
                {a.isAdmin&&<span style={{fontSize:10,color:a.color,background:`${a.color}18`,
                  padding:"3px 10px",borderRadius:20,border:`1px solid ${a.color}44`,fontWeight:700}}>Admin</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SHARED UI ─────────────────────────────────────────────── */
function Modal({title,children,onClose,wide}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"fadeIn .2s ease"}} onClick={onClose}>
      <div className="scale-in" style={{background:"#111116",border:`1px solid ${T.border}`,borderRadius:20,
        width:"100%",maxWidth:wide?760:540,maxHeight:"92vh",overflow:"auto",padding:"26px 28px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.5)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:18,letterSpacing:-.4}}>{title}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,
            color:T.sub,fontSize:16,cursor:"pointer",width:30,height:30,borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function GlassCard({title,children,delay=0}) {
  return (
    <div className="fade-up" style={{background:T.glass,backdropFilter:"blur(20px)",border:`1px solid ${T.border}`,
      borderRadius:16,padding:"20px 22px",animationDelay:`${delay}s`}}>
      {title&&<div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:16}}>{title}</div>}
      {children}
    </div>
  );
}
function Chip({children,color}) {
  return <span style={{background:`${color}15`,color,fontSize:10,padding:"2px 8px",borderRadius:20,
    fontWeight:600,border:`1px solid ${color}25`,whiteSpace:"nowrap"}}>{children}</span>;
}
function EmptyState({text,small}) {
  return <div style={{textAlign:"center",padding:small?"24px 0":"60px 0",color:T.muted,fontSize:13}}>
    {!small&&<div style={{fontSize:40,marginBottom:10}}>🎾</div>}{text}</div>;
}
function OrangeBtn({children,onClick}) {
  return <button onClick={onClick} className="btn-press" style={{background:`linear-gradient(135deg, ${T.orange}, ${T.orangeL})`,
    color:"#fff",border:"none",padding:"10px 20px",borderRadius:10,fontWeight:700,fontSize:13,
    cursor:"pointer",boxShadow:`0 4px 20px ${T.orangeGlow}`,transition:"all .2s"}}>{children}</button>;
}
function SmBtn({children,onClick}) {
  return <button onClick={onClick} className="btn-press" style={{background:T.glass,border:`1px solid ${T.border}`,
    color:T.text,padding:"7px 14px",borderRadius:9,fontWeight:600,fontSize:12,cursor:"pointer"}}>{children}</button>;
}
function GhostBtn({children,onClick,sm,danger}) {
  return <button onClick={onClick} className="btn-press" style={{background:"transparent",
    border:`1px solid ${danger?T.red+"44":T.border}`,color:danger?T.red:T.sub,
    padding:sm?"5px 12px":"8px 16px",borderRadius:8,fontSize:sm?11:13,cursor:"pointer"}}>{children}</button>;
}
function FormActions({onCancel,onSubmit,label}) {
  return (
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
      <GhostBtn onClick={onCancel}>Cancelar</GhostBtn>
      <OrangeBtn onClick={onSubmit}>{label}</OrangeBtn>
    </div>
  );
}
function Splash() {
  return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <style>{FONTS}</style>
      <div style={{width:40,height:40,borderRadius:"50%",border:`2px solid ${T.orange}`,borderTopColor:"transparent",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:12,color:T.muted,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>A carregar...</div>
    </div>
  );
}

const LS={fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6,display:"block",fontWeight:700};
const IS={background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text,
  padding:"10px 13px",borderRadius:10,fontSize:13,outline:"none",transition:"border-color .15s",width:"100%"};
const SS={background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text,
  padding:"10px 13px",borderRadius:10,fontSize:13,cursor:"pointer",outline:"none"};
