import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ─── TOKENS ─────────────────────────────────────────────────── */
const C = {
  bg:      "#0A0A0B",
  surface: "#111113",
  card:    "#18181C",
  border:  "#242428",
  border2: "#2E2E34",
  orange:  "#FF4500",
  orangeL: "#FF6A33",
  muted:   "#52525C",
  sub:     "#8A8A96",
  text:    "#F0F0F4",
  white:   "#FFFFFF",
  green:   "#22C55E",
  blue:    "#3B82F6",
  gold:    "#EAB308",
  red:     "#EF4444",
};

const AGENTS_DEFAULT = ["André Silva","Agente 1","Agente 2","Agente 3","Agente 4","Agente 5"];

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
  { id:"prospecting",       label:"Prospeção",        color:C.muted  },
  { id:"contacted",         label:"Contactado",       color:C.blue   },
  { id:"meeting_scheduled", label:"Reunião Marcada",  color:"#A855F7"},
  { id:"meeting_done",      label:"Reunião Feita",    color:C.gold   },
  { id:"interested",        label:"Interessado",      color:C.green  },
  { id:"proposal",          label:"Proposta",         color:C.orangeL},
  { id:"closed_won",        label:"Fechado ✓",        color:C.green  },
  { id:"closed_lost",       label:"Perdido",          color:C.red    },
];

const ACTIVITY_TYPES = [
  "Email enviado","Chamada","Reunião presencial","Reunião online","Follow-up","Proposta enviada","Outro"
];

/* ─── STORAGE ─────────────────────────────────────────────────── */
const KEY = "just:v2:crm";
const EMPTY = { companies:[], activities:[] };

function useStorage() {
  const [data, setData] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(KEY); if(r) setData(JSON.parse(r.value)); }
      catch(_) {}
      setReady(true);
    })();
  }, []);
  const save = async (d) => { setData(d); try { await window.storage.set(KEY, JSON.stringify(d)); } catch(_) {} };
  return { data, save, ready };
}

