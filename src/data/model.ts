import rows from "./getafe.json";

export type Source = { label: string; url: string };

export type CatalogRow = {
  id: number;
  name: string;
  sector: string;
  sub: string;
  zone: string;
  address: string;
  phone: string;
  phoneAlt: string;
  email: string;
  web: string;
  webInsecure: boolean;
  certIssue: boolean;
  hasPage: boolean;
  maps: string;
  rating: number | null;
  reviews: number;
  reservations: string;
  orders: string;
  whatsapp: string;
  chain: boolean;
  presence: string;
  score: number;
  why: string;
  lat: number | null;
  lng: number | null;
  pending: boolean;
  mapsOk: boolean;
  sources: Source[];
};

export type Biz = {
  id: number;
  city: string;
  sectorId: string;
  name: string;
  sectorLabel: string;
  sub: string;
  zone: string;
  address: string;
  phone: string;
  phoneAlt: string;
  email: string;
  web: string;
  hasPage: boolean;
  certIssue: boolean;
  rating: number | null;
  reviews: number;
  reservations: string;
  orders: string;
  whatsapp: string;
  chain: boolean;
  presence: string;
  why: string;
  lat: number | null;
  lng: number | null;
  pending: boolean;
  mapsOk: boolean;
  sources: Source[];
  imported: boolean;
  origin?: "informe" | "osm" | "archivo";
};

export type Offer = {
  id: string;
  title: string;
  detail: string;
  short: string;
  a: number;
  b: number;
  m: number;
  evidenced: boolean;
};

export type Ticket = "low" | "medium" | "high";

export type Sector = {
  id: string;
  label: string;
  ticket: Ticket | null;
  investigated: boolean;
};

export const SECTORS: Sector[] = [
  { id: "todos", label: "Todos", ticket: null, investigated: true },
  { id: "hosteleria", label: "Hostelería", ticket: "low", investigated: true },
  { id: "peluqueria", label: "Peluquerías", ticket: "low", investigated: false },
  { id: "gimnasio", label: "Gimnasios", ticket: "low", investigated: false },
  { id: "clinica", label: "Clínicas", ticket: "high", investigated: false },
  { id: "estetica", label: "Medicina estética", ticket: "high", investigated: false },
  { id: "vet", label: "Clínicas veterinarias", ticket: "medium", investigated: false },
  { id: "inmobiliaria", label: "Inmobiliarias", ticket: "high", investigated: false },
  { id: "gestion", label: "Gestión de pisos", ticket: "medium", investigated: false },
  { id: "taller", label: "Talleres", ticket: "medium", investigated: false },
  { id: "asesoria", label: "Asesorías", ticket: "medium", investigated: false },
  { id: "academia", label: "Academias", ticket: "medium", investigated: false },
  { id: "escuela", label: "Escuelas", ticket: "high", investigated: false },
  { id: "abogado", label: "Abogados", ticket: "medium", investigated: false },
  { id: "arquitectura", label: "Arquitectura", ticket: "high", investigated: false },
  { id: "hotel", label: "Hoteles", ticket: "medium", investigated: false },
  { id: "concesionario", label: "Concesionarios", ticket: "high", investigated: false },
  { id: "alquiler", label: "Alquiler de coches", ticket: "low", investigated: false },
  { id: "agencia", label: "Agencias de viaje", ticket: "medium", investigated: false },
];

export const TOWNS = [
  { id: "getafe", name: "Getafe", ready: true },
  { id: "leganes", name: "Leganés", ready: false },
  { id: "pinto", name: "Pinto", ready: false },
  { id: "fuenlabrada", name: "Fuenlabrada", ready: false },
  { id: "alcorcon", name: "Alcorcón", ready: false },
  { id: "mostoles", name: "Móstoles", ready: false },
  { id: "parla", name: "Parla", ready: false },
  { id: "valdemoro", name: "Valdemoro", ready: false },
  { id: "humanes", name: "Humanes de Madrid", ready: false },
  { id: "madrid", name: "Madrid", ready: false },
];

const SIT = new Set([
  "Restaurante / bar",
  "Bar",
  "Cervecería",
  "Mesón",
  "Gastrobar",
  "Asador",
  "Taberna",
  "Brasa / parrilla",
  "Parrilla",
  "Peruano",
  "Italiano",
  "Mexicano",
  "Libanés",
  "Indio",
  "Venezolano",
  "Chino",
  "Asiático",
  "Sushi / japonés",
  "Ramen / japonés",
  "Pizzería / italiano",
  "Vinoteca / bar",
]);

