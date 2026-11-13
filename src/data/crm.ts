import { draftScripts, type Scripts } from "@/data/pitches";
import { emptyModulos, mergeModulos, type ModuloCuenta, type ModuloId } from "@/motor/cuenta";

export const STAGES = [
  { id: "sin-contactar", label: "Sin contactar" },
  { id: "contactado", label: "Contactado" },
  { id: "visitado", label: "Visitado" },
  { id: "propuesta", label: "Propuesta" },
  { id: "cliente", label: "Cliente" },
  { id: "no-ahora", label: "No ahora" },
  { id: "perdido", label: "Perdido" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export type CrmEvent = {
  id: string;
  at: string;
  kind: "alta" | "estado" | "nota" | "cita" | "alarma";
  text: string;
};

export type Channel = "llamada" | "whatsapp" | "visita" | "email";

export type Cita = {
  id: string;
  at: string;
  title: string;
  done: boolean;
};

export type Contacto = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  decides: boolean;
};

export type OppStage = "abierta" | "en-curso" | "ganada" | "pausada" | "perdida";

export type Oportunidad = {
  id: string;
  offerId: string;
  title: string;
  priority: 1 | 2 | 3;
  score: number;
  money: string;
  evidenced: boolean;
  stage: OppStage;
  stageAt: string;
  detail: string;
  comment: string;
};

export type OfferSeed = {
  id: string;
  title: string;
  short: string;
  detail: string;
  money: string;
  evidenced: boolean;
  score: number;
};

export type RutaWhen = "ahora" | "despues" | "luego";

export type RutaItem = {
  id: string;
  when: RutaWhen;
  text: string;
};

export type Accion = {
  id: string;
  kind: "visita" | "llamada" | "nota";
  at: string;
  by: string;
  result: string;
};

export type Comunicacion = {
  id: string;
  at: string;
  channel: Channel;
  medium: string;
  detail: string;
};

export type Expediente = {
  id: string;
  clienteId: "asexia";
  bizId: number;
  name: string;
  city: string;
  sector: string;
  sectorId: string;
  phone: string;
  email: string;
  address: string;
  stage: StageId;
  stageAt: string;
  assigned: string;
  nextAt: string;
  nextWhat: string;
  channel: Channel;
  hours: string;
  chain: boolean;
  angle: string;
  scripts: Scripts;
  significant: string;
  strategy: string;
  strategyAt: string;
  contacts: Contacto[];
  opportunities: Oportunidad[];
  route: RutaItem[];
  actions: Accion[];
  communications: Comunicacion[];
  modulos: ModuloCuenta[];
  citas: Cita[];
  events: CrmEvent[];
};

export type CrmSeed = {
  id: number;
  name: string;
  city: string;
  sectorLabel: string;
  sectorId?: string;
  phone: string;
  email: string;
  address: string;
  angle?: string;
  chain?: boolean;
};

const KEY = "asexia-radar-crm-v1";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function stageLabel(id: StageId) {
  return STAGES.find((stage) => stage.id === id)?.label ?? id;
}

export function channelLabel(id: Channel) {
  if (id === "whatsapp") return "WhatsApp";
  if (id === "visita") return "Visita";
  if (id === "email") return "Correo";
  return "Llamada";
}

export const OPP_STAGES: { id: OppStage; label: string }[] = [
  { id: "abierta", label: "Abierta" },
  { id: "en-curso", label: "En curso" },
  { id: "ganada", label: "Ganada" },
  { id: "pausada", label: "Pausada" },
  { id: "perdida", label: "Perdida" },
];

export function oppLabel(id: OppStage) {
  return OPP_STAGES.find((stage) => stage.id === id)?.label ?? id;
}

export function rutaLabel(when: RutaWhen) {
  if (when === "ahora") return "Ahora";
  if (when === "despues") return "Después";
  return "Más adelante";
}

function normalize(row: Expediente): Expediente {
  const sectorId = row.sectorId || "";
  const angle = row.angle || "";
  const scripts = row.scripts?.visita
    ? row.scripts
    : draftScripts({ name: row.name, city: row.city, sectorId, angle, chain: Boolean(row.chain) });
  return {
    ...row,
    sectorId,
    channel: row.channel || "llamada",
    hours: row.hours || "",
    chain: Boolean(row.chain),
    angle,
    scripts: {
      visita: scripts.visita || "",
      whatsapp: scripts.whatsapp || "",
      email: scripts.email || "",
      seguimiento: scripts.seguimiento || "",
    },
    significant: row.significant || "",
    strategy: row.strategy || "",
    strategyAt: row.strategyAt || "",
    contacts: Array.isArray(row.contacts) ? row.contacts : [],
    opportunities: (Array.isArray(row.opportunities) ? row.opportunities : []).map((item) => ({
      ...item,
      offerId: item.offerId || "",
      detail: item.detail || "",
      score: item.score || 0,
      money: item.money || "",
      evidenced: Boolean(item.evidenced),
    })),
    route: Array.isArray(row.route) ? row.route : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
    communications: Array.isArray(row.communications) ? row.communications : [],
    modulos: mergeModulos(row.modulos),
    citas: Array.isArray(row.citas) ? row.citas : [],
    events: Array.isArray(row.events) ? row.events : [],
    nextAt: row.nextAt || "",
    nextWhat: row.nextWhat || "",
    assigned: row.assigned || "",
  };
}

export function loadCrm(): Expediente[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Expediente[];
    return Array.isArray(data) ? data.filter((row) => row && row.id && row.name).map(normalize) : [];
  } catch {
    return [];
  }
}