/* ─── HELPERS ─────────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-PT") : "—";
const statusOf = (id) => STATUSES.find(s=>s.id===id)||STATUSES[0];
const tierOf   = (id) => TIERS.find(t=>t.id===id);

/* ─── ROOT ─────────────────────────────────────────────────────── */
export default function App() {
  const { data, save, ready } = useStorage();
  const [me, setMe] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null); // {type, payload}

  if (!ready) return <Loader />;
  if (!me)    return <Login onSelect={setMe} />;

  const isAdmin = me === "André Silva";
  const companies = data.companies || [];
  const activities = data.activities || [];

  /* mutations */
  function addCompany(form) {
    const dup = companies.find(c =>
      c.name.toLowerCase()===form.name.toLowerCase() ||
      (form.email && c.email?.toLowerCase()===form.email.toLowerCase())
    );
    if (dup) { alert(`⚠️ Empresa já registada por ${dup.agent}.`); return false; }
    const c = { id: Date.now().toString(), ...form, agent: me, status:"prospecting", createdAt: new Date().toISOString() };
    save({ ...data, companies: [...companies, c] });
    return true;
  }

  function updateCompany(id, patch) {
    save({ ...data, companies: companies.map(c => c.id===id ? {...c,...patch} : c) });
  }

  function addActivity(companyId, form) {
    const a = { id: Date.now().toString(), companyId, agent: me, date: new Date().toISOString(), ...form };
    save({ ...data, activities: [...activities, a] });
  }

  const actOf = (id) => activities.filter(a=>a.companyId===id).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const ctx = { me, isAdmin, companies, activities, actOf, addCompany, updateCompany, addActivity, setModal };

  const pages = { dashboard:<Dashboard ctx={ctx}/>, pipeline:<Pipeline ctx={ctx}/>, wallet:<Wallet ctx={ctx}/> };

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Sora',sans-serif", color:C.text, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:ital@1&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:2px; }
        input,select,textarea { font-family:'Sora',sans-serif; }
        button { font-family:'Sora',sans-serif; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"0 0 24px" }}>
        {/* Logo */}
        <div style={{ padding:"28px 20px 24px", borderBottom:`1px solid ${C.border}` }}>
          <Logo />
        </div>
        {/* Nav */}
        <nav style={{ padding:"12px 12px", flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {[
            { id:"dashboard", icon:"◈", label:"Dashboard" },
            { id:"pipeline",  icon:"◎", label:"Pipeline"  },
            { id:"wallet",    icon:"◇", label:"Carteira"  },
          ].map(n => (
            <button key={n.id} onClick={()=>setPage(n.id)} style={{
              background: page===n.id ? C.orange+"18" : "transparent",
              border: page===n.id ? `1px solid ${C.orange}33` : "1px solid transparent",
              color: page===n.id ? C.orange : C.sub,
              padding:"11px 14px", borderRadius:10, fontSize:13, fontWeight:page===n.id?600:400,
              cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all .15s"
            }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        {/* User */}
        <div style={{ padding:"0 12px" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.orange+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.orange }}>
              {me[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me}</div>
              {isAdmin && <div style={{ fontSize:10, color:C.orange, marginTop:1 }}>Admin</div>}
            </div>
            <button onClick={()=>setMe(null)} title="Sair" style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>⏻</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
        {pages[page]}
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
            onSubmit={f=>{ addActivity(modal.payload.id, f); updateCompany(modal.payload.id,{status:f.newStatus}); setModal(null); }}
            onCancel={()=>setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ─── LOGO ─────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{ lineHeight:1 }}>
      <div style={{ fontSize:11, fontFamily:"'Playfair Display',serif", fontStyle:"italic", color:C.sub, marginBottom:2 }}>not</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, letterSpacing:-1 }}>JUST</div>
      <div style={{ fontSize:9, fontWeight:600, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginTop:1 }}>A CLUB</div>
    </div>
  );
}

/* ─── DASHBOARD ─────────────────────────────────────────────────── */
function Dashboard({ ctx }) {
  const { me, isAdmin, companies, activities, setModal } = ctx;
  const mine = isAdmin ? companies : companies.filter(c=>c.agent===me);

  const kpis = [
    { label:"Empresas",   value: mine.length,                                                  icon:"🏢", color:C.blue   },
    { label:"Reuniões",   value: mine.filter(c=>["meeting_done","interested","proposal","closed_won"].includes(c.status)).length, icon:"🤝", color:"#A855F7" },
    { label:"Interessados",value:mine.filter(c=>["interested","proposal"].includes(c.status)).length, icon:"⚡", color:C.gold  },
    { label:"Fechados",   value: mine.filter(c=>c.status==="closed_won").length,               icon:"🏆", color:C.green  },
  ];

  /* bar chart: contacts per agent */
  const agentChart = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    (companies||[]).forEach(c => { map[c.agent]=(map[c.agent]||0)+1; });
    return Object.entries(map).map(([name,count])=>({ name: name.split(" ")[0], count })).sort((a,b)=>b.count-a.count);
  }, [companies, isAdmin]);

  /* pie: status distribution */
  const pieData = useMemo(() => {
    const map = {};
    mine.forEach(c => { const s=statusOf(c.status); map[s.label]=(map[s.label]||{count:0,color:s.color}); map[s.label].count++; });
    return Object.entries(map).map(([name,{count,color}])=>({name,value:count,color}));
  }, [mine]);

  /* recent activity */
  const recent = useMemo(() => {
    const list = isAdmin ? activities : activities.filter(a=>a.agent===me);
    return [...list].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  }, [activities, isAdmin, me]);

  return (
    <div style={{ padding:"32px 32px", overflow:"auto" }}>
      <PageHeader title="Dashboard" sub={isAdmin?"Visão geral de toda a equipa":"A tua atividade"} action={<Btn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</Btn>} />

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
        {kpis.map(k=>(
          <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-10, right:-10, fontSize:52, opacity:.06 }}>{k.icon}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:34, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isAdmin?"1fr 1fr":"1fr", gap:18, marginBottom:24 }}>
        {/* Agentes chart — admin only */}
        {isAdmin && (
          <ChartCard title="Empresas por Agente">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentChart} margin={{top:5,right:5,left:-20,bottom:0}}>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} cursor={{fill:C.orange+"11"}} />
                <Bar dataKey="count" fill={C.orange} radius={[6,6,0,0]} name="Empresas" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Status pie */}
        <ChartCard title="Pipeline por Estado">
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1 }}>
              {pieData.map(d=>(
                <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:d.color, flexShrink:0 }} />
                  <span style={{ color:C.sub, flex:1 }}>{d.name}</span>
                  <span style={{ fontWeight:700, color:C.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Recent activity */}
      <ChartCard title="Atividade Recente">
        {recent.length===0 ? <Empty text="Sem atividade registada" /> : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recent.map(a=>{
              const co = ctx.companies.find(c=>c.id===a.companyId);
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.surface, borderRadius:10, border:`1px solid ${C.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:C.orange+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:C.orange, flexShrink:0 }}>{a.agent[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{co?.name||"—"} <span style={{ color:C.muted, fontWeight:400 }}>· {a.type}</span></div>
                    {a.notes && <div style={{ fontSize:12, color:C.sub, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.notes}</div>}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{fmtDate(a.date)}</div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ─── PIPELINE ───────────────────────────────────────────────── */
function Pipeline({ ctx }) {
  const { me, isAdmin, companies, setModal } = ctx;
  const [search, setSearch] = useState("");
  const [fAgent, setFAgent] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const list = useMemo(()=>{
    return companies.filter(c=>{
      if (!isAdmin && c.agent!==me) return false;
      if (fAgent!=="all" && c.agent!==fAgent) return false;
      if (fStatus!=="all" && c.status!==fStatus) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  },[companies,isAdmin,me,fAgent,fStatus,search]);

  return (
    <div style={{ padding:"32px 32px", overflow:"auto" }}>
      <PageHeader title="Pipeline" sub={`${list.length} empresa${list.length!==1?"s":""}`} action={<Btn onClick={()=>setModal({type:"add_company"})}>+ Nova Empresa</Btn>} />

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar empresa..." style={{...IS, flex:"1 1 180px", minWidth:0}} />
        {isAdmin && (
          <select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={SS}>
            <option value="all">Todos os agentes</option>
            {AGENTS_DEFAULT.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={SS}>
          <option value="all">Todos os estados</option>
          {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {list.length===0 ? <Empty text="Nenhuma empresa encontrada" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {list.map(c=>(
            <CompanyRow key={c.id} company={c} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyRow({ company: c, ctx }) {
  const { me, isAdmin, actOf, setModal } = ctx;
  const st = statusOf(c.status);
  const tier = tierOf(c.tier);
  const acts = actOf(c.id);
  const canEdit = isAdmin || c.agent===me;

  return (
    <div onClick={()=>setModal({type:"company",payload:c})} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"border-color .15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.border2}
      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
    >
      {/* Status bar */}
      <div style={{ width:3, height:40, borderRadius:2, background:st.color, flexShrink:0 }} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
          <span style={{ fontWeight:700, fontSize:14 }}>{c.name}</span>
          {tier && <Tag color={tier.color}>{tier.label}</Tag>}
          <Tag color={st.color}>{st.label}</Tag>
          {c.partnershipValue && <Tag color={C.green}>{fmt(c.partnershipValue)}</Tag>}
        </div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:C.sub }}>{c.sector}</span>
          {isAdmin && <span style={{ fontSize:12, color:C.orange }}>👤 {c.agent}</span>}
          {acts[0] && <span style={{ fontSize:12, color:C.muted }}>Último contacto: {fmtDate(acts[0].date)}</span>}
          {c.partnershipEnd && <span style={{ fontSize:12, color:C.muted }}>Termina: {fmtDate(c.partnershipEnd)}</span>}
        </div>
      </div>

      {canEdit && (
        <button onClick={e=>{e.stopPropagation();ctx.setModal({type:"activity",payload:c});}} style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"7px 14px", borderRadius:8, fontSize:12, cursor:"pointer", fontWeight:600, flexShrink:0, whiteSpace:"nowrap" }}>
          + Atividade
        </button>
      )}
    </div>
  );
}

/* ─── COMPANY DETAIL ─────────────────────────────────────────── */
function CompanyDetail({ company: c, ctx, onClose }) {
  const { me, isAdmin, actOf, updateCompany, setModal } = ctx;
  const canEdit = isAdmin || c.agent===me;
  const acts = actOf(c.id);
  const tier = tierOf(c.tier);
  const commission = c.partnershipValue ? c.partnershipValue * (c.commissionRate||0.5) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Status + tier quick edit */}
      {canEdit && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div>
            <label style={LS}>Estado</label>
            <select value={c.status} onChange={e=>updateCompany(c.id,{status:e.target.value})} style={{...SS,width:"100%"}}>
              {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={LS}>Nível de Parceria</label>
            <select value={c.tier||""} onChange={e=>updateCompany(c.id,{tier:e.target.value})} style={{...SS,width:"100%"}}>
              <option value="">Não definido</option>
              {TIERS.map(t=><option key={t.id} value={t.id}>{t.label} — {fmt(t.value)}</option>)}
            </select>
          </div>
          <div>
            <label style={LS}>Valor Real da Parceria (€)</label>
            <input type="number" value={c.partnershipValue||""} onChange={e=>updateCompany(c.id,{partnershipValue:Number(e.target.value)})} style={{...IS,width:"100%"}} placeholder="Ex: 5000" />
          </div>
        </div>
      )}

      {/* Partnership dates + commission */}
      {canEdit && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Contrato & Comissão</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, alignItems:"end" }}>
            <div>
              <label style={LS}>Início da Parceria</label>
              <input type="date" value={c.partnershipStart||""} onChange={e=>updateCompany(c.id,{partnershipStart:e.target.value})} style={{...IS,width:"100%"}} />
            </div>
            <div>
              <label style={LS}>Fim da Parceria</label>
              <input type="date" value={c.partnershipEnd||""} onChange={e=>updateCompany(c.id,{partnershipEnd:e.target.value})} style={{...IS,width:"100%"}} />
            </div>
            <div>
              <label style={LS}>% Comissão do Agente</label>
              <input type="number" min="0" max="100" value={c.commissionRate!=null?Math.round(c.commissionRate*100):50} onChange={e=>updateCompany(c.id,{commissionRate:Number(e.target.value)/100})} style={{...IS,width:"100%"}} placeholder="50" />
            </div>
            <div style={{ background:C.card, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.green}33` }}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:4 }}>Comissão do Agente</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.green }}>{commission!==null ? fmt(commission) : "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        {[
          ["Setor",c.sector],["Email",c.email||"—"],["Contacto",c.contact||"—"],
          ["Agente",c.agent],["Adicionada",fmtDate(c.createdAt)],["Notas",c.notes||"—"]
        ].map(([l,v])=>(
          <div key={l} style={{ background:C.surface, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}` }}>
            <div style={LS}>{l}</div>
            <div style={{ fontSize:13, marginTop:2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Activity log */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:1 }}>Histórico ({acts.length})</div>
          {canEdit && <Btn sm onClick={()=>{ onClose(); setModal({type:"activity",payload:c}); }}>+ Registar</Btn>}
        </div>
        {acts.length===0 ? <Empty text="Sem atividade registada" /> : (
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto" }}>
            {acts.map(a=>(
              <div key={a.id} style={{ background:C.surface, borderRadius:10, padding:"12px 14px", borderLeft:`3px solid ${C.orange}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:13, color:C.orangeL }}>{a.type}</span>
                  <span style={{ fontSize:11, color:C.muted }}>{fmtDate(a.date)}</span>
                </div>
                {a.notes && <div style={{ fontSize:13, color:C.sub }}>{a.notes}</div>}
                {a.outcome && <div style={{ fontSize:12, color:C.text, marginTop:6 }}>→ {a.outcome}</div>}
                {a.secondMeeting && <div style={{ fontSize:11, color:C.green, marginTop:4 }}>✓ Interesse em 2ª reunião</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── WALLET ──────────────────────────────────────────────────── */
function Wallet({ ctx }) {
  const { me, isAdmin, companies } = ctx;

  const walletData = useMemo(() => {
    const target = isAdmin ? AGENTS_DEFAULT : [me];
    return target.map(agent => {
      const mine = companies.filter(c=>c.agent===agent);
      const closed = mine.filter(c=>c.status==="closed_won" && c.partnershipValue);
      const active = mine.filter(c=>["interested","proposal","meeting_done"].includes(c.status) && c.partnershipValue);
      const earned = closed.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0);
      const pending = active.reduce((s,c)=>s+c.partnershipValue*(c.commissionRate??0.5),0);
      return { agent, earned, pending, deals: closed.length, activePipeline: active.length };
    }).filter(d=>isAdmin || d.agent===me);
  },[companies, isAdmin, me]);

  const totalEarned  = walletData.reduce((s,d)=>s+d.earned,0);
  const totalPending = walletData.reduce((s,d)=>s+d.pending,0);

  return (
    <div style={{ padding:"32px 32px", overflow:"auto" }}>
      <PageHeader title="Carteira" sub={isAdmin?"Comissões de toda a equipa":"As tuas comissões"} />

      {/* Totals */}
      {isAdmin && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
          <SumCard label="Total Ganho (Equipa)" value={fmt(totalEarned)} color={C.green} icon="💰" />
          <SumCard label="Pipeline Potencial" value={fmt(totalPending)} color={C.gold} icon="⏳" />
        </div>
      )}

      {/* Agent cards */}
      <div style={{ display:"grid", gridTemplateColumns: isAdmin?"repeat(2,1fr)":"1fr", gap:16 }}>
        {walletData.map(d=>(
          <div key={d.agent} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:C.orange+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:C.orange }}>{d.agent[0]}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{d.agent}</div>
                <div style={{ fontSize:12, color:C.muted }}>{d.deals} deal{d.deals!==1?"s":""} fechado{d.deals!==1?"s":""}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:C.green+"11", border:`1px solid ${C.green}33`, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:C.green, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Ganho</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.green }}>{fmt(d.earned)}</div>
              </div>
              <div style={{ background:C.gold+"11", border:`1px solid ${C.gold}33`, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:C.gold, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Potencial</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.gold }}>{fmt(d.pending)}</div>
              </div>
            </div>
            {/* Closed deals */}
            {d.activePipeline>0 && <div style={{ marginTop:12, fontSize:12, color:C.sub }}>{d.activePipeline} proposta{d.activePipeline!==1?"s":""} em pipeline</div>}
          </div>
        ))}
      </div>

      {/* Per-deal breakdown */}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Parcerias Fechadas</div>
        {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agent===me)).length===0
          ? <Empty text="Nenhuma parceria fechada com valor registado" />
          : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {companies.filter(c=>c.status==="closed_won"&&c.partnershipValue&&(isAdmin||c.agent===me)).map(c=>{
              const comm = c.partnershipValue*(c.commissionRate??0.5);
              const tier = tierOf(c.tier);
              return (
                <div key={c.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:C.green, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:C.sub, display:"flex", gap:12 }}>
                      {tier && <span style={{ color:tier.color }}>{tier.label}</span>}
                      {isAdmin && <span>👤 {c.agent}</span>}
                      {c.partnershipStart && <span>Início: {fmtDate(c.partnershipStart)}</span>}
                      {c.partnershipEnd && <span>Fim: {fmtDate(c.partnershipEnd)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>Valor Parceria</div>
                    <div style={{ fontSize:14, fontWeight:700 }}>{fmt(c.partnershipValue)}</div>
                  </div>
                  <div style={{ textAlign:"right", background:C.green+"11", border:`1px solid ${C.green}33`, borderRadius:10, padding:"8px 14px" }}>
                    <div style={{ fontSize:10, color:C.green, marginBottom:2 }}>Comissão ({Math.round((c.commissionRate??0.5)*100)}%)</div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.green }}>{fmt(comm)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FORMS ───────────────────────────────────────────────────── */
function CompanyForm({ onSubmit, onCancel }) {
  const [f, setF] = useState({name:"",email:"",contact:"",sector:"",notes:""});
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div><label style={LS}>Nome da Empresa *</label><input value={f.name} onChange={e=>s("name",e.target.value)} style={{...IS,width:"100%"}} placeholder="Ex: Empresa XYZ" /></div>
        <div><label style={LS}>Email</label><input value={f.email} onChange={e=>s("email",e.target.value)} style={{...IS,width:"100%"}} placeholder="geral@empresa.pt" /></div>
        <div><label style={LS}>Nome do Contacto</label><input value={f.contact} onChange={e=>s("contact",e.target.value)} style={{...IS,width:"100%"}} placeholder="Ex: João Silva" /></div>
        <div><label style={LS}>Setor *</label>
          <select value={f.sector} onChange={e=>s("sector",e.target.value)} style={{...SS,width:"100%"}}>
            <option value="">Selecionar...</option>
            {SECTORS.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <div><label style={LS}>Notas</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:70,resize:"vertical",width:"100%"}} placeholder="Como chegaste a esta empresa..." /></div>
      <FormActions onCancel={onCancel} onSubmit={()=>{ if(!f.name||!f.sector){alert("Preenche nome e setor");return;} onSubmit(f); }} label="Adicionar Empresa" />
    </div>
  );
}

function ActivityForm({ company: c, onSubmit, onCancel }) {
  const [f, setF] = useState({type:"Email enviado",notes:"",outcome:"",secondMeeting:false,newStatus:c?.status||"contacted"});
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div><label style={LS}>Tipo de Atividade</label>
          <select value={f.type} onChange={e=>s("type",e.target.value)} style={{...SS,width:"100%"}}>
            {ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={LS}>Atualizar Estado</label>
          <select value={f.newStatus} onChange={e=>s("newStatus",e.target.value)} style={{...SS,width:"100%"}}>
            {STATUSES.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}
          </select>
        </div>
      </div>
      <div><label style={LS}>Resumo</label><textarea value={f.notes} onChange={e=>s("notes",e.target.value)} style={{...IS,height:70,resize:"vertical",width:"100%"}} placeholder="Como correu? O que foi discutido?" /></div>
      <div><label style={LS}>Próximo Passo / Resultado</label><input value={f.outcome} onChange={e=>s("outcome",e.target.value)} style={{...IS,width:"100%"}} placeholder="Ex: Vão analisar, reunião marcada para..." /></div>
      <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13, userSelect:"none" }}>
        <input type="checkbox" checked={f.secondMeeting} onChange={e=>s("secondMeeting",e.target.checked)} style={{ accentColor:C.orange, width:16, height:16 }} />
        Demonstrou interesse em 2ª reunião
      </label>
      <FormActions onCancel={onCancel} onSubmit={()=>onSubmit(f)} label="Guardar Atividade" />
    </div>
  );
}