export const CATALOG: Biz[] = (rows as CatalogRow[]).map((r) => ({
  id: r.id,
  city: "getafe",
  sectorId: "hosteleria",
  name: r.name,
  sectorLabel: "Hostelería",
  sub: r.sub,
  zone: r.zone,
  address: r.address,
  phone: r.phone,
  phoneAlt: r.phoneAlt,
  email: r.email,
  web: r.web,
  hasPage: r.hasPage,
  certIssue: r.certIssue,
  rating: r.rating,
  reviews: r.reviews,
  reservations: r.reservations,
  orders: r.orders,
  whatsapp: r.whatsapp,
  chain: r.chain,
  presence: r.presence,
  why: r.why,
  lat: r.lat,
  lng: r.lng,
  pending: r.pending,
  mapsOk: r.mapsOk,
  sources: r.sources ?? [],
  imported: false,
  origin: "informe",
}));

export function sectorById(id: string) {
  return SECTORS.find((s) => s.id === id) ?? SECTORS[0];
}

export function townById(id: string) {
  return TOWNS.find((t) => t.id === id) ?? TOWNS[0];
}

export function buildOffers(b: Biz): Offer[] {
  if (b.pending) return [];
  if (originOf(b) === "osm") return osmOffers(b);
  return informeOffers(b);
}

function osmOffers(b: Biz): Offer[] {
  const offers: Offer[] = [];
  if (!b.hasPage) {
    offers.push({
      id: "web",
      title: "Web nueva",
      short: "web no consta en el mapa",
      detail: "OpenStreetMap no trae página. No localizado no significa inexistente. Márcala solo si lo compruebas.",
      a: 800,
      b: 1500,
      m: 0,
      evidenced: false,
    });
  }
  if (!b.reservations && !b.chain && (SIT.has(b.sub) || b.sub === "Restaurante" || b.sub === "Cafetería")) {
    offers.push({
      id: "res",
      title: "Web de reservas",
      short: "reserva no consta en el mapa",
      detail: "La ficha de mapa no trae reservas. Puede existir fuera. No es un hueco del informe.",
      a: 500,
      b: 1500,
      m: 30,
      evidenced: false,
    });
  }
  offers.push(
    {
      id: "qr",
      title: "Carta digital (SaaS)",
      short: "sin comprobar",
      detail: "Actívala solo si lo ves en el local.",
      a: 0,
      b: 0,
      m: 49,
      evidenced: false,
    },
    {
      id: "wa",
      title: "Agente de WhatsApp",
      short: "sin verificar",
      detail: "Un teléfono del mapa no implica WhatsApp.",
      a: 350,
      b: 900,
      m: 45,
      evidenced: false,
    },
    {
      id: "camp",
      title: "Campañas por WhatsApp",
      short: "sin base verificada",
      detail: "No hay lista de contactos comprobada.",
      a: 200,
      b: 350,
      m: 60,
      evidenced: false,
    },
  );
  return offers;
}

function informeOffers(b: Biz): Offer[] {
  const offers: Offer[] = [];
  if (!b.hasPage) {
    offers.push({
      id: "web",
      title: "Web nueva",
      short: "sin página propia localizada",
      detail:
        "La investigación no atribuyó una página propia. No localizado no significa inexistente.",
      a: 800,
      b: 1500,
      m: 0,
      evidenced: true,
    });
  }
  if (b.certIssue) {
    offers.push({
      id: "https",
      title: "Candado https",
      short: "error de certificado anotado",
      detail:
        "El informe del 6 nov 2026 anotó un error de certificado en un dominio asociado. No es una auditoría nueva.",
      a: 400,
      b: 900,
      m: 0,
      evidenced: true,
    });
  }
  if (!b.reservations && !b.chain && SIT.has(b.sub)) {
    offers.push({
      id: "res",
      title: "Web de reservas",
      short: "reserva online no localizada",
      detail:
        "No hay enlace de reserva atribuido. Puede existir fuera de las fuentes leídas.",
      a: 500,
      b: 1500,
      m: 30,
      evidenced: true,
    });
  }
  if (b.orders && !b.chain) {
    offers.push({
      id: "app",
      title: "App de pedidos",
      short: "pedidos enlazados en plataforma",
      detail: `Pedido enlazado: ${b.orders}. Que pague comisión es una hipótesis comercial, no un dato del informe.`,
      a: 1500,
      b: 3500,
      m: 0,
      evidenced: true,
    });
  }
  offers.push(
    {
      id: "qr",
      title: "Carta digital (SaaS)",
      short: "carta con QR, sin comprobar",
      detail: "La investigación no auditó carta con QR. Actívala solo si lo ves en el local.",
      a: 0,
      b: 0,
      m: 49,
      evidenced: false,
    },
    {
      id: "wa",
      title: "Agente de WhatsApp",
      short: "WhatsApp no verificado como canal",
      detail:
        b.whatsapp === "anunciado"
          ? "WhatsApp anunciado por el negocio. Un agente es una idea, no una carencia demostrada."
          : "WhatsApp no aparece anunciado. Un móvil no implica WhatsApp.",
      a: 350,
      b: 900,
      m: 45,
      evidenced: false,
    },
    {
      id: "camp",
      title: "Campañas por WhatsApp",
      short: "promos, sin base verificada",
      detail: "Avisos a clientes. No hay lista de contactos comprobada.",
      a: 200,
      b: 350,
      m: 60,
      evidenced: false,
    },
  );
  return offers;
}