export function saveCrm(rows: Expediente[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

export function openExpediente(rows: Expediente[], seed: CrmSeed): Expediente[] {
  const id = String(seed.id);
  const current = rows.find((row) => row.id === id);
  if (current) {
    return rows.map((row) =>
      row.id === id
        ? {
            ...row,
            name: seed.name || row.name,
            phone: seed.phone || row.phone,
            email: seed.email || row.email,
            address: seed.address || row.address,
            sectorId: seed.sectorId || row.sectorId,
            angle: row.angle || seed.angle || "",
            chain: row.chain || Boolean(seed.chain),
          }
        : row,
    );
  }
  const at = new Date().toISOString();
  const created: Expediente = {
    id,
    clienteId: "asexia",
    bizId: seed.id,
    name: seed.name,
    city: seed.city,
    sector: seed.sectorLabel,
    sectorId: seed.sectorId || "",
    phone: seed.phone,
    email: seed.email,
    address: seed.address,
    stage: "sin-contactar",
    stageAt: today(),
    assigned: "",
    nextAt: "",
    nextWhat: "",
    channel: "llamada",
    hours: "",
    chain: Boolean(seed.chain),
    angle: seed.angle || "",
    scripts: draftScripts({
      name: seed.name,
      city: seed.city,
      sectorId: seed.sectorId || "",
      angle: seed.angle || "",
      chain: Boolean(seed.chain),
    }),
    significant: "",
    strategy: "",
    strategyAt: "",
    contacts: [],
    opportunities: [],
    route: [],
    actions: [],
    communications: [],
    modulos: emptyModulos(),
    citas: [],
    events: [{ id: uid(), at, kind: "alta", text: "Entra desde el radar" }],
  };
  return [created, ...rows];
}

export function moveStage(rows: Expediente[], id: string, stage: StageId): Expediente[] {
  const at = new Date().toISOString();
  return rows.map((row) =>
    row.id === id && row.stage !== stage
      ? {
          ...row,
          stage,
          stageAt: at.slice(0, 10),
          events: [{ id: uid(), at, kind: "estado", text: `Estado: ${stageLabel(stage)}` }, ...row.events],
        }
      : row,
  );
}

export function addNote(rows: Expediente[], id: string, text: string): Expediente[] {
  const clean = text.trim();
  if (!clean) return rows;
  const at = new Date().toISOString();
  return rows.map((row) =>
    row.id === id ? { ...row, events: [{ id: uid(), at, kind: "nota", text: clean.slice(0, 500) }, ...row.events] } : row,
  );
}

export function patchExpediente(
  rows: Expediente[],
  id: string,
  patch: Partial<
    Pick<
      Expediente,
      | "assigned"
      | "nextAt"
      | "nextWhat"
      | "phone"
      | "email"
      | "channel"
      | "name"
      | "address"
      | "sector"
      | "hours"
      | "chain"
      | "significant"
      | "strategy"
      | "strategyAt"
      | "angle"
      | "scripts"
    >
  >,
) {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function patchModulo(
  rows: Expediente[],
  id: string,
  moduloId: ModuloId,
  patch: Partial<Pick<ModuloCuenta, "estado" | "vence" | "nota">>,
): Expediente[] {
  return rows.map((row) =>
    row.id === id
      ? { ...row, modulos: row.modulos.map((item) => (item.id === moduloId ? { ...item, ...patch } : item)) }
      : row,
  );
}

export function addContact(rows: Expediente[], id: string, contact: Omit<Contacto, "id">): Expediente[] {
  if (!contact.name.trim() && !contact.phone.trim() && !contact.email.trim()) return rows;
  const next: Contacto = { ...contact, id: uid(), name: contact.name.trim().slice(0, 80), role: contact.role.trim().slice(0, 80) };
  return rows.map((row) => (row.id === id ? { ...row, contacts: [...row.contacts, next] } : row));
}

export function addOpportunity(rows: Expediente[], id: string, title: string, priority: 1 | 2 | 3, comment: string): Expediente[] {
  const clean = title.trim();
  if (!clean) return rows;
  const at = new Date().toISOString();
  const item: Oportunidad = {
    id: uid(),
    offerId: "",
    title: clean.slice(0, 120),
    priority,
    score: 0,
    money: "",
    evidenced: false,
    stage: "abierta",
    stageAt: at.slice(0, 10),
    detail: "",
    comment: comment.trim().slice(0, 400),
  };
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          opportunities: [...row.opportunities, item],
          events: [{ id: uid(), at, kind: "nota", text: `Oportunidad: ${item.title}` }, ...row.events],
        }
      : row,
  );
}

export function patchOpportunity(
  rows: Expediente[],
  id: string,
  oppId: string,
  patch: Partial<Pick<Oportunidad, "priority" | "stage" | "comment" | "title" | "detail">>,
): Expediente[] {
  const at = new Date().toISOString();
  return rows.map((row) => {
    if (row.id !== id) return row;
    return {
      ...row,
      opportunities: row.opportunities.map((item) => {
        if (item.id !== oppId) return item;
        const next = { ...item, ...patch };
        if (patch.stage && patch.stage !== item.stage) next.stageAt = at.slice(0, 10);
        return next;
      }),
    };
  });
}

export function applyRadarUpdate(rows: Expediente[], id: string, offers: OfferSeed[]): { rows: Expediente[]; note: string } {
  const row = rows.find((item) => item.id === id);
  if (!row) return { rows, note: "No está la ficha." };
  const ranked = [...offers].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "es"));
  const known = new Set(row.opportunities.map((item) => item.offerId).filter(Boolean));
  const at = new Date().toISOString();
  let added = 0;
  const opportunities = row.opportunities.map((item) => {
    const seed = ranked.find((offer) => offer.id === item.offerId);
    if (!seed) return item;
    return {
      ...item,
      score: seed.score,
      money: seed.money,
      evidenced: seed.evidenced,
      detail: item.detail.trim() ? item.detail : seed.detail,
    };
  });
  ranked.forEach((seed, index) => {
    if (known.has(seed.id)) return;
    added += 1;
    opportunities.push({
      id: uid(),
      offerId: seed.id,
      title: seed.title.slice(0, 120),
      priority: index < 2 ? 1 : index < 4 ? 2 : 3,
      score: seed.score,
      money: seed.money,
      evidenced: seed.evidenced,
      stage: "abierta",
      stageAt: at.slice(0, 10),
      detail: seed.detail.slice(0, 500),
      comment: "",
    });
  });
  const missing = ranked.filter((offer) => !row.strategy.includes(offer.title));
  let strategy = row.strategy;
  if (missing.length > 0) {
    const lines = missing
      .map(
        (offer) =>
          `${offer.title}: ${offer.short}${offer.money ? ` (${offer.money})` : ""}. ${offer.evidenced ? "Hueco localizado." : "Hipótesis, confirmar en el local."}`,
      )
      .join("\n");
    const head = row.strategy.trim()
      ? `\n\nAñadido el ${at.slice(0, 10)}:\n`
      : `Propuesta para ${row.name}. Se puede corregir. Empieza por lo localizado.${row.chain ? " Es cadena: la decisión puede no ser local." : ""}\n`;
    strategy = `${row.strategy.trim()}${head}${lines}`.slice(0, 4000);
  }
  if (added === 0 && strategy === row.strategy) {
    return { rows, note: "Nada nuevo. Lo escrito se mantiene." };
  }
  const note = [
    added ? `${added} oportunidades nuevas` : "",
    strategy !== row.strategy ? "el informe suma lo que faltaba" : "",
  ]
    .filter(Boolean)
    .join(". ");
  return {
    note: `${note}. Lo que ya estaba escrito no se ha tocado.`,
    rows: rows.map((item) =>
      item.id === id
        ? {
            ...item,
            strategy,
            strategyAt: strategy.trim() ? at.slice(0, 10) : item.strategyAt,
            opportunities,
            events:
              added > 0
                ? [{ id: uid(), at, kind: "nota" as const, text: `Radar: ${added} oportunidades nuevas` }, ...item.events]
                : item.events,
          }
        : item,
    ),
  };
}

