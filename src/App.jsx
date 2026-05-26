import { useState, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const C = {
  bg:"#0A0A0B", surface:"#111113", card:"#18181C", border:"#242428", border2:"#2E2E34",
  orange:"#FF4500", orangeL:"#FF6A33", muted:"#52525C", sub:"#8A8A96",
  text:"#F0F0F4", white:"#FFFFFF", green:"#22C55E", blue:"#3B82F6", gold:"#EAB308", red:"#EF4444",
};

const AVATAR_COLORS = ["#FF4500","#3B82F6","#22C55E","#EAB308","#A855F7","#EC4899","#06B6D4","#F97316"];

const SECTORS = [
  "Alimentação & Bebidas","Automóvel","Banca & Seguros","Construção & Imobiliário",
  "Desporto & Fitness","Educação","Energia","Farmácia & Saúde",
  "Hotelaria & Turismo","Indústria","Moda & Lifestyle","Retalho","Tecnologia","Transportes","Outro"
];

const TIERS = [
  { id:"game",   label:"Game Partner",   value:2000,  color:"#22C55E" },
  { id:"set",    label:"Set Partner",    value:5000,  color:"#3B82F6" },
  { id:"match",  label:"Match Partner",  value:7500,  color:C.orange  },
  { id:"naming", label:"Naming Partner", value:15000, color:"#EAB308" },
];

const STATUSES = [
  { id:"prospecting",       label:"Prospeção",       color:C.muted   },
  { id:"contacted",         label:"Contactado",      color:C.blue    },
  { id:"meeting_scheduled", label:"Reunião Marcada", color:"#A855F7" },
  { id:"meeting_done",      label:"Reunião Feita",   color:C.gold    },
  { id:"interested",        label:"Interessado",     color:C.green   },
  { id:"proposal",          label:"Proposta",        color:C.orangeL },
  { id:"closed_won",        label:"Fechado ✓",       color:C.green   },
  { id:"closed_lost",       label:"Perdido",         color:C.red     },
];

const ACTIVITY_TYPES = ["Email enviado","Chamada","Reunião presencial","Reunião online","Follow-up","Proposta enviada","Outro"];

const DEFAULT_AGENTS = [
  { id:"andre",   name:"André Silva", color:"#FF4500", photo:"", isAdmin:true  },
  { id:"agent1",  name:"Agente 1",    color:"#3B82F6", photo:"", isAdmin:false },
  { id:"agent2",  name:"Agente 2",    color:"#22C55E", photo:"", isAdmin:false },
  { id:"agent3",  name:"Agente 3",    color:"#A855F7", photo:"", isAdmin:false },
  { id:"agent4",  name:"Agente 4",    color:"#EAB308", photo:"", isAdmin:false },
  { id:"agent5",  name:"Agente 5",    color:"#EC4899", photo:"", isAdmin:false },
];

const KEY = "just:v3:crm";
const EMPTY = { companies:[], activities:[], agents: DEFAULT_AGENTS };

function useStorage() {
  const [data, setData] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r) {
          const parsed = JSON.parse(r.value);
          if (!parsed.agents) parsed.agents = DEFAULT_AGENTS;
          setData(parsed);
        }
      } catch(_) {}
      setReady(true);
    })();
  }, []);
  const save = async (d) => { setData(d); try { await window.storage.set(KEY, JSON.stringify(d)); } catch(_) {} };
  return { data, save, ready };
}

const fmt = (n) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-PT") : "—";
const statusOf = (id) => STATUSES.find(s=>s.id===id)||STATUSES[0];
const tierOf   = (id) => TIERS.find(t=>t.id===id);

/* ── AVATAR ─────────────────────────────────────────────────── */
function Avatar({ agent, size=36 }) {
  if (!agent) return null;
  const initials = agent.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0, overflow:"hidden",
      background: agent.photo ? "transparent" : agent.color+"33",
      border:`2px solid ${agent.color}55`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.35, fontWeight:800, color:agent.color,
    }}>
      {agent.photo
        ? <img src={agent.photo} alt={agent.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"} />
        : initials}
    </div>
  );
}