/* ─── LOGIN ───────────────────────────────────────────────────── */
function Login({ onSelect }) {
  return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:ital@1&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:13, fontFamily:"'Playfair Display',serif", fontStyle:"italic", color:C.sub }}>not</div>
          <div style={{ fontSize:42, fontWeight:800, letterSpacing:-2, color:C.text, lineHeight:1, fontFamily:"'Sora',sans-serif" }}>JUST</div>
          <div style={{ fontSize:10, fontWeight:600, color:C.muted, letterSpacing:5, textTransform:"uppercase", marginTop:2 }}>A CLUB</div>
          <div style={{ width:40, height:2, background:C.orange, margin:"16px auto 0", borderRadius:1 }} />
          <div style={{ fontSize:13, color:C.sub, marginTop:16, fontFamily:"'Sora',sans-serif" }}>Off Court CRM</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"28px 24px" }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>Bem-vindo de volta</div>
          <div style={{ fontSize:13, color:C.sub, marginBottom:20 }}>Seleciona o teu perfil</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {AGENTS_DEFAULT.map(a=>(
              <button key={a} onClick={()=>onSelect(a)} style={{
                background: a==="André Silva" ? C.orange+"18":"transparent",
                border:`1px solid ${a==="André Silva"?C.orange+"44":C.border}`,
                color:C.text, padding:"13px 16px", borderRadius:11, fontSize:14,
                cursor:"pointer", textAlign:"left", fontWeight:a==="André Silva"?700:400,
                display:"flex", justifyContent:"space-between", alignItems:"center",
                transition:"all .15s", fontFamily:"'Sora',sans-serif"
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:"50%", background:a==="André Silva"?C.orange+"33":C.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:a==="André Silva"?C.orange:C.sub }}>{a[0]}</div>
                  {a}
                </div>
                {a==="André Silva" && <span style={{ fontSize:10, color:C.orange, background:C.orange+"18", padding:"3px 9px", borderRadius:20, border:`1px solid ${C.orange}44` }}>Admin</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SHARED UI ───────────────────────────────────────────────── */
function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000088", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, width:"100%", maxWidth:wide?740:520, maxHeight:"92vh", overflow:"auto", padding:"26px 28px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:24, cursor:"pointer", lineHeight:1, padding:0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-0.5 }}>{title}</h1>
        {sub && <div style={{ fontSize:13, color:C.sub, marginTop:3 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}
function ChartCard({ title, children }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
      <div style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>{title}</div>
      {children}
    </div>
  );
}
function SumCard({ label, value, color, icon }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${color}33`, borderRadius:14, padding:"20px 24px", display:"flex", alignItems:"center", gap:16 }}>
      <div style={{ fontSize:32 }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
      </div>
    </div>
  );
}
function Btn({ children, onClick, sm }) {
  return <button onClick={onClick} style={{ background:C.orange, color:C.white, border:"none", padding:sm?"6px 14px":"10px 20px", borderRadius:9, fontWeight:700, fontSize:sm?12:13, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>{children}</button>;
}
function Tag({ children, color }) {
  return <span style={{ background:color+"18", color, fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:600, border:`1px solid ${color}33` }}>{children}</span>;
}
function Empty({ text }) {
  return <div style={{ textAlign:"center", padding:"40px 0", color:C.muted, fontSize:13 }}><div style={{ fontSize:36, marginBottom:8 }}>🎾</div>{text}</div>;
}
function FormActions({ onCancel, onSubmit, label }) {
  return (
    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4 }}>
      <button onClick={onCancel} style={{ background:"none", border:`1px solid ${C.border}`, color:C.sub, padding:"10px 20px", borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>Cancelar</button>
      <Btn onClick={onSubmit}>{label}</Btn>
    </div>
  );
}
function Loader() {
  return <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif", color:C.orange, fontSize:14 }}>A carregar...</div>;
}

const LS = { fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:5, display:"block", fontWeight:500 };
const IS = { background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:13, outline:"none", fontFamily:"'Sora',sans-serif" };
const SS = { background:C.surface, border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", borderRadius:9, fontSize:13, cursor:"pointer", outline:"none", fontFamily:"'Sora',sans-serif" };
