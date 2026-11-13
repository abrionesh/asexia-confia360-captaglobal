import { useState } from "react";
import {
  OPP_STAGES,
  addAction,
  addCita,
  addCommunication,
  addContact,
  addNote,
  addOpportunity,
  addRoute,
  channelLabel,
  closeAlarm,
  moveStage,
  oppLabel,
  patchExpediente,
  patchModulo,
  patchOpportunity,
  rutaLabel,
  toggleCita,
  type Accion,
  type Channel,
  type Expediente,
  type OppStage,
  type RutaWhen,
  type StageId,
} from "@/data/crm";
import { draftScripts, mailHref, waHref, type Scripts } from "@/data/pitches";
import { loadAdmin, saveAdmin, type MotorAdmin, type StageConf } from "@/motor/admin";
import { moduloLabel, renewalDue, type ModuloEstado } from "@/motor/cuenta";
import { buildMando } from "@/motor/mando";

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function dayLabel(day: string) {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

const VIEWS = [
  { id: "tablero", label: "Tablero" },
  { id: "actuar", label: "Actuar" },
  { id: "agenda", label: "Agenda" },
  { id: "mando", label: "Mando" },
  { id: "admin", label: "Admin" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function CrmScreen({
  rows,
  focusId,
  onChange,
  onBack,
  onOpenRadar,
  onUpdateFromRadar,
}: {
  rows: Expediente[];
  focusId: string | null;
  onChange: (rows: Expediente[]) => void;
  onBack: () => void;
  onOpenRadar: (bizId: number) => void;
  onUpdateFromRadar: (bizId: number) => string;
}) {
  const [view, setView] = useState<ViewId>("tablero");
  const [openId, setOpenId] = useState<string | null>(focusId);
  const [admin, setAdmin] = useState<MotorAdmin>(() => loadAdmin());
  const open = rows.find((row) => row.id === openId) ?? null;
  const due = rows.filter((row) => row.nextWhat && row.nextAt && row.nextAt <= new Date().toISOString().slice(0, 10)).length;

  function commitAdmin(next: MotorAdmin) {
    saveAdmin(next);
    setAdmin(next);
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl leading-none font-extrabold tracking-tight">Seguimiento</h1>
        <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-lime">
          Volver al radar
        </button>
      </div>
      <div className="scroll-x mt-3 flex gap-2 pb-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setView(item.id);
              setOpenId(null);
            }}
            className={
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold " +
              (view === item.id && !open ? "border-lime bg-lime text-bg" : "border-line")
            }
          >
            {item.label}
            {item.id === "actuar" && due > 0 ? ` ${due}` : ""}
          </button>
        ))}
      </div>

      {open ? (
        <Ficha
          row={open}
          rows={rows}
          onChange={onChange}
          onClose={() => setOpenId(null)}
          onOpenRadar={onOpenRadar}
          onOpenAction={() => {
            setView("actuar");
            setOpenId(null);
          }}
          onUpdateFromRadar={onUpdateFromRadar}
          stages={admin.stages}
          commercials={admin.commercials}
        />
      ) : view === "tablero" ? (
        <Board rows={rows} stages={admin.stages} onOpen={setOpenId} onMove={(id, stage) => onChange(moveStage(rows, id, stage))} />
      ) : view === "actuar" ? (
        <Actuar rows={rows} onOpen={setOpenId} onDone={(id) => onChange(closeAlarm(rows, id))} />
      ) : view === "agenda" ? (
        <Agenda rows={rows} onOpen={setOpenId} onToggle={(id, citaId) => onChange(toggleCita(rows, id, citaId))} />
      ) : view === "mando" ? (
        <Mando rows={rows} stages={admin.stages} onActuar={() => setView("actuar")} />
      ) : (
        <AdminPanel admin={admin} onChange={commitAdmin} />
      )}
    </section>
  );
}