export function addRoute(rows: Expediente[], id: string, when: RutaWhen, text: string): Expediente[] {
  const clean = text.trim();
  if (!clean) return rows;
  const item: RutaItem = { id: uid(), when, text: clean.slice(0, 200) };
  return rows.map((row) => (row.id === id ? { ...row, route: [...row.route, item] } : row));
}

export function addAction(rows: Expediente[], id: string, action: Omit<Accion, "id">): Expediente[] {
  if (!action.result.trim() && !action.by.trim()) return rows;
  const at = action.at || new Date().toISOString();
  const item: Accion = {
    id: uid(),
    kind: action.kind,
    at,
    by: action.by.trim().slice(0, 80),
    result: action.result.trim().slice(0, 400),
  };
  const label = item.kind === "visita" ? "Visita" : item.kind === "llamada" ? "Llamada" : "Nota";
  return rows.map((row) =>
    row.id === id
      ? { ...row, actions: [item, ...row.actions], events: [{ id: uid(), at, kind: "nota", text: `${label}: ${item.result || item.by}` }, ...row.events] }
      : row,
  );
}

export function addCommunication(rows: Expediente[], id: string, input: Omit<Comunicacion, "id" | "at">): Expediente[] {
  if (!input.detail.trim() && !input.medium.trim()) return rows;
  const at = new Date().toISOString();
  const item: Comunicacion = {
    id: uid(),
    at,
    channel: input.channel,
    medium: input.medium.trim().slice(0, 80),
    detail: input.detail.trim().slice(0, 500),
  };
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          communications: [item, ...row.communications],
          events: [{ id: uid(), at, kind: "nota", text: `${channelLabel(item.channel)}: ${item.detail || item.medium}` }, ...row.events],
        }
      : row,
  );
}

export function closeAlarm(rows: Expediente[], id: string): Expediente[] {
  const row = rows.find((item) => item.id === id);
  if (!row?.nextWhat) return rows;
  const at = new Date().toISOString();
  const text = `Hecho: ${row.nextWhat}`;
  return rows.map((item) =>
    item.id === id ? { ...item, nextAt: "", nextWhat: "", events: [{ id: uid(), at, kind: "alarma", text }, ...item.events] } : item,
  );
}

export function addCita(rows: Expediente[], id: string, at: string, title: string): Expediente[] {
  const clean = title.trim();
  if (!clean || !at) return rows;
  const now = new Date().toISOString();
  const cita: Cita = { id: uid(), at, title: clean.slice(0, 160), done: false };
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          citas: [...row.citas, cita].sort((a, b) => a.at.localeCompare(b.at)),
          events: [{ id: uid(), at: now, kind: "cita", text: `Cita: ${clean}` }, ...row.events],
        }
      : row,
  );
}

export function toggleCita(rows: Expediente[], id: string, citaId: string): Expediente[] {
  return rows.map((row) =>
    row.id === id ? { ...row, citas: row.citas.map((cita) => (cita.id === citaId ? { ...cita, done: !cita.done } : cita)) } : row,
  );
}