/* ── ROOT ───────────────────────────────────────────────────── */
export default function App() {
  const { data, save, ready } = useStorage();
  const [meId, setMeId] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);

  if (!ready) return <Loader />;

  const agents = data.agents || DEFAULT_AGENTS;
  const me = agents.find(a=>a.id===meId);

  if (!me) return <Login agents={agents} onSelect={setMeId} />;

  const isAdmin = me.isAdmin;
  const companies = data.companies || [];
  const activities = data.activities || [];

  function addCompany(form) {
    const dup = companies.find(c =>
      c.name.toLowerCase()===form.name.toLowerCase() ||
      (form.email && c.email?.toLowerCase()===form.email.toLowerCase())
    );
    if (dup) {
      const owner = agents.find(a=>a.id===dup.agentId);
      alert(`⚠️ Empresa já registada por ${owner?.name||"outro agente"}.`);
      return false;
    }
    const c = { id:Date.now().toString(), ...form, agentId:me.id, status:"prospecting", createdAt:new Date().toISOString() };
    save({ ...data, companies:[...companies, c] });
    return true;
  }

  function updateCompany(id, patch) {
    save({ ...data, companies:companies.map(c=>c.id===id?{...c,...patch}:c) });
  }

  function addActivity(companyId, form) {
    const a = { id:Date.now().toString(), companyId, agentId:me.id, date:new Date().toISOString(), ...form };
    save({ ...data, activities:[...activities, a] });
  }

  function updateAgent(id, patch) {
    save({ ...data, agents:agents.map(a=>a.id===id?{...a,...patch}:a) });
  }

  function addAgent(agent) {
    save({ ...data, agents:[...agents, agent] });
  }

  function removeAgent(id) {
    if (id===me.id) { alert("Não podes remover o teu próprio perfil."); return; }
    save({ ...data, agents:agents.filter(a=>a.id!==id) });
  }

  const actOf = (id) => activities.filter(a=>a.companyId===id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const agentOf = (id) => agents.find(a=>a.id===id);

  const ctx = { me, isAdmin, companies, activities, agents, actOf, agentOf,
    addCompany, updateCompany, addActivity, updateAgent, addAgent, removeAgent, setModal };

  const PAGES = {
    dashboard: <Dashboard ctx={ctx}/>,
    pipeline:  <Pipeline ctx={ctx}/>,
    wallet:    <Wallet ctx={ctx}/>,
    profile:   <Profile ctx={ctx} onUpdate={(patch)=>updateAgent(me.id,patch)} />,
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Sora',sans-serif", color:C.text, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:ital@1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px;}
        input,select,textarea,button{font-family:'Sora',sans-serif;}
      `}</style>

      {/* Sidebar */}
      <aside style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"0 0 16px" }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
          <Logo />
        </div>

        <nav style={{ padding:"12px", flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {[
            { id:"dashboard", icon:"◈", label:"Dashboard" },
            { id:"pipeline",  icon:"◎", label:"Pipeline"  },
            { id:"wallet",    icon:"◇", label:"Carteira"  },
            { id:"profile",   icon:"◉", label:"Perfil"    },
          ].map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{
              background:page===n.id?C.orange+"18":"transparent",
              border:page===n.id?`1px solid ${C.orange}33`:"1px solid transparent",
              color:page===n.id?C.orange:C.sub,
              padding:"11px 14px", borderRadius:10, fontSize:13, fontWeight:page===n.id?600:400,
              cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all .15s"
            }}>
              <span style={{fontSize:15}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        {/* User card + back to home */}
        <div style={{ padding:"0 12px", display:"flex", flexDirection:"column", gap:8 }}>
          <div onClick={()=>setPage("profile")} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <Avatar agent={me} size={34} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me.name}</div>
              {isAdmin && <div style={{ fontSize:10, color:C.orange }}>Admin</div>}
            </div>
          </div>
          {/* Voltar ao início */}
          <button onClick={()=>setMeId(null)} style={{
            background:"transparent", border:`1px solid ${C.border}`, color:C.sub,
            padding:"9px 14px", borderRadius:10, fontSize:12, cursor:"pointer",
            display:"flex", alignItems:"center", gap:8, transition:"all .15s", width:"100%",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.orange+"66";e.currentTarget.style.color=C.orange;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.sub;}}
          >
            <span style={{fontSize:14}}>⌂</span> Voltar ao início
          </button>
        </div>
      </aside>

      <main style={{ flex:1, overflow:"auto" }}>
        {PAGES[page]}
      </main>

      {/* Modals */}
      {modal?.type==="add_company" && (
        <Modal title="Nova Empresa" onClose={()=>setModal(null)}>
          <CompanyForm onSubmit={f=>{ if(addCompany(f)) setModal(null); }} onCancel={()=>setModal(null)} />
        </Modal>
      )}
      {modal?.type==="company" && (
        <Modal title={modal.payload.name} wide onClose={()=>setModal(null)}>
          <CompanyDetail company={modal.payload} ctx={ctx} onClose={()=>setModal(null)} />
        </Modal>
      )}
      {modal?.type==="activity" && (
        <Modal title="Registar Atividade" onClose={()=>setModal(null)}>
          <ActivityForm
            company={modal.payload}
            onSubmit={f=>{ addActivity(modal.payload.id,f); updateCompany(modal.payload.id,{status:f.newStatus}); setModal(null); }}
            onCancel={()=>setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ── LOGO ───────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{lineHeight:1}}>
      <div style={{fontSize:11,fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:C.sub,marginBottom:2}}>not</div>
      <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:-1}}>JUST</div>
      <div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:3,textTransform:"uppercase",marginTop:1}}>A CLUB</div>
    </div>
  );
}

/* ── LOGIN ──────────────────────────────────────────────────── */
function Login({ agents, onSelect }) {
  return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:ital@1&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:C.sub}}>not</div>
          <div style={{fontSize:42,fontWeight:800,letterSpacing:-2,color:C.text,lineHeight:1}}>JUST</div>
          <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:5,textTransform:"uppercase",marginTop:2}}>A CLUB</div>
          <div style={{width:40,height:2,background:C.orange,margin:"16px auto 0",borderRadius:1}}/>
          <div style={{fontSize:13,color:C.sub,marginTop:16}}>Off Court CRM</div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"28px 24px"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Bem-vindo de volta</div>
          <div style={{fontSize:13,color:C.sub,marginBottom:20}}>Seleciona o teu perfil</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {agents.map(a=>(
              <button key={a.id} onClick={()=>onSelect(a.id)} style={{
                background:a.isAdmin?a.color+"18":"transparent",
                border:`1px solid ${a.isAdmin?a.color+"44":C.border}`,
                color:C.text, padding:"12px 14px", borderRadius:11, fontSize:14,
                cursor:"pointer", textAlign:"left",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                transition:"all .15s",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Avatar agent={a} size={36} />
                  <span style={{fontWeight:a.isAdmin?700:400}}>{a.name}</span>
                </div>
                {a.isAdmin && <span style={{fontSize:10,color:a.color,background:a.color+"18",padding:"3px 9px",borderRadius:20,border:`1px solid ${a.color}44`}}>Admin</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PROFILE PAGE ───────────────────────────────────────────── */
function Profile({ ctx, onUpdate }) {
  const { me, isAdmin, agents, addAgent, removeAgent, updateAgent } = ctx;
  const [name, setName] = useState(me.name);
  const [photo, setPhoto] = useState(me.photo||"");
  const [color, setColor] = useState(me.color);
  const [saved, setSaved] = useState(false);
  const [newAgentModal, setNewAgentModal] = useState(false);

  function handleSave() {
    onUpdate({ name, photo, color });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  return (
    <div style={{padding:"32px",overflow:"auto"}}>
      <PageHeader title="Perfil" sub="Edita as tuas informações" />

      {/* My profile */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,maxWidth:700,marginBottom:32}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"24px"}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:20}}>O meu perfil</div>

          {/* Avatar preview */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:24}}>
            <Avatar agent={{...me,name,photo,color}} size={80} />
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LS}>Nome</label>
              <input value={name} onChange={e=>setName(e.target.value)} style={{...IS,width:"100%"}} placeholder="O teu nome" />
            </div>
            <div>
              <label style={LS}>Foto (URL da imagem)</label>
              <input value={photo} onChange={e=>setPhoto(e.target.value)} style={{...IS,width:"100%"}} placeholder="https://..." />
            </div>
            <div>
              <label style={LS}>Cor do Avatar</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                {AVATAR_COLORS.map(c=>(
                  <div key={c} onClick={()=>setColor(c)} style={{
                    width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",
                    border:color===c?`3px solid ${C.white}`:`3px solid transparent`,
                    transition:"all .15s"
                  }}/>
                ))}
              </div>
            </div>
            <button onClick={handleSave} style={{
              background:saved?C.green:C.orange,color:C.white,border:"none",
              padding:"11px",borderRadius:9,fontWeight:700,fontSize:13,cursor:"pointer",
              transition:"background .3s",marginTop:4
            }}>
              {saved?"✓ Guardado!":"Guardar alterações"}
            </button>
          </div>
        </div>

        {/* Preview card */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"24px"}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:20}}>Preview</div>
          <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"center",paddingTop:16}}>
            <Avatar agent={{...me,name,photo,color}} size={72} />
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>{name||"O teu nome"}</div>
              {me.isAdmin && <div style={{fontSize:12,color:color,background:color+"18",padding:"3px 12px",borderRadius:20,border:`1px solid ${color}44`,display:"inline-block"}}>Admin</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Team management — admin only */}
      {isAdmin && (
        <div style={{maxWidth:700}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700}}>Gestão da Equipa</div>
            <Btn sm onClick={()=>setNewAgentModal(true)}>+ Novo Agente</Btn>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {agents.map(a=>(
              <div key={a.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                <Avatar agent={a} size={40} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{a.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{a.isAdmin?"Administrador":"Agente"}</div>
                </div>
                {!a.isAdmin && (
                  <button onClick={()=>{ if(confirm(`Remover ${a.name}?`)) removeAgent(a.id); }} style={{background:"none",border:`1px solid ${C.red}44`,color:C.red,padding:"5px 12px",borderRadius:7,fontSize:12,cursor:"pointer"}}>
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {newAgentModal && (
        <Modal title="Novo Agente" onClose={()=>setNewAgentModal(false)}>
          <NewAgentForm
            onSubmit={agent=>{ addAgent(agent); setNewAgentModal(false); }}
            onCancel={()=>setNewAgentModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function NewAgentForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[1]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
        <Avatar agent={{name:name||"?",photo,color}} size={64} />
      </div>
      <div><label style={LS}>Nome *</label><input value={name} onChange={e=>setName(e.target.value)} style={{...IS,width:"100%"}} placeholder="Nome do agente" /></div>
      <div><label style={LS}>Foto (URL)</label><input value={photo} onChange={e=>setPhoto(e.target.value)} style={{...IS,width:"100%"}} placeholder="https://..." /></div>
      <div>
        <label style={LS}>Cor do Avatar</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
          {AVATAR_COLORS.map(c=>(
            <div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?`3px solid ${C.white}`:`3px solid transparent`,transition:"all .15s"}}/>
          ))}
        </div>
      </div>
      <FormActions onCancel={onCancel} onSubmit={()=>{ if(!name){alert("Escreve um nome");return;} onSubmit({id:Date.now().toString(),name,photo,color,isAdmin:false}); }} label="Criar Agente" />
    </div>
  );
}

/* ── DASHBOARD ──────────────────────────────────────────────── */
function Dashboard({ ctx }) {
  const { me, isAdmin, companies, activities, agents, agentOf, setModal } = ctx;
  const mine = isAdmin ? companies : companies.filter(c=>c.agentId===me.id);

  const kpis = [
    { label:"Empresas",    value:mine.length,                                                                    icon:"🏢", color:C.blue   },
    { label:"Reuniões",    value:mine.filter(c=>["meeting_done","interested","proposal","closed_won"].includes(c.status)).length, icon:"🤝", color:"#A855F7"},
    { label:"Interessados",value:mine.filter(c=>["interested","proposal"].includes(c.status)).length,            icon:"⚡", color:C.gold   },
    { label:"Fechados",    value:mine.filter(c=>c.status==="closed_won").length,                                 icon:"🏆", color:C.green  },
  ];

  const agentChart = useMemo(()=>{
    if(!isAdmin) return [];
    const map={};
    companies.forEach(c=>{ map[c.agentId]=(map[c.agentId]||0)+1; });
    return Object.entries(map).map(([id,count])=>({
      name:(agentOf(id)?.name||"?").split(" ")[0], count, color: agentOf(id)?.color||C.orange
    })).sort((a,b)=>b.count-a.count);
  },[companies,isAdmin,agents]);

  const pieData = useMemo(()=>{
    const map={};
    mine.forEach(c=>{ const s=statusOf(c.status); map[s.label]=(map[s.label]||{count:0,color:s.color}); map[s.label].count++; });
    return Object.entries(map).map(([name,{count,color}])=>({name,value:count,color}));
  },[mine]);

  const recent = useMemo(()=>{
    const list = isAdmin ? activities : activities.filter(a=>a.agentId===me.id);
    return [...list].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  },[activities,isAdmin,me]);

  return (
    <div style={{padding:"32px",overflow:"auto"}}>
      <PageHeader title="Dashboard" sub={isAdmin?"Visão geral da equipa":"A tua atividade"} action={<Btn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</Btn>} />

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
        {kpis.map(k=>(
          <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-10,right:-10,fontSize:52,opacity:.06}}>{k.icon}</div>
            <div style={{fontSize:11,color:C.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{k.label}</div>
            <div style={{fontSize:34,fontWeight:800,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isAdmin?"1fr 1fr":"1fr",gap:18,marginBottom:24}}>
        {isAdmin && (
          <ChartCard title="Empresas por Agente">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentChart} margin={{top:5,right:5,left:-20,bottom:0}}>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} cursor={{fill:C.orange+"11"}}/>
                <Bar dataKey="count" radius={[6,6,0,0]} name="Empresas">
                  {agentChart.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        <ChartCard title="Pipeline por Estado">
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
              {pieData.map(d=>(
                <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                  <span style={{color:C.sub,flex:1}}>{d.name}</span>
                  <span style={{fontWeight:700}}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Atividade Recente">
        {recent.length===0 ? <Empty text="Sem atividade registada"/> : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {recent.map(a=>{
              const co=ctx.companies.find(c=>c.id===a.companyId);
              const ag=agentOf(a.agentId);
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <Avatar agent={ag} size={32}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{co?.name||"—"} <span style={{color:C.muted,fontWeight:400}}>· {a.type}</span></div>
                    {a.notes && <div style={{fontSize:12,color:C.sub,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.notes}</div>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtDate(a.date)}</div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ── PIPELINE ───────────────────────────────────────────────── */
function Pipeline({ ctx }) {
  const { me, isAdmin, companies, agents, setModal } = ctx;
  const [search, setSearch] = useState("");
  const [fAgent, setFAgent] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const list = useMemo(()=>companies.filter(c=>{
    if(!isAdmin && c.agentId!==me.id) return false;
    if(fAgent!=="all" && c.agentId!==fAgent) return false;
    if(fStatus!=="all" && c.status!==fStatus) return false;
    if(search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[companies,isAdmin,me,fAgent,fStatus,search]);

  return (
    <div style={{padding:"32px",overflow:"auto"}}>
      <PageHeader title="Pipeline" sub={`${list.length} empresa${list.length!==1?"s":""}`} action={<Btn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</Btn>}/>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." style={{...IS,flex:"1 1 180px",minWidth:0}}/>
        {isAdmin && (
          <select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={SS}>
            <option value="all">Todos os agentes</option>
            {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={SS}>
          <option value="all">Todos os estados</option>
          {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      {list.length===0 ? <Empty text="Nenhuma empresa encontrada"/> : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {list.map(c=><CompanyRow key={c.id} company={c} ctx={ctx}/>)}
        </div>
      )}
    </div>
  );
}

function CompanyRow({ company:c, ctx }) {
  const { me, isAdmin, actOf, agentOf, setModal } = ctx;
  const st=statusOf(c.status), tier=tierOf(c.tier), acts=actOf(c.id);
  const owner=agentOf(c.agentId);
  const canEdit=isAdmin||c.agentId===me.id;
  return (
    <div onClick={()=>setModal({type:"company",payload:c})} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"border-color .15s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.border2}
      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
    >
      <div style={{width:3,height:40,borderRadius:2,background:st.color,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:14}}>{c.name}</span>
          {tier && <Tag color={tier.color}>{tier.label}</Tag>}
          <Tag color={st.color}>{st.label}</Tag>
          {c.partnershipValue && <Tag color={C.green}>{fmt(c.partnershipValue)}</Tag>}
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,color:C.sub}}>{c.sector}</span>
          {isAdmin && owner && <div style={{display:"flex",alignItems:"center",gap:5}}><Avatar agent={owner} size={16}/><span style={{fontSize:12,color:owner.color}}>{owner.name}</span></div>}
          {acts[0] && <span style={{fontSize:12,color:C.muted}}>Último: {fmtDate(acts[0].date)}</span>}
        </div>
      </div>
      {canEdit && (
        <button onClick={e=>{e.stopPropagation();setModal({type:"activity",payload:c});}} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:"7px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600,flexShrink:0}}>
          + Atividade
        </button>
      )}
    </div>
  );
}

/* ── COMPANY DETAIL ─────────────────────────────────────────── */
function CompanyDetail({ company:c, ctx, onClose }) {
  const { me, isAdmin, actOf, agentOf, updateCompany, setModal } = ctx;
  const canEdit=isAdmin||c.agentId===me.id;
  const acts=actOf(c.id);
  const commission=c.partnershipValue?c.partnershipValue*(c.commissionRate??0.5):null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {canEdit && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div><label style={LS}>Estado</label><select value={c.status} onChange={e=>updateCompany(c.id,{status:e.target.value})} style={{...SS,width:"100%"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div><label style={LS}>Nível</label><select value={c.tier||""} onChange={e=>updateCompany(c.id,{tier:e.target.value})} style={{...SS,width:"100%"}}><option value="">Não definido</option>{TIERS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div><label style={LS}>Valor (€)</label><input type="number" value={c.partnershipValue||""} onChange={e=>updateCompany(c.id,{partnershipValue:Number(e.target.value)})} style={{...IS,width:"100%"}} placeholder="5000"/></div>
        </div>
      )}
      {canEdit && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Contrato & Comissão</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,alignItems:"end"}}>
            <div><label style={LS}>Início</label><input type="date" value={c.partnershipStart||""} onChange={e=>updateCompany(c.id,{partnershipStart:e.target.value})} style={{...IS,width:"100%"}}/></div>
            <div><label style={LS}>Fim</label><input type="date" value={c.partnershipEnd||""} onChange={e=>updateCompany(c.id,{partnershipEnd:e.target.value})} style={{...IS,width:"100%"}}/></div>
            <div><label style={LS}>% Comissão</label><input type="number" min="0" max="100" value={c.commissionRate!=null?Math.round(c.commissionRate*100):50} onChange={e=>updateCompany(c.id,{commissionRate:Number(e.target.value)/100})} style={{...IS,width:"100%"}}/></div>
            <div style={{background:C.card,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.green}33`}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Comissão</div>
              <div style={{fontSize:18,fontWeight:800,color:C.green}}>{commission!==null?fmt(commission):"—"}</div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[["Setor",c.sector],["Email",c.email||"—"],["Contacto",c.contact||"—"],["Agente",agentOf(c.agentId)?.name||"—"],["Adicionada",fmtDate(c.createdAt)],["Notas",c.notes||"—"]].map(([l,v])=>(
          <div key={l} style={{background:C.surface,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
            <div style={LS}>{l}</div><div style={{fontSize:13,marginTop:2}}>{v}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Histórico ({acts.length})</div>
          {canEdit && <Btn sm onClick={()=>{onClose();setModal({type:"activity",payload:c});}}>+ Registar</Btn>}
        </div>
        {acts.length===0?<Empty text="Sem atividade"/>:(
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
            {acts.map(a=>(
              <div key={a.id} style={{background:C.surface,borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${C.orange}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:13,color:C.orangeL}}>{a.type}</span>
                  <span style={{fontSize:11,color:C.muted}}>{fmtDate(a.date)}</span>
                </div>
                {a.notes && <div style={{fontSize:13,color:C.sub}}>{a.notes}</div>}
                {a.outcome && <div style={{fontSize:12,color:C.text,marginTop:6}}>→ {a.outcome}</div>}
                {a.secondMeeting && <div style={{fontSize:11,color:C.green,marginTop:4}}>✓ Interesse em 2ª reunião</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── WALLET ─────────────────────────────────────────────────── */
function Wallet({ ctx }) {
  const { me, isAdmin, companies, agents, agentOf } = ctx;
  const walletData = useMemo(()=>{
    const target = isAdmin ? agents : agents.filter(a=>a.id===me.id);
    return target.map(agent=>{
      const mine=companies.filter(c=>c.agentId===agent.id);
      const closed=mine.filter(c=>c.status==="closed_won"&&c.partnershipValue);
      const active=mine.filter(c=>["interested","proposal","meeting_done"].includes(c.status)&&c.partnershipValue);
      return {
        agent,
        earned:closed.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0),
        pending:active.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0),
        deals:closed.length, activePipeline:active.length
      };
    });
  },[companies,agents,isAdmin,me]);

  const totalEarned=walletData.reduce((s,d)=>s+d.earned,0);
  const totalPending=walletData.reduce((s,d)=>s+d.pending,0);

  return (
    <div style={{padding:"32px",overflow:"auto"}}>
      <PageHeader title="Carteira" sub={isAdmin?"Comissões da equipa":"As tuas comissões"}/>
      {isAdmin && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:28}}>
          <SumCard label="Total Ganho" value={fmt(totalEarned)} color={C.green} icon="💰"/>
          <SumCard label="Pipeline Potencial" value={fmt(totalPending)} color={C.gold} icon="⏳"/>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isAdmin?"repeat(2,1fr)":"1fr",gap:16,marginBottom:28}}>
        {walletData.map(d=>(
          <div key={d.agent.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"22px 24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <Avatar agent={d.agent} size={44}/>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{d.agent.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{d.deals} deal{d.deals!==1?"s":""} fechado{d.deals!==1?"s":""}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:C.green+"11",border:`1px solid ${C.green}33`,borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:C.green,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Ganho</div>
                <div style={{fontSize:22,fontWeight:800,color:C.green}}>{fmt(d.earned)}</div>
              </div>
              <div style={{background:C.gold+"11",border:`1px solid ${C.gold}33`,borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:C.gold,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Potencial</div>
                <div style={{fontSize:22,fontWeight:800,color:C.gold}}>{fmt(d.pending)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Parcerias Fechadas</div>
      {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agentId===me.id)).length===0
        ?<Empty text="Nenhuma parceria fechada com valor"/>
        :(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agentId===me.id)).map(c=>{
            const comm=c.partnershipValue*(c.commissionRate??0.5);
            const tier=tierOf(c.tier), owner=agentOf(c.agentId);
            return (
              <div key={c.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:3,height:36,borderRadius:2,background:C.green,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{c.name}</div>
                  <div style={{fontSize:12,color:C.sub,display:"flex",gap:12,alignItems:"center"}}>
                    {tier&&<span style={{color:tier.color}}>{tier.label}</span>}
                    {isAdmin&&owner&&<div style={{display:"flex",alignItems:"center",gap:4}}><Avatar agent={owner} size={14}/><span>{owner.name}</span></div>}
                    {c.partnershipStart&&<span>Início: {fmtDate(c.partnershipStart)}</span>}
                    {c.partnershipEnd&&<span>Fim: {fmtDate(c.partnershipEnd)}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Valor</div>
                  <div style={{fontSize:14,fontWeight:700}}>{fmt(c.partnershipValue)}</div>
                </div>
                <div style={{textAlign:"right",background:C.green+"11",border:`1px solid ${C.green}33`,borderRadius:10,padding:"8px 14px"}}>
                  <div style={{fontSize:10,color:C.green,marginBottom:2}}>Comissão ({Math.round((c.commissionRate??0.5)*100)}%)</div>
                  <div style={{fontSize:16,fontWeight:800,color:C.green}}>{fmt(comm)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── FORMS ──────────────────────────────────────────────────── */
function CompanyForm({ onSubmit, onCancel }) {
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
      <div><label style={LS}>Notas</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:70,resize:"vertical",width:"100%"}} placeholder="Como chegaste a esta empresa..."/></div>
      <FormActions onCancel={onCancel} onSubmit={()=>{if(!f.name||!f.sector){alert("Preenche nome e setor");return;}onSubmit(f);}} label="Adicionar Empresa"/>
    </div>
  );
}

function ActivityForm({ company:c, onSubmit, onCancel }) {
  const [f,setF]=useState({type:"Email enviado",notes:"",outcome:"",secondMeeting:false,newStatus:c?.status||"contacted"});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={LS}>Tipo</label><select value={f.type} onChange={e=>s("type",e.target.value)} style={{...SS,width:"100%"}}>{ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Atualizar Estado</label><select value={f.newStatus} onChange={e=>s("newStatus",e.target.value)} style={{...SS,width:"100%"}}>{STATUSES.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}</select></div>
      </div>
      <div><label style={LS}>Resumo</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:70,resize:"vertical",width:"100%"}} placeholder="Como correu?"/></div>
      <div><label style={LS}>Próximo Passo</label><input value={f.outcome} onChange={e=>s("outcome",e.target.value)} style={{...IS,width:"100%"}} placeholder="Ex: Reunião marcada para..."/></div>
      <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,userSelect:"none"}}>
        <input type="checkbox" checked={f.secondMeeting} onChange={e=>s("secondMeeting",e.target.checked)} style={{accentColor:C.orange,width:16,height:16}}/>
        Demonstrou interesse em 2ª reunião
      </label>
      <FormActions onCancel={onCancel} onSubmit={()=>onSubmit(f)} label="Guardar Atividade"/>
    </div>
  );
}

/* ── SHARED UI ──────────────────────────────────────────────── */
function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:wide?740:520,maxHeight:"92vh",overflow:"auto",padding:"26px 28px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:17}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:24,cursor:"pointer",lineHeight:1,padding:0}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function PageHeader({ title, sub, action }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div><h1 style={{fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{title}</h1>{sub&&<div style={{fontSize:13,color:C.sub,marginTop:3}}>{sub}</div>}</div>
      {action}
    </div>
  );
}
function ChartCard({ title, children }) {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
      <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>{title}</div>
      {children}
    </div>
  );
}
function SumCard({ label, value, color, icon }) {
  return (
    <div style={{background:C.card,border:`1px solid ${color}33`,borderRadius:14,padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
      <div style={{fontSize:32}}>{icon}</div>
      <div><div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div><div style={{fontSize:28,fontWeight:800,color}}>{value}</div></div>
    </div>
  );
}
function Btn({ children, onClick, sm }) {
  return <button onClick={onClick} style={{background:C.orange,color:C.white,border:"none",padding:sm?"6px 14px":"10px 20px",borderRadius:9,fontWeight:700,fontSize:sm?12:13,cursor:"pointer"}}>{children}</button>;
}
function Tag({ children, color }) {
  return <span style={{background:color+"18",color,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,border:`1px solid ${color}33`}}>{children}</span>;
}
function Empty({ text }) {
  return <div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}><div style={{fontSize:36,marginBottom:8}}>🎾</div>{text}</div>;
}
function FormActions({ onCancel, onSubmit, label }) {
  return (
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
      <button onClick={onCancel} style={{background:"none",border:`1px solid ${C.border}`,color:C.sub,padding:"10px 20px",borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancelar</button>
      <Btn onClick={onSubmit}>{label}</Btn>
    </div>
  );
}
function Loader() {
  return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.orange,fontSize:14}}>A carregar...</div>;
}

const LS={fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:5,display:"block",fontWeight:500};
const IS={background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:"10px 12px",borderRadius:9,fontSize:13,outline:"none"};
const SS={background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:"10px 12px",borderRadius:9,fontSize:13,cursor:"pointer",outline:"none"};