export type Pref = { on: string[]; off: string[] };

export function emptyPref(): Pref {
  return { on: [], off: [] };
}

export function offerOn(o: Offer, pref: Pref) {
  return o.evidenced ? !pref.off.includes(o.id) : pref.on.includes(o.id);
}

export function totals(offers: Offer[], pref: Pref) {
  let a = 0;
  let b = 0;
  let m = 0;
  for (const o of offers) {
    if (!offerOn(o, pref)) continue;
    a += o.a;
    b += o.b;
    m += o.m;
  }
  return { a, b, m };
}

export type Heat = "high" | "mid" | "low";

export function heatOf(max: number): Heat {
  if (max > 3500) return "high";
  if (max >= 1500) return "mid";
  return "low";
}

export function euro(n: number) {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}

export function moneyLine(o: Offer) {
  const span = o.a === 0 && o.b === 0 ? "" : o.a === o.b ? euro(o.a) : `${euro(o.a)} – ${euro(o.b)}`;
  const month = o.m ? `${o.m.toLocaleString("es-ES")} €/mes` : "";
  if (span && month) return `${span} + ${month}`;
  return span || month;
}

export function telHref(phone: string | undefined) {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 9) return `tel:+34${d}`;
  if (d.startsWith("34") && d.length >= 11) return `tel:+${d}`;
  if (!d) return "";
  return `tel:+${d}`;
}

export function gapLine(b: Biz, offers: Offer[], pref: Pref) {
  if (b.pending) return "Identidad hostelera pendiente. No es un prospecto.";
  if (originOf(b) === "osm") {
    return b.phone ? "Contacto público en OpenStreetMap. Sin auditar." : "En el mapa, sin teléfono publicado.";
  }
  if (originOf(b) === "archivo") {
    const active = offers.filter((o) => o.evidenced && offerOn(o, pref));
    if (active.length === 0) return "Lista importada. Sin hueco marcado.";
    return `${active[0].title}: ${active[0].short}`;
  }
  const active = offers.filter((o) => o.evidenced && offerOn(o, pref));
  if (b.chain && active.length === 0) return "Cadena: la decisión puede no ser local.";
  if (active.length === 0) return "Sin hueco evidenciado en el informe.";
  return `${active[0].title}: ${active[0].short}`;
}

export function channels(b: Biz) {
  const list: string[] = [];
  if (b.hasPage || b.web) list.push("Web");
  if (b.reservations) list.push("Reservas");
  if (b.orders) list.push("Pedidos");
  if (b.email) list.push("Email");
  if (b.whatsapp === "anunciado") list.push("WhatsApp");
  if (b.phone) list.push("Teléfono");
  return list;
}

export function researchBrief(sectorLabel: string, town: string) {
  return `Elabora un catálogo de ${sectorLabel.toLowerCase()} de ${town} con presencia digital y contacto público empresarial. Fecha de consulta: hoy.

LISTA BASE
1. Busca por categoría y zona en Google Maps y recorre los resultados por barrios.
2. Complementa con listados municipales, directorios locales y, si es un centro sanitario, el registro oficial accesible.
3. Registra nombre y dirección de cada candidato. No presentes la lista como censo exhaustivo.

VERIFICACIÓN, NEGOCIO A NEGOCIO
4. Busca cada nombre junto con su dirección. Contrasta teléfono y dirección (homónimos, cadenas de otro municipio).
5. Atribuye identidad, contacto y canales desde las fuentes del propio negocio; después directorios; por último, datos sin confirmar. Anota las fuentes rechazadas.
6. Web: comprueba HTTP y HTTPS por separado. Reservas o cita: distingue directorio de página propia. No contactes, no reserves y no pidas cita. WhatsApp solo si el negocio lo anuncia. No inventes emails.
7. Un canal ausente se registra como «no encontrado» con fecha, no como inexistente.

SALIDA
CSV con punto y coma y estas columnas:
nombre;sector;subtipo;direccion;telefono;email;web;zona;lat;lng;reservas;pedidos;fuente_url
El sector debe ser uno de: ${SECTORS.filter((s) => s.id !== "todos")
    .map((s) => s.label)
    .join(", ")}.

LÍMITES
Sin proyecciones de precios, demanda o ingresos. Sin contactar con los negocios. No localizado no significa inexistente.`;
}

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export const nameKey = norm;