function Board({
  rows,
  stages,
  onOpen,
  onMove,
}: {
  rows: Expediente[];
  stages: StageConf[];
  onOpen: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="scroll-x mt-4 flex items-start gap-3 pb-2">
      {stages.map((stage) => {
        const list = rows.filter((row) => row.stage === stage.id);
        return (
          <section key={stage.id} className="w-64 shrink-0 rounded-2xl border border-line bg-surface p-2">
            <h2 className="px-1 text-sm font-semibold">
              {stage.label} <span className="text-muted">{list.length}</span>
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {list.map((row) => (
                <li key={row.id} className="rounded-xl border border-line bg-card p-3">
                  <button type="button" onClick={() => onOpen(row.id)} className="w-full text-left">
                    <span className="block font-semibold">{row.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      desde {row.stageAt}
                      {row.assigned ? ` · ${row.assigned}` : ""}
                    </span>
                  </button>
                  <label className="mt-2 block text-xs text-muted">
                    Mover
                    <select
                      value={row.stage}
                      onChange={(e) => onMove(row.id, e.target.value as StageId)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-sm text-ink"
                    >
                      {stages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Actuar({
  rows,
  onOpen,
  onDone,
}: {
  rows: Expediente[];
  onOpen: (id: string) => void;
  onDone: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const alarms = rows
    .filter((row) => row.nextWhat)
    .sort((a, b) => (a.nextAt || "9999").localeCompare(b.nextAt || "9999"));
  if (alarms.length === 0) return <p className="mt-6 text-sm text-muted">No hay alarmas. En la ficha, apunta el siguiente paso y la fecha.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {alarms.map((row) => {
        const late = Boolean(row.nextAt && row.nextAt < today);
        return (
          <li key={row.id} className="rounded-2xl border border-line bg-card p-4">
            <button type="button" onClick={() => onOpen(row.id)} className="w-full text-left">
              <span className={"text-xs font-semibold " + (late ? "text-rose" : "text-lime")}>
                {late ? "Vencida" : "Pendiente"} · {channelLabel(row.channel)}
                {row.nextAt ? ` · ${row.nextAt}` : ""}
              </span>
              <span className="mt-1 block font-semibold">{row.name}</span>
              <span className="mt-1 block text-sm">{row.nextWhat}</span>
            </button>
            <button type="button" onClick={() => onDone(row.id)} className="mt-3 min-h-11 rounded-xl bg-lime px-4 text-sm font-semibold text-bg">
              Hecho
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Agenda({
  rows,
  onOpen,
  onToggle,
}: {
  rows: Expediente[];
  onOpen: (id: string) => void;
  onToggle: (id: string, citaId: string) => void;
}) {
  const items = rows
    .flatMap((row) => row.citas.map((cita) => ({ ...cita, expedienteId: row.id, name: row.name })))
    .sort((a, b) => a.at.localeCompare(b.at));
  if (items.length === 0) return <p className="mt-6 text-sm text-muted">No hay citas. Se crean desde la ficha del posible cliente.</p>;
  const days = [...new Set(items.map((item) => item.at.slice(0, 10)))];
  return (
    <div className="mt-4 flex flex-col gap-4">
      {days.map((day) => (
        <section key={day}>
          <h2 className="text-sm font-semibold text-muted">{dayLabel(day)}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {items
              .filter((item) => item.at.slice(0, 10) === day)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                  <button type="button" onClick={() => onToggle(item.expedienteId, item.id)} className="min-h-11 text-sm font-semibold text-lime">
                    {item.done ? "Hecha" : "Pendiente"}
                  </button>
                  <button type="button" onClick={() => onOpen(item.expedienteId)} className="min-w-0 flex-1 text-left">
                    <span className={"block font-semibold " + (item.done ? "text-muted line-through" : "")}>{item.title}</span>
                    <span className="block text-sm text-muted">
                      {item.name} · {item.at.slice(11, 16) || item.at}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Mando({
  rows,
  stages,
  onActuar,
}: {
  rows: Expediente[];
  stages: StageConf[];
  onActuar: () => void;
}) {
  const mando = buildMando(rows, stages);
  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm text-muted">Números de estas fichas. No predicen nada.</p>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Expedientes" value={String(mando.total)} />
        <button type="button" onClick={onActuar} className="rounded-2xl border border-line bg-card p-3 text-left">
          <span className="block text-xs text-muted">Vencidas</span>
          <span className="mt-1 block font-display text-2xl font-extrabold">{mando.overdue}</span>
        </button>
        <Tile label="Sin siguiente paso" value={String(mando.withoutNext)} />
        <Tile label="Citas de hoy" value={String(mando.citasToday)} />
      </div>
      <section className="rounded-2xl border border-line bg-card p-3">
        <h2 className="text-sm font-semibold">Por estado</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {mando.byStage.map((stage) => (
            <li key={stage.id} className="flex justify-between text-sm">
              <span>{stage.label}</span>
              <span className="font-semibold">{stage.count}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-card p-3">
        <h2 className="text-sm font-semibold">Por comercial</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {mando.byCommercial.map((item) => (
            <li key={item.name} className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span className="font-semibold">{item.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <span className="block text-xs text-muted">{label}</span>
      <span className="mt-1 block font-display text-2xl font-extrabold">{value}</span>
    </div>
  );
}

function AdminPanel({ admin, onChange }: { admin: MotorAdmin; onChange: (next: MotorAdmin) => void }) {
  const [name, setName] = useState("");
  function move(index: number, delta: number) {
    const next = [...admin.stages];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange({ ...admin, stages: next });
  }
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-muted">Cambia cómo se llaman las etapas y quién puede llevar un expediente. No borra fichas.</p>
      <section>
        <h2 className="text-sm font-semibold">Etapas</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {admin.stages.map((stage, index) => (
            <li key={stage.id} className="flex items-center gap-2">
              <input
                value={stage.label}
                onChange={(e) =>
                  onChange({
                    ...admin,
                    stages: admin.stages.map((item) => (item.id === stage.id ? { ...item, label: e.target.value.slice(0, 40) } : item)),
                  })
                }
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
              />
              <button type="button" onClick={() => move(index, -1)} className="min-h-11 px-2 text-sm font-semibold" aria-label="Subir etapa">
                Subir
              </button>
              <button type="button" onClick={() => move(index, 1)} className="min-h-11 px-2 text-sm font-semibold" aria-label="Bajar etapa">
                Bajar
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Comerciales</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {admin.commercials.map((commercial) => (
            <li key={commercial} className="flex items-center justify-between gap-2 text-sm">
              <span>{commercial}</span>
              <button
                type="button"
                onClick={() => onChange({ ...admin, commercials: admin.commercials.filter((item) => item !== commercial) })}
                className="min-h-11 text-sm font-semibold text-lime"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = name.trim().slice(0, 80);
            if (!clean || admin.commercials.includes(clean)) return;
            onChange({ ...admin, commercials: [...admin.commercials, clean] });
            setName("");
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm" />
          <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-lime px-3 font-semibold text-bg">
            Añadir
          </button>
        </form>
      </section>
    </div>
  );
}

function Ficha({
  row,
  rows,
  onChange,
  onClose,
  onOpenRadar,
  onOpenAction,
  onUpdateFromRadar,
  stages,
  commercials,
}: {
  row: Expediente;
  rows: Expediente[];
  onChange: (rows: Expediente[]) => void;
  onClose: () => void;
  onOpenRadar: (bizId: number) => void;
  onOpenAction: () => void;
  onUpdateFromRadar: (bizId: number) => string;
  stages: StageConf[];
  commercials: string[];
}) {
  const [draft, setDraft] = useState("");
  const [citaAt, setCitaAt] = useState("");
  const [citaTitle, setCitaTitle] = useState("");
  const [person, setPerson] = useState({ name: "", role: "", phone: "", email: "", decides: false });
  const [oppTitle, setOppTitle] = useState("");
  const [oppPriority, setOppPriority] = useState<1 | 2 | 3>(2);
  const [oppComment, setOppComment] = useState("");
  const [rutaWhen, setRutaWhen] = useState<RutaWhen>("ahora");
  const [rutaText, setRutaText] = useState("");
  const [actionKind, setActionKind] = useState<Accion["kind"]>("visita");
  const [actionAt, setActionAt] = useState("");
  const [actionBy, setActionBy] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [commChannel, setCommChannel] = useState<Channel>("llamada");
  const [commMedium, setCommMedium] = useState("");
  const [commDetail, setCommDetail] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const opportunities = [...row.opportunities].sort(
    (a, b) => (b.score || 0) - (a.score || 0) || a.priority - b.priority || a.title.localeCompare(b.title, "es"),
  );
  const field = "mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink";

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-4">
      <button type="button" onClick={onClose} className="min-h-11 text-sm font-semibold text-lime">
        Volver
      </button>
      <p className="text-xs font-semibold tracking-widest text-lime uppercase">Ficha de cliente</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold">{row.name}</h2>
      <p className="mt-1 text-sm text-muted">No es la ficha del mapa. Nace al pasar el negocio a seguimiento.</p>

      <h3 className="mt-4 text-sm font-semibold">Identidad</h3>
      <p className="mt-1 text-sm">
        {row.sector || "Sin sector"}
        {row.city ? ` · ${row.city}` : ""}
      </p>
      <p className="text-sm">{row.address || "Sin dirección"}</p>
      {row.phone ? (
        <a href={`tel:${row.phone.replace(/\s/g, "")}`} className="mt-1 inline-flex min-h-11 items-center font-semibold text-lime">
          {row.phone}
        </a>
      ) : null}
      {row.email ? <p className="text-sm">{row.email}</p> : null}
      {onOpenRadar ? (
        <button type="button" onClick={() => onOpenRadar(row.bizId)} className="mt-1 block min-h-11 text-left text-sm font-semibold text-lime">
          Ver el punto en el radar
        </button>
      ) : null}
      {row.nextWhat ? (
        <button type="button" onClick={onOpenAction} className="block min-h-11 text-left text-sm font-semibold text-lime">
          Ver la próxima acción
        </button>
      ) : null}

      <label className="mt-3 block text-xs text-muted">
        Comercial
        <input
          value={row.assigned}
          onChange={(e) => onChange(patchExpediente(rows, row.id, { assigned: e.target.value.slice(0, 80) }))}
          placeholder="Quién lo lleva"
          list="commercials"
          className={field}
        />
        <datalist id="commercials">
          {commercials.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>
      <label className="mt-3 block text-xs text-muted">
        Estado del negocio
        <select
          value={row.stage}
          onChange={(e) => onChange(moveStage(rows, row.id, e.target.value as StageId))}
          className={field}
        >
          {stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-muted">Fecha del estado: {row.stageAt}</p>
      <Guiones row={row} rows={rows} onChange={onChange} />
      {row.stage === "cliente" ? <Cuenta row={row} rows={rows} onChange={onChange} /> : null}

      <h3 className="mt-5 text-sm font-semibold">Contactos</h3>
      <p className="mt-1 text-xs text-muted">Quién decide. No es el teléfono del local.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {row.contacts.map((contact) => (
          <li key={contact.id} className="rounded-xl bg-surface p-3 text-sm">
            <span className="font-semibold">{contact.name || "Sin nombre"}</span>
            {contact.decides ? <span className="ml-2 text-xs text-lime">Decide</span> : null}
            <span className="mt-1 block text-muted">
              {[contact.role, contact.phone, contact.email].filter(Boolean).join(" · ") || "Sin datos"}
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addContact(rows, row.id, person));
          setPerson({ name: "", role: "", phone: "", email: "", decides: false });
        }}
      >
        <input value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} placeholder="Nombre" className={field} />
        <input value={person.role} onChange={(e) => setPerson({ ...person, role: e.target.value })} placeholder="Cargo" className={field} />
        <input value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} placeholder="Teléfono" inputMode="tel" className={field} />
        <input value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} placeholder="Correo" type="email" className={field} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={person.decides} onChange={(e) => setPerson({ ...person, decides: e.target.checked })} className="size-4 accent-lime" />
          Decide
        </label>
        <button type="submit" className="min-h-11 rounded-xl border border-line font-semibold">
          Añadir contacto
        </button>
      </form>

      <h3 className="mt-5 text-sm font-semibold">Datos significativos</h3>
      <label className="mt-2 block text-xs text-muted">
        Horario real
        <input
          value={row.hours}
          onChange={(e) => onChange(patchExpediente(rows, row.id, { hours: e.target.value.slice(0, 160) }))}
          placeholder="Lo que abre de verdad, no el anuncio"
          className={field}
        />
      </label>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={row.chain}
          onChange={(e) => onChange(patchExpediente(rows, row.id, { chain: e.target.checked }))}
          className="size-4 accent-lime"
        />
        Es cadena
      </label>
      <label className="mt-2 block text-xs text-muted">
        Notas
        <textarea
          value={row.significant}
          onChange={(e) => onChange(patchExpediente(rows, row.id, { significant: e.target.value.slice(0, 800) }))}
          placeholder="Lo que no sale en el anuncio"
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setUpdateNote(onUpdateFromRadar(row.bizId))}
          className="min-h-11 rounded-xl bg-lime px-4 text-sm font-semibold text-bg"
        >
          Actualizar desde el radar
        </button>
        {updateNote ? <p className="mt-2 text-sm text-muted">{updateNote}</p> : null}
      </div>

      <h3 className="mt-4 text-sm font-semibold">Informe estratégico</h3>
      <textarea
        value={row.strategy}
        onChange={(e) =>
          onChange(
            patchExpediente(rows, row.id, {
              strategy: e.target.value.slice(0, 4000),
              strategyAt: e.target.value.trim() ? new Date().toISOString().slice(0, 10) : "",
            }),
          )
        }
        placeholder="Propuesta de estrategia. Se puede corregir."
        rows={4}
        className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
      />
      {row.strategyAt ? <p className="mt-1 text-xs text-muted">Fecha de la propuesta: {row.strategyAt}</p> : null}

      <h3 className="mt-5 text-sm font-semibold">Oportunidades</h3>
      <p className="mt-1 text-xs text-muted">Todas se quedan, de mayor a menor probabilidad estimada. El estado de cada una no es el estado del negocio.</p>
      <ul className="mt-2 flex flex-col gap-3">
        {opportunities.map((item, index) => (
          <OppCard key={item.id} index={index} item={item} row={row} rows={rows} onChange={onChange} />
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addOpportunity(rows, row.id, oppTitle, oppPriority, oppComment));
          setOppTitle("");
          setOppComment("");
        }}
      >
        <input value={oppTitle} onChange={(e) => setOppTitle(e.target.value)} placeholder="Oportunidad" className={field} />
        <select value={oppPriority} onChange={(e) => setOppPriority(Number(e.target.value) as 1 | 2 | 3)} className={field}>
          <option value={1}>Prioridad 1</option>
          <option value={2}>Prioridad 2</option>
          <option value={3}>Prioridad 3</option>
        </select>
        <input value={oppComment} onChange={(e) => setOppComment(e.target.value)} placeholder="Comentario" className={field} />
        <button type="submit" className="min-h-11 rounded-xl border border-line font-semibold">
          Añadir oportunidad
        </button>
      </form>

      <h3 className="mt-5 text-sm font-semibold">Hoja de ruta</h3>
      {(["ahora", "despues", "luego"] as RutaWhen[]).map((when) => (
        <div key={when} className="mt-3">
          <p className="text-xs font-semibold text-muted">{rutaLabel(when)}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {row.route
              .filter((item) => item.when === when)
              .map((item) => (
                <li key={item.id} className="text-sm">
                  {item.text}
                </li>
              ))}
          </ul>
        </div>
      ))}
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addRoute(rows, row.id, rutaWhen, rutaText));
          setRutaText("");
        }}
      >
        <select value={rutaWhen} onChange={(e) => setRutaWhen(e.target.value as RutaWhen)} className={field}>
          <option value="ahora">Ahora</option>
          <option value="despues">Después</option>
          <option value="luego">Más adelante</option>
        </select>
        <div className="flex gap-2">
          <input value={rutaText} onChange={(e) => setRutaText(e.target.value)} placeholder="Paso previsto" className={field} />
          <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-lime px-3 font-semibold text-bg">
            Añadir
          </button>
        </div>
      </form>

      <h3 className="mt-5 text-sm font-semibold">Acciones</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {row.actions.map((action) => (
          <li key={action.id} className="text-sm">
            <span className="font-semibold">{action.kind === "visita" ? "Visita" : action.kind === "llamada" ? "Llamada" : "Nota"}</span>
            <span className="text-muted">
              {" "}
              · {action.at.slice(0, 16).replace("T", " ")}
              {action.by ? ` · ${action.by}` : ""}
            </span>
            {action.result ? <span className="mt-1 block">{action.result}</span> : null}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addAction(rows, row.id, { kind: actionKind, at: actionAt || new Date().toISOString(), by: actionBy || row.assigned, result: actionResult }));
          setActionResult("");
        }}
      >
        <div className="flex gap-2">
          <select value={actionKind} onChange={(e) => setActionKind(e.target.value as Accion["kind"])} className={field}>
            <option value="visita">Visita</option>
            <option value="llamada">Llamada</option>
            <option value="nota">Nota</option>
          </select>
          <input type="datetime-local" value={actionAt} onChange={(e) => setActionAt(e.target.value)} className={field} />
        </div>
        <input value={actionBy} onChange={(e) => setActionBy(e.target.value)} placeholder={row.assigned || "Comercial"} className={field} />
        <input value={actionResult} onChange={(e) => setActionResult(e.target.value)} placeholder="Resultado" className={field} />
        <button type="submit" className="min-h-11 rounded-xl border border-line font-semibold">
          Registrar acción
        </button>
      </form>

      <h3 className="mt-5 text-sm font-semibold">Comunicaciones</h3>
      <p className="mt-1 text-xs text-muted">Queda el registro. No se envía nada.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {row.communications.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-semibold">{channelLabel(item.channel)}</span>
            {item.medium ? <span className="text-muted"> · {item.medium}</span> : null}
            <span className="mt-1 block text-xs text-muted">{when(item.at)}</span>
            {item.detail ? <span className="mt-1 block">{item.detail}</span> : null}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addCommunication(rows, row.id, { channel: commChannel, medium: commMedium, detail: commDetail }));
          setCommDetail("");
          setCommMedium("");
        }}
      >
        <div className="flex gap-2">
          <select value={commChannel} onChange={(e) => setCommChannel(e.target.value as Channel)} className={field}>
            <option value="llamada">Llamada</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Correo</option>
            <option value="visita">Visita</option>
          </select>
          <input value={commMedium} onChange={(e) => setCommMedium(e.target.value)} placeholder="Medio" className={field} />
        </div>
        <input value={commDetail} onChange={(e) => setCommDetail(e.target.value)} placeholder="Detalle" className={field} />
        <button type="submit" className="min-h-11 rounded-xl border border-line font-semibold">
          Anotar comunicación
        </button>
      </form>

      <h3 className="mt-5 text-sm font-semibold">Alarma</h3>
      <label className="mt-2 block text-xs text-muted">
        Qué hay que hacer
        <input
          value={row.nextWhat}
          onChange={(e) => onChange(patchExpediente(rows, row.id, { nextWhat: e.target.value.slice(0, 160) }))}
          placeholder="Llamar, enviar propuesta…"
          className={field}
        />
      </label>
      <div className="mt-2 flex gap-2">
        <label className="block min-w-0 flex-1 text-xs text-muted">
          Fecha
          <input type="date" value={row.nextAt} onChange={(e) => onChange(patchExpediente(rows, row.id, { nextAt: e.target.value }))} className={field} />
        </label>
        <label className="block min-w-0 flex-1 text-xs text-muted">
          Canal
          <select value={row.channel} onChange={(e) => onChange(patchExpediente(rows, row.id, { channel: e.target.value as Channel }))} className={field}>
            <option value="llamada">Llamada</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visita">Visita</option>
            <option value="email">Correo</option>
          </select>
        </label>
      </div>
      {row.nextWhat ? (
        <button type="button" onClick={() => onChange(closeAlarm(rows, row.id))} className="mt-2 min-h-11 rounded-xl bg-lime px-4 text-sm font-semibold text-bg">
          Marcar hecha
        </button>
      ) : null}

      <h3 className="mt-5 text-sm font-semibold">Cita</h3>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addCita(rows, row.id, citaAt, citaTitle));
          setCitaTitle("");
        }}
      >
        <input type="datetime-local" value={citaAt} onChange={(e) => setCitaAt(e.target.value)} className={field} />
        <div className="flex gap-2">
          <input value={citaTitle} onChange={(e) => setCitaTitle(e.target.value)} placeholder="Visita, comida, presentación…" className={field} />
          <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-lime px-3 font-semibold text-bg">
            Agendar
          </button>
        </div>
      </form>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addNote(rows, row.id, draft));
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nota suelta" className={field} />
        <button type="submit" className="min-h-11 shrink-0 rounded-xl border border-line px-3 font-semibold">
          Anotar
        </button>
      </form>

      <ol className="mt-4 flex flex-col gap-3">
        {row.events.map((event) => (
          <li key={event.id} className="border-l border-line pl-3">
            <p className="text-xs text-muted">{when(event.at)}</p>
            <p className="text-sm">{event.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cuenta({
  row,
  rows,
  onChange,
}: {
  row: Expediente;
  rows: Expediente[];
  onChange: (rows: Expediente[]) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const due = row.modulos.filter((item) => renewalDue(item, today));
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Cuenta y módulos</h3>
      <p className="mt-1 text-xs text-muted">Lo marca AsExIA. No cobra y no abre la otra app. Cada cliente solo ve lo suyo cuando eso exista.</p>
      {due.length > 0 ? (
        <p className="mt-2 text-sm text-rose">Renovación pendiente: {due.map((item) => moduloLabel(item.id)).join(", ")}.</p>
      ) : null}
      <ul className="mt-3 flex flex-col gap-3">
        {row.modulos.map((item) => (
          <li key={item.id} className="rounded-xl bg-surface p-3">
            <p className="font-semibold">{moduloLabel(item.id)}</p>
            <div className="mt-2 flex gap-2">
              <select
                value={item.estado}
                onChange={(e) => onChange(patchModulo(rows, row.id, item.id, { estado: e.target.value as ModuloEstado }))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-2 text-sm"
              >
                <option value="no-contratado">No contratado</option>
                <option value="activo">Activo</option>
                <option value="aviso">Aviso de renovación</option>
              </select>
              <input
                type="date"
                value={item.vence}
                onChange={(e) => onChange(patchModulo(rows, row.id, item.id, { vence: e.target.value }))}
                aria-label={`Vence ${moduloLabel(item.id)}`}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-2 text-sm"
              />
            </div>
            <input
              value={item.nota}
              onChange={(e) => onChange(patchModulo(rows, row.id, item.id, { nota: e.target.value.slice(0, 160) }))}
              placeholder="Nota de la cuenta"
              className="mt-2 min-h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Guiones({
  row,
  rows,
  onChange,
}: {
  row: Expediente;
  rows: Expediente[];
  onChange: (rows: Expediente[]) => void;
}) {
  const [copied, setCopied] = useState("");
  const scripts = row.scripts?.visita
    ? row.scripts
    : draftScripts({ name: row.name, city: row.city, sectorId: row.sectorId, angle: row.angle, chain: row.chain });
  function setScript(key: keyof Scripts, value: string) {
    onChange(patchExpediente(rows, row.id, { scripts: { ...scripts, [key]: value } }));
  }
  async function copy(key: keyof Scripts) {
    try {
      await navigator.clipboard.writeText(scripts[key]);
      setCopied(key);
    } catch {
      setCopied("");
    }
  }
  const wa = waHref(row.phone, scripts.whatsapp);
  const mail = mailHref(row.email, row.name, scripts.email);
  const box = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink";
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Mensajes y guion de visita</h3>
      <p className="mt-1 text-xs text-muted">
        Borrador para el comercial. Copiar o abrir no envía nada. Si no hay un hueco contrastado, el texto no inventa una carencia.
      </p>
      <button
        type="button"
        onClick={() =>
          onChange(
            patchExpediente(rows, row.id, {
              scripts: draftScripts({ name: row.name, city: row.city, sectorId: row.sectorId, angle: row.angle, chain: row.chain }),
            }),
          )
        }
        className="mt-2 min-h-11 text-sm font-semibold text-lime"
      >
        Volver a proponer
      </button>
      {(
        [
          ["visita", "Guion de visita"],
          ["whatsapp", "WhatsApp inicial"],
          ["email", "Email"],
          ["seguimiento", "Seguimiento si no contestan"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="mt-3">
          <label className="text-xs text-muted">
            {label}
            <textarea value={scripts[key]} onChange={(e) => setScript(key, e.target.value.slice(0, 2000))} rows={key === "visita" ? 8 : 5} className={box} />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy(key)} className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold">
              {copied === key ? "Copiado" : "Copiar"}
            </button>
            {key === "whatsapp" && wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-lime px-3 text-sm font-semibold text-bg">
                Abrir en WhatsApp
              </a>
            ) : null}
            {key === "email" && mail ? (
              <a href={mail} className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 text-sm font-semibold">
                Abrir email
              </a>
            ) : null}
            {key !== "visita" ? (
              <button
                type="button"
                onClick={() =>
                  onChange(
                    addCommunication(rows, row.id, {
                      channel: key === "whatsapp" ? "whatsapp" : key === "email" ? "email" : "llamada",
                      medium: "Borrador",
                      detail: scripts[key],
                    }),
                  )
                }
                className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
              >
                Dejar constancia
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function OppCard({
  index,
  item,
  row,
  rows,
  onChange,
}: {
  index: number;
  item: Expediente["opportunities"][number];
  row: Expediente;
  rows: Expediente[];
  onChange: (rows: Expediente[]) => void;
}) {
  const [kind, setKind] = useState<Accion["kind"]>("llamada");
  const [result, setResult] = useState("");
  return (
    <li className="rounded-xl bg-surface p-3">
      <p className="text-xs text-muted">{index + 1}. {item.evidenced ? "Localizado" : "Hipótesis"}{item.money ? ` · ${item.money}` : ""}</p>
      <p className="font-semibold">{item.title}</p>
      <p className="mt-1 text-xs text-muted">
        Prioridad {item.priority} · {oppLabel(item.stage)} desde {item.stageAt}
      </p>
      <div className="mt-2 flex gap-2">
        <select
          value={item.priority}
          onChange={(e) => onChange(patchOpportunity(rows, row.id, item.id, { priority: Number(e.target.value) as 1 | 2 | 3 }))}
          className="min-h-11 flex-1 rounded-xl border border-line bg-card px-2 text-sm"
        >
          <option value={1}>Prioridad 1</option>
          <option value={2}>Prioridad 2</option>
          <option value={3}>Prioridad 3</option>
        </select>
        <select
          value={item.stage}
          onChange={(e) => onChange(patchOpportunity(rows, row.id, item.id, { stage: e.target.value as OppStage }))}
          className="min-h-11 flex-1 rounded-xl border border-line bg-card px-2 text-sm"
        >
          {OPP_STAGES.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
      <label className="mt-2 block text-xs text-muted">
        Detalle
        <textarea
          value={item.detail}
          onChange={(e) => onChange(patchOpportunity(rows, row.id, item.id, { detail: e.target.value.slice(0, 500) }))}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="mt-2 block text-xs text-muted">
        Comentario
        <textarea
          value={item.comment}
          onChange={(e) => onChange(patchOpportunity(rows, row.id, item.id, { comment: e.target.value.slice(0, 400) }))}
          rows={2}
          className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
        />
      </label>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!result.trim()) return;
          onChange(
            addAction(rows, row.id, {
              kind,
              at: new Date().toISOString(),
              by: row.assigned,
              result: `${item.title}: ${result}`.slice(0, 400),
            }),
          );
          setResult("");
        }}
      >
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as Accion["kind"])} className="min-h-11 flex-1 rounded-xl border border-line bg-card px-2 text-sm">
            <option value="llamada">Llamada</option>
            <option value="visita">Visita</option>
            <option value="nota">Nota</option>
          </select>
          <input
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Qué se hizo"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-sm"
          />
        </div>
        <button type="submit" className="min-h-11 rounded-xl border border-line text-sm font-semibold">
          Llevar la acción al CRM
        </button>
      </form>
    </li>
  );
}

function Empty() {
  return <p className="mt-6 text-sm text-muted">Todavía no hay posibles clientes. Desde una ficha del radar, pulsa Seguimiento.</p>;
}