export function originOf(b: Biz): "informe" | "osm" | "archivo" {
  if (b.origin) return b.origin;
  return b.imported ? "archivo" : "informe";
}

export function sectorIdFromLabel(label: string) {
  const n = norm(label);
  const hit = SECTORS.find((s) => s.id !== "todos" && (norm(s.label) === n || norm(s.id) === n));
  if (hit) return hit.id;
  if (/restaur|bar|cafeter|hosteler|taberna/.test(n)) return "hosteleria";
  if (/pelu|barber|belleza/.test(n)) return "peluqueria";
  if (/gym|gimnas|fitness/.test(n)) return "gimnasio";
  if (/veter/.test(n)) return "vet";
  if (/estet/.test(n)) return "estetica";
  if (/clinic|dental|fisio|medic/.test(n)) return "clinica";
  if (/inmob/.test(n)) return "inmobiliaria";
  if (/taller|mecan/.test(n)) return "taller";
  if (/asesor|gestor/.test(n)) return "asesoria";
  if (/academ/.test(n)) return "academia";
  if (/escuel/.test(n)) return "escuela";
  if (/abog/.test(n)) return "abogado";
  if (/arquit/.test(n)) return "arquitectura";
  if (/hotel/.test(n)) return "hotel";
  if (/conces/.test(n)) return "concesionario";
  if (/alquiler|rent/.test(n)) return "alquiler";
  if (/agencia|viaje/.test(n)) return "agencia";
  return "hosteleria";
}

function splitCsv(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseImport(text: string, city: string): { rows: Biz[]; skipped: number } {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], skipped: 0 };
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = splitCsv(lines[0], sep).map(norm);
  const idx = (name: string) => header.indexOf(norm(name));
  const rows: Biz[] = [];
  let skipped = 0;
  lines.slice(1).forEach((line, n) => {
    const cells = splitCsv(line, sep).map((c) => c.trim());
    const get = (key: string) => {
      const i = idx(key);
      return i >= 0 ? cells[i] || "" : "";
    };
    const name = get("nombre") || get("name");
    if (!name) {
      skipped++;
      return;
    }
    const sectorId = sectorIdFromLabel(get("sector") || get("tipo") || "Hostelería");
    const sector = sectorById(sectorId);
    const lat = Number(String(get("lat") || get("latitud")).replace(",", "."));
    const lng = Number(String(get("lng") || get("longitud") || get("lon")).replace(",", "."));
    const web = get("web");
    const fuente = get("fuente_url") || get("fuente");
    rows.push({
      id: 200000 + n + Math.floor(Math.random() * 1000),
      city,
      sectorId,
      name: name.slice(0, 120),
      sectorLabel: sector?.label ?? "Otro",
      sub: (get("subtipo") || get("subsector") || "Sin subtipo").slice(0, 60),
      zone: (get("zona") || "").slice(0, 60),
      address: (get("direccion") || "").slice(0, 160),
      phone: (get("telefono") || "").slice(0, 30),
      phoneAlt: (get("telefono2") || get("telefono_alt") || "").slice(0, 30),
      email: get("email").includes("@") ? get("email").slice(0, 120) : "",
      web: /^https?:\/\//i.test(web) ? web.slice(0, 200) : "",
      hasPage: /^https?:\/\//i.test(web),
      certIssue: false,
      rating: null,
      reviews: 0,
      reservations: get("reservas").slice(0, 80),
      orders: get("pedidos").slice(0, 80),
      whatsapp: "sin-dato",
      chain: false,
      presence: "Importado",
      why: "Importado desde una lista pegada. Sin verificar en esta app.",
      lat: Number.isFinite(lat) && lat > 35 && lat < 45 ? lat : null,
      lng: Number.isFinite(lng) && lng > -10 && lng < 5 ? lng : null,
      pending: false,
      mapsOk: false,
      sources: /^https?:\/\//i.test(fuente) ? [{ label: "Fuente de la lista", url: fuente.slice(0, 300) }] : [],
      imported: true,
      origin: "archivo",
    });
  });
  return { rows, skipped };
}
