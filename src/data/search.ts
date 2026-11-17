import { createServerFn } from "@tanstack/react-start";
import { SECTOR_QUERIES, cityMatches, nearTown, sectorForPlace, toBiz, townGeo, type RawPlace } from "@/data/places";
import { nameKey, sectorById, type Biz } from "@/data/model";

const UA = "RadarAsExIA/1.0 (radar comercial de municipios; contacto publico)";
const TOWN_OK = new Set(["getafe", "leganes", "pinto", "fuenlabrada", "alcorcon", "mostoles", "parla", "valdemoro", "humanes", "madrid"]);
const cache = new Map<string, { at: number; rows: Biz[]; note: string }>();
const TTL = 6 * 60 * 60 * 1000;

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    city?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    district?: string;
    locality?: string;
    osm_value?: string;
  };
};

type NominatimHit = {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  type?: string;
  extratags?: Record<string, string>;
  address?: { city?: string; town?: string; village?: string; suburb?: string; road?: string; house_number?: string; postcode?: string };
};

async function grab(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(14000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function fromPhoton(f: PhotonFeature): RawPlace | null {
  const p = f.properties;
  const coords = f.geometry?.coordinates;
  if (!p?.name || !p.osm_id || !coords) return null;
  return {
    osmType: p.osm_type || "N",
    osmId: p.osm_id,
    name: p.name,
    lon: coords[0],
    lat: coords[1],
    city: p.city,
    street: p.street,
    housenumber: p.housenumber,
    postcode: p.postcode,
    district: p.district || p.locality,
    osmValue: p.osm_value,
  };
}

function fromNominatim(h: NominatimHit): RawPlace | null {
  if (!h.name || !h.osm_id || !h.lat || !h.lon) return null;
  const a = h.address ?? {};
  return {
    osmType: (h.osm_type || "node").slice(0, 1).toUpperCase(),
    osmId: h.osm_id,
    name: h.name,
    lat: Number(h.lat),
    lon: Number(h.lon),
    city: a.city || a.town || a.village,
    street: a.road,
    housenumber: a.house_number,
    postcode: a.postcode,
    district: a.suburb,
    osmValue: h.type,
    tags: h.extratags,
  };
}

function belongsToSector(place: RawPlace, sectorId: string) {
  const value = (place.osmValue || "").toLowerCase();
  if (/highway|residential|road|street|pedestrian|bus_stop|suburb|administrative|town|city|locality/.test(value)) return false;
  const name = place.name.toLowerCase();
  const vet = /veterinar|canin|felin|mascota/.test(name) || value === "veterinary";
  if (sectorId === "vet") return vet;
  if (sectorId !== "clinica") return true;
  if (/farmacia|pharmacy/.test(name) || value === "pharmacy") return false;
  if (vet) return false;
  if (/clinic|doctor|dentist|physiotherapist|hospital|healthcare/.test(value)) return true;
  return /clinic|dental|dentista|odont|fisio|medic|salud|podolog|osteopat|quiro|logoped|psicolog|sanitas|quir[oó]n|hospital|policlin/.test(name);
}

function searchBox(town: ReturnType<typeof townGeo>) {
  const dLat = town.radiusKm / 111;
  const dLon = town.radiusKm / (111 * Math.cos((town.lat * Math.PI) / 180));
  return `${town.lat - dLat},${town.lon - dLon},${town.lat + dLat},${town.lon + dLon}`;
}

async function overpassPlaces(town: ReturnType<typeof townGeo>, sectorId: string) {
  if (sectorId !== "clinica" && sectorId !== "vet") return [] as RawPlace[];
  const bbox = searchBox(town);
  const body =
    sectorId === "vet"
      ? `node["amenity"="veterinary"](${bbox});way["amenity"="veterinary"](${bbox});node["healthcare"="veterinary"](${bbox});way["healthcare"="veterinary"](${bbox});`
      : `node["amenity"~"^(clinic|doctors|dentist|hospital)$"](${bbox});way["amenity"~"^(clinic|doctors|dentist|hospital)$"](${bbox});node["healthcare"~"^(clinic|doctor|dentist|centre|hospital|physiotherapist|psychotherapist|speech_therapist|podiatrist|laboratory|optometrist)$"](${bbox});way["healthcare"~"^(clinic|doctor|dentist|centre|hospital|physiotherapist|speech_therapist|podiatrist|laboratory|optometrist)$"](${bbox});`;
  const query = `[out:json][timeout:20];(${body});out tags center;`;
  const endpoints = ["https://overpass.openstreetmap.fr/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(22000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        elements?: { type?: string; id?: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> }[];
      };
      const places: RawPlace[] = [];
      for (const el of data.elements ?? []) {
        const tags = el.tags ?? {};
        const name = (tags.name || "").trim();
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (!name || !el.id || lat == null || lon == null) continue;
        if (/pharmacy|farmacia/i.test(`${tags.amenity || ""} ${tags.healthcare || ""} ${name}`)) continue;
        places.push({
          osmType: el.type === "way" ? "W" : el.type === "relation" ? "R" : "N",
          osmId: el.id,
          name: name.slice(0, 120),
          lat,
          lon,
          city: tags["addr:city"],
          street: tags["addr:street"],
          housenumber: tags["addr:housenumber"],
          postcode: tags["addr:postcode"],
          osmValue: tags.healthcare || tags.amenity,
          tags,
        });
      }
      return places;
    } catch {
      /* el otro servidor */
    }
  }
  return [] as RawPlace[];
}

function directoryKind(url: string) {
  if (/paginasamarillas\.es/i.test(url)) return "Páginas Amarillas";
  if (/doctoralia\./i.test(url)) return "Doctoralia";
  if (/cylex\.es/i.test(url)) return "Cylex";
  if (/topdoctors\./i.test(url)) return "Top Doctors";
  return "";
}

function listingName(title: string, town: string) {
  const head = title.split(/\s+[|·]\s+|\s+-\s+|\s+en\s+/i)[0]?.trim() || "";
  if (!head || head.length < 3) return "";
  if (/p[aá]ginas amarillas|doctoralia|cylex|top doctors|buscar|directorio/i.test(head)) return "";
  if (nameKey(head) === nameKey(town)) return "";
  return head.slice(0, 120);
}

function sameBusiness(a: string, b: string) {
  const left = nameKey(a);
  const right = nameKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.length >= 8 && right.length >= 8 && (left.includes(right) || right.includes(left));
}

export async function runSearch(cityId: string, sectorId: string, force = false) {
  const queries = SECTOR_QUERIES[sectorId];
  const town = townGeo(cityId);
  if (!queries) return { ok: false as const, error: "Elige un sector para buscar." };
  const key = `v5:${cityId}:${sectorId}`;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL) return { ok: true as const, rows: hit.rows, note: hit.note, at: hit.at };

  const places = new Map<string, RawPlace>();
  const add = (place: RawPlace | null) => {
    if (!place) return;
    if (!cityMatches(place.city, town, place.lat, place.lon)) return;
    places.set(`${place.osmType}:${place.osmId}`, place);
  };

  const photonJobs = queries.map(async (q) => {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", `${q} ${town.name}`);
    url.searchParams.set("limit", "40");
    url.searchParams.set("lat", String(town.lat));
    url.searchParams.set("lon", String(town.lon));
    const body = (await grab(url.toString())) as { features?: PhotonFeature[] };
    for (const feature of body.features ?? []) add(fromPhoton(feature));
  });

  const nominatimJobs = queries.slice(0, 3).map(async (q) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${q} ${town.name}`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "30");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("countrycodes", "es");
    url.searchParams.set("viewbox", `${town.west},${town.north},${town.east},${town.south}`);
    url.searchParams.set("bounded", "1");
    const body = (await grab(url.toString())) as NominatimHit[];
    if (Array.isArray(body)) for (const row of body) add(fromNominatim(row));
  });

  const settled = await Promise.allSettled([...photonJobs, ...nominatimJobs, overpassPlaces(town, sectorId).then((list) => list.forEach((place) => add(place)))]);
  if (settled.every((s) => s.status === "rejected") && places.size === 0) {
    return { ok: false as const, error: "El mapa no ha respondido. Prueba de nuevo o importa un Excel." };
  }

  const idList = [...places.values()].slice(0, 50);
  if (idList.length) {
    try {
      const osmIds = idList.map((p) => {
        const kind = p.osmType === "W" || p.osmType === "way" ? "W" : p.osmType === "R" || p.osmType === "relation" ? "R" : "N";
        return `${kind}${p.osmId}`;
      });
      const url = new URL("https://nominatim.openstreetmap.org/lookup");
      url.searchParams.set("osm_ids", osmIds.join(","));
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("extratags", "1");
      const body = (await grab(url.toString())) as NominatimHit[];
      if (Array.isArray(body)) {
        const byId = new Map(idList.map((p) => [p.osmId, p]));
        for (const row of body) {
          const place = row.osm_id ? byId.get(row.osm_id) : undefined;
          if (!place || !row.extratags) continue;
          place.tags = { ...row.extratags, ...place.tags };
        }
      }
    } catch {
      /* la lista sigue valiendo sin teléfono */
    }
  }

  const seen = new Set<string>();
  const rows: Biz[] = [];
  for (const place of places.values()) {
    if (!belongsToSector(place, sectorId)) continue;
    const biz = toBiz(place, cityId, sectorId);
    if (!biz) continue;
    const nk = nameKey(biz.name);
    if (!nk || seen.has(nk)) continue;
    seen.add(nk);
    rows.push(biz);
    if (rows.length >= 120) break;
  }
  rows.sort((a, b) => Number(Boolean(b.phone)) - Number(Boolean(a.phone)) || a.name.localeCompare(b.name, "es"));

  let fromDirectory = 0;
  if (sectorId === "clinica" || sectorId === "vet") {
    const queriesDir =
      sectorId === "vet"
        ? [`veterinarios ${town.name}`, `clínica veterinaria ${town.name} páginas amarillas`]
        : [`clínicas ${town.name} doctoralia`, `dentistas ${town.name} páginas amarillas`, `fisioterapia ${town.name} cylex`];
    const hits: { title: string; url: string }[] = [];
    await Promise.all(
      queriesDir.map(async (q) => {
        try {
          for (const hit of await duckHits(q)) {
            if (!directoryKind(hit.url)) continue;
            if (!nameKey(`${hit.title} ${hit.url}`).includes(nameKey(town.name))) continue;
            if (!hits.some((item) => item.url === hit.url)) hits.push(hit);
          }
        } catch {
          /* el directorio no ha respondido */
        }
      }),
    );
    for (const hit of hits.slice(0, 12)) {
      const label = directoryKind(hit.url);
      const title = listingName(hit.title, town.name);
      if (!title) continue;
      const current = rows.find((row) => sameBusiness(row.name, title));
      if (current) {
        if (!current.sources.some((item) => item.url === hit.url)) current.sources.push({ label, url: hit.url });
        continue;
      }
      const sector = sectorById(sectorId);
      fromDirectory += 1;
      rows.push({
        id: webId(town.id, title),
        city: town.id,
        sectorId: sector.id,
        name: title,
        sectorLabel: sector.label,
        sub: sector.id === "vet" ? "Veterinaria" : "Clínica",
        zone: "",
        address: "",
        phone: "",
        phoneAlt: "",
        email: "",
        web: "",
        hasPage: false,
        certIssue: false,
        rating: null,
        reviews: 0,
        reservations: "",
        orders: "",
        whatsapp: "sin-dato",
        chain: false,
        presence: "Directorio",
        why: `Sale en ${label} y el resultado nombra ${town.name}. No se ha leído el teléfono: ábrelo y contrasta. No es el mapa.`,
        lat: null,
        lng: null,
        pending: false,
        mapsOk: false,
        sources: [{ label, url: hit.url }],
        imported: false,
        origin: "web",
      });
    }
  }

  const note =
    cityId === "madrid"
      ? `${rows.length} fichas de OpenStreetMap cerca del centro. Madrid no cabe entero en una consulta. No es un censo y no inventa teléfonos.`
      : `${rows.length} fichas en ${town.name}. El mapa entra por etiqueta, no solo por el nombre.${fromDirectory ? ` ${fromDirectory} solo salen en un directorio que nombra el municipio.` : ""} No es un censo y no inventa teléfonos.`;
  const at = Date.now();
  cache.set(key, { at, rows, note });
  return { ok: true as const, rows, note, at };
}

function contactOf(tags: Record<string, string> | undefined) {
  const t = tags ?? {};
  const phone = (t.phone || t["contact:phone"] || t["contact:mobile"] || t.mobile || "").trim().slice(0, 40);
  const emailRaw = (t.email || t["contact:email"] || "").trim();
  const email = emailRaw.includes("@") ? emailRaw.slice(0, 120) : "";
  const webRaw = (t.website || t["contact:website"] || t.url || "").trim();
  let web = "";
  if (/^https?:\/\//i.test(webRaw)) web = webRaw.slice(0, 200);
  else if (/^[\w.-]+\.[a-z]{2,}/i.test(webRaw)) web = `https://${webRaw}`.slice(0, 200);
  return { phone, email, web };
}

function osmLink(osmType: string, osmId: number) {
  const kind = osmType === "W" || osmType === "way" ? "way" : osmType === "R" || osmType === "relation" ? "relation" : "node";
  return `https://www.openstreetmap.org/${kind}/${osmId}`;
}

export type WebHit = { title: string; url: string };

const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36";
const SKIP_HOST = /yahoo\.|bing\.|gstatic|yimg\.|duckduckgo\.|microsoft\.|schema\.org|apple\.com|doubleclick|googlesyndication|googleadservices/i;
const NO_FETCH = /restaurantguru\.|tripadvisor\.|menuweb\.|carta\.menu|cylex\.es|instagram\.com|facebook\.com|tiktok\.com|google\.|paginasamarillas\.|cybo\.com|qdq\.com|11870\.com/i;
const NOT_OWN = /cylex\.es|paginasamarillas\.es|cybo\.com|qdq\.com|11870\.com|google\.|instagram\.com|facebook\.com|tiktok\.com|just-eat\.|glovo\.|ubereats\.|tripadvisor\.|restaurantguru\.|thefork\.|yelp\./i;
const DIRECTORIES: { test: RegExp; label: string }[] = [
  { test: /(^|\.)cylex\.es$/i, label: "Cylex" },
  { test: /(^|\.)paginasamarillas\.es$/i, label: "Páginas Amarillas" },
  { test: /(^|\.)cybo\.com$/i, label: "Cybo" },
  { test: /(^|\.)qdq\.com$/i, label: "QDQ" },
  { test: /(^|\.)11870\.com$/i, label: "11870" },
];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function webId(cityId: string, name: string) {
  const s = `web:${cityId}:${nameKey(name)}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 400000000 + ((h >>> 0) % 90000000);
}

async function pull(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER, Accept: "text/html", "Accept-Language": "es-ES,es" },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

function pageText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function yahooLinks(html: string) {
  const out: string[] = [];
  const re = /RU=(https(?:%3a|%3A)%2[fF]%2[fF][^/"&\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < 8) {
    try {
      const url = decodeURIComponent(match[1]);
      if (!/^https?:\/\//i.test(url) || SKIP_HOST.test(url)) continue;
      if (!out.includes(url)) out.push(url.slice(0, 300));
    } catch {
      /* enlace roto */
    }
  }
  return out.slice(0, 8);
}

async function duckHits(query: string) {
  const html = await pull(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  const out: { url: string; title: string }[] = [];
  const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < 12) {
    const href = match[1].replace(/&/g, "&");
    const found = href.match(/uddg=([^&]+)/);
    if (!found) continue;
    let url = "";
    try {
      url = decodeURIComponent(found[1]);
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(url) || SKIP_HOST.test(url)) continue;
    const title = match[2].replace(/<[^>]+>/g, " ").replace(/&/g, "&").replace(/\s+/g, " ").trim();
    if (!out.some((item) => item.url === url)) out.push({ url: url.slice(0, 300), title: title.slice(0, 140) });
  }
  return out;
}

function siteTitle(title: string) {
  const head = title.split(/\s+[|·]\s+|\s+-\s+/)[0]?.trim() || title;
  return head.replace(/\s+/g, " ").trim().slice(0, 80);
}

function plausiblePhone(digits: string) {
  if (digits.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(digits)) return false;
  if (/123456|000000|111111|999999|012345/.test(digits)) return false;
  return !["912345678", "600000000", "900000000", "910000000"].includes(digits);
}

function findPhones(text: string) {
  const out: string[] = [];
  const re = /(?:\+34|0034)?[\s.-]*([6-9](?:[\s.-]*\d){8})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const digits = match[1].replace(/\D/g, "");
    if (plausiblePhone(digits) && !out.includes(digits)) out.push(digits);
    if (out.length >= 2) break;
  }
  return out;
}

function formatPhone(digits: string) {
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function findAddress(text: string) {
  const labeled = text.match(
    /Direcci[oó]n\s*:?\s*((?:C\/|C\.|Calle|Avda\.?|Avenida|Av\.|Plaza|Paseo|Camino|Ronda|Traves[ií]a)[^.]{4,120})/i,
  );
  const loose = text.match(
    /(?:C\/|C\.|Calle|Avda\.?|Avenida|Av\.|Plaza|Paseo|Camino)\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'-]{2,40},\s*\d{1,4}(?:,\s*\d{5})?(?:,\s*[^.]{0,40})?/,
  );
  return (labeled?.[1] || loose?.[0] || "")
    .replace(/\s+/g, " ")
    .replace(/\s*(Tel[eé]fono|Horario|Tiempo de trabajo|Sitio web|C[oó]mo llegar|Solicitar|Informaci[oó]n).*/i, "")
    .trim()
    .slice(0, 160);
}

function findEmail(text: string, host: string) {
  const found = text.match(/(?:correo|e-?mail)\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ?? "";
  if (!found || found.toLowerCase().endsWith(host)) return "";
  return found.slice(0, 120);
}

function niceName(query: string, html: string) {
  const title = (html.match(/<title>([^<]{3,140})<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const head = title.split(/\s+en\s+/i)[0]?.split(/[|–—:]/)[0]?.trim() ?? "";
  const want = nameKey(query);
  if (head && want && nameKey(head).includes(want) && head.length <= 80) return head;
  return query.trim().slice(0, 120);
}

async function geocode(query: string, town: ReturnType<typeof townGeo>) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "es");
  const body = (await grab(url.toString())) as { lat?: string; lon?: string }[];
  const hit = Array.isArray(body) ? body[0] : undefined;
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !nearTown(lat, lon, town, 1.4)) return null;
  return { lat, lon };
}

type PublicLink = {
  label: string;
  url: string;
  kind: "google" | "directory" | "carta" | "instagram" | "facebook" | "tiktok" | "page";
  siteName?: string;
};

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5);
}

function tokenHit(value: string, tokens: string[]) {
  const got = nameKey(value);
  return tokens.some((token) => got.includes(token));
}

function classifyLink(raw: string, tokens: string[], title = ""): PublicLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const path = decodeURIComponent(url.pathname);
  if (SKIP_HOST.test(host) || /youtube\.com|youtu\.be|wikipedia\.org/.test(host)) return null;
  const directory = DIRECTORIES.find((item) => item.test.test(host));
  if (directory) {
    if (!tokenHit(`${raw} ${title}`, tokens)) return null;
    return { label: directory.label, url: url.toString().slice(0, 300), kind: "directory", siteName: directory.label };
  }
  if ((host === "google.com" || host === "www.google.com") && !path.startsWith("/maps") && !url.search.includes("cid=")) return null;
  if (/instagram\.com$/.test(host)) {
    const user = path.split("/").filter(Boolean)[0] || "";
    if (!user || /^(p|reel|reels|explore|stories|accounts)$/.test(user)) return null;
    if (!tokenHit(user, tokens)) return null;
    return { label: "Instagram", url: `https://www.instagram.com/${user}/`, kind: "instagram" };
  }
  if (host === "facebook.com" || host === "fb.com" || host === "m.facebook.com") {
    const user = path.split("/").filter(Boolean)[0] || "";
    if (!user || /sharer|share|dialog|login|watch|people|pages|tr/.test(user)) return null;
    if (!tokenHit(user, tokens)) return null;
    return { label: "Facebook", url: `https://www.facebook.com/${user}`, kind: "facebook" };
  }
  if (/tiktok\.com$/.test(host)) {
    const user = path.split("/").filter(Boolean)[0] || "";
    if (!user.startsWith("@") || !tokenHit(user, tokens)) return null;
    return { label: "TikTok", url: `https://www.tiktok.com/${user}`, kind: "tiktok" };
  }
  if (/^(maps\.google\.com|google\.com|maps\.app\.goo\.gl)$/.test(host) && (path.startsWith("/maps") || url.search.includes("cid=") || url.search.includes("daddr="))) {
    return { label: "Google Business", url: url.toString().slice(0, 400), kind: "google" };
  }
  if (/carta|\/menu|tripadvisor/.test(`${host}${path}`) && tokenHit(raw, tokens)) {
    return { label: /tripadvisor/.test(host) ? "Tripadvisor" : "Carta", url: url.toString().slice(0, 300), kind: "carta" };
  }
  if (!tokenHit(`${raw} ${title}`, tokens)) return null;
  const name = title ? siteTitle(title) : host;
  return { label: name, url: url.toString().slice(0, 300), kind: "page", siteName: name };
}

function jsonLdNodes(html: string) {
  const nodes: Record<string, unknown>[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const data = JSON.parse(match[1]) as unknown;
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (Array.isArray(row["@graph"])) {
          for (const child of row["@graph"]) if (child && typeof child === "object") nodes.push(child as Record<string, unknown>);
        } else nodes.push(row);
      }
    } catch {
      /* json roto */
    }
  }
  return nodes;
}

function placeNode(nodes: Record<string, unknown>[]) {
  return nodes.find((node) => /Restaurant|LocalBusiness|FoodEstablishment|BarOrPub/i.test(String(node["@type"] || "")));
}

async function fichaFromWeb(name: string, town: ReturnType<typeof townGeo>, sectorHint: string): Promise<Biz | null> {
  const tokens = nameTokens(name);
  const queries = [`${name} ${town.name}`, `${name} ${town.name} teléfono`, `${name} ${town.name} instagram`, `${name} ${town.name} carta`];
  const duckQueries = [`${name} ${town.name}`, `${name} ${town.name} cylex`, `${name} ${town.name} páginas amarillas`];
  const found: PublicLink[] = [];
  const seen = new Set<string>();
  const push = (link: PublicLink | null) => {
    if (!link) return;
    if (link.kind !== "page") {
      const idx = found.findIndex((item) => item.label === link.label);
      if (idx >= 0) {
        const current = found[idx];
        const rank = (url: string) => (url.includes("cid=") ? 3 : url.includes("query=") || url.includes("/maps/search") ? 2 : 1);
        const betterGoogle = link.label === "Google Business" && rank(link.url) > rank(current.url);
        const betterCarta = link.label === "Carta" && /menu/i.test(link.url) && !/menu/i.test(current.url);
        if (betterGoogle || betterCarta) {
          seen.delete(current.url);
          seen.add(link.url);
          found[idx] = link;
        }
        return;
      }
    }
    if (seen.has(link.url)) return;
    seen.add(link.url);
    found.push(link);
  };
  await Promise.all(
    queries.map(async (q) => {
      try {
        const html = await pull(`https://es.search.yahoo.com/search?p=${encodeURIComponent(q)}`);
        for (const link of yahooLinks(html)) push(classifyLink(link, tokens));
      } catch {
        /* otra consulta */
      }
    }),
  );
  await Promise.all(
    duckQueries.map(async (q) => {
      try {
        const hits = await duckHits(q);
        for (const hit of hits) {
          if (!nameKey(`${hit.url} ${hit.title}`).includes(nameKey(town.name))) continue;
          const link = classifyLink(hit.url, tokens, hit.title);
          if (link?.kind === "page") link.siteName = siteTitle(hit.title) || link.siteName;
          push(link);
        }
      } catch {
        /* el directorio no ha respondido */
      }
    }),
  );

  const pages = found
    .filter((link) => link.kind === "page" && !NO_FETCH.test(link.url) && nameKey(link.url).includes(nameKey(town.name)))
    .slice(0, 4);
  const read = await Promise.all(
    pages.map(async (link) => {
      try {
        return { link, html: await pull(link.url) };
      } catch {
        return null;
      }
    }),
  );

  let bestName = name.trim().slice(0, 120);
  let address = "";
  let phone = "";
  let phoneAlt = "";
  let email = "";
  let rating: number | null = null;
  let reviews = 0;
  let lat: number | null = null;
  let lng: number | null = null;
  let dataHost = "";

  for (const item of read) {
    if (!item) continue;
    const text = pageText(item.html);
    const blob = nameKey(text);
    if (!blob.includes(nameKey(town.name)) || (tokens.length && !tokens.some((token) => blob.includes(token)))) continue;
    const hrefs = item.html.match(/https?:\/\/[^"'\\\s<>]+/g) ?? [];
    for (const href of hrefs) push(classifyLink(href.replace(/&/g, "&"), tokens));
    const place = placeNode(jsonLdNodes(item.html));
    const schemaPhone = String(place?.telephone || "").replace(/\D/g, "");
    const phones = findPhones(text);
    if (schemaPhone.length >= 9) phones.unshift(schemaPhone.slice(-9));
    const schemaAddress = place?.address && typeof place.address === "object" ? (place.address as Record<string, unknown>) : null;
    const schemaStreet = [schemaAddress?.streetAddress, schemaAddress?.postalCode, schemaAddress?.addressLocality].filter(Boolean).join(", ");
    const nextAddress = String(schemaStreet || findAddress(text) || "");
    const ratingNode = place?.aggregateRating && typeof place.aggregateRating === "object" ? (place.aggregateRating as Record<string, unknown>) : null;
    const nextRating = Number(ratingNode?.ratingValue);
    const nextReviews = Number(ratingNode?.ratingCount || ratingNode?.reviewCount || 0);
    const geo = place?.geo && typeof place.geo === "object" ? (place.geo as Record<string, unknown>) : null;
    if (!phone && phones[0] && plausiblePhone(phones[0].replace(/\D/g, "").slice(-9))) {
      const main = phones[0].replace(/\D/g, "").slice(-9);
      phone = formatPhone(main);
      if (phones[1]) phoneAlt = formatPhone(phones[1].replace(/\D/g, "").slice(-9));
      dataHost = hostOf(item.link.url);
      if (nextAddress) address = nextAddress.slice(0, 160);
      const titled = String(place?.name || "");
      if (titled && tokenHit(titled, tokens)) bestName = titled.slice(0, 120);
      else {
        const titledHtml = niceName(name, item.html);
        if (tokenHit(titledHtml, tokens)) bestName = titledHtml;
      }
    }
    if (!email) email = findEmail(text, hostOf(item.link.url));
    if (Number.isFinite(nextRating) && nextRating >= 1 && nextRating <= 5 && nextReviews > reviews) {
      rating = Math.round(nextRating * 10) / 10;
      reviews = nextReviews;
    }
    const geoLat = Number(geo?.latitude);
    const geoLng = Number(geo?.longitude);
    if (lat == null && Number.isFinite(geoLat) && Number.isFinite(geoLng) && nearTown(geoLat, geoLng, town, 1.4)) {
      lat = geoLat;
      lng = geoLng;
    }
  }

  const own = found.find((link) => link.kind === "page" && !NOT_OWN.test(link.url));
  if (!phone && !own && !found.some((link) => link.kind !== "page")) return null;

  if (lat == null && address) {
    try {
      const point = await geocode(`${address} ${town.name}`, town);
      if (point) {
        lat = point.lat;
        lng = point.lon;
      }
    } catch {
      /* sin punto */
    }
  }

  const googleQuery = encodeURIComponent([bestName, address, town.name].filter(Boolean).join(" "));
  push({
    label: "Google Business",
    url: `https://www.google.com/maps/search/?api=1&query=${googleQuery}`,
    kind: "google",
  });
  const web = own?.url || "";
  const webName = own ? own.siteName || hostOf(own.url) : "";
  const order = ["google", "directory", "carta", "instagram", "facebook", "tiktok", "page"];
  const sources = found
    .filter((link) => link.kind !== "page" || link.url === web || (dataHost && link.url.includes(dataHost)))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, 8)
    .map((link) => ({ label: link.kind === "page" ? link.siteName || hostOf(link.url) : link.label, url: link.url }));

  const sectorId = sectorHint && sectorHint !== "todos" ? sectorHint : "hosteleria";
  const sector = sectorById(sectorId);
  return {
    id: webId(town.id, name),
    city: town.id,
    sectorId: sector.id,
    name: bestName,
    sectorLabel: sector.label,
    sub: sector.id === "hosteleria" ? "Restaurante" : sector.label,
    zone: "",
    address,
    phone,
    phoneAlt,
    email,
    web,
    webName,
    hasPage: Boolean(web),
    certIssue: false,
    rating,
    reviews,
    reservations: "",
    orders: "",
    whatsapp: "sin-dato",
    chain: false,
    presence: rating ? "Nota" : "Web",
    why: `Teléfono y dirección${dataHost ? ` de ${dataHost}` : ""}${webName ? `. Web: ${webName}` : ""}. Google Business abre la ficha. Cylex, Páginas Amarillas y otros directorios públicos solo entran si el resultado nombra el municipio. No es el informe del 6 nov: contrasta antes de usarlos.`,
    lat,
    lng,
    pending: false,
    mapsOk: false,
    sources,
    imported: false,
    origin: "web",
  };
}

function webLinks(name: string, town: string, site?: string): WebHit[] {
  const q = encodeURIComponent(`${name} ${town}`);
  const hits: WebHit[] = [];
  if (site && /^https?:\/\//i.test(site)) hits.push({ title: "Web del negocio", url: site });
  hits.push({ title: `Buscar «${name}» en la web`, url: `https://www.google.com/search?q=${q}&hl=es` });
  hits.push({ title: `Buscar «${name}» en otro buscador`, url: `https://duckduckgo.com/?q=${q}` });
  return hits;
}

export async function runSearchNamed(cityId: string, name: string, sectorHint: string) {
  const town = townGeo(cityId);
  const q = `${name} ${town.name}`.slice(0, 160);
  const want = nameKey(name);
  const candidates: RawPlace[] = [];
  const add = (place: RawPlace | null) => {
    if (!place?.name) return;
    if (!nearTown(place.lat, place.lon, town, 1.15) && !cityMatches(place.city, town, place.lat, place.lon)) return;
    candidates.push(place);
  };

  const mapJob = Promise.allSettled([
    (async () => {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "8");
      url.searchParams.set("lat", String(town.lat));
      url.searchParams.set("lon", String(town.lon));
      const body = (await grab(url.toString())) as { features?: PhotonFeature[] };
      for (const feature of body.features ?? []) add(fromPhoton(feature));
    })(),
    (async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "5");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("extratags", "1");
      url.searchParams.set("countrycodes", "es");
      const body = (await grab(url.toString())) as NominatimHit[];
      if (Array.isArray(body)) for (const row of body) add(fromNominatim(row));
    })(),
  ]);
  await mapJob;

  const best = candidates
    .map((place) => {
      const got = nameKey(place.name);
      const score = got === want ? 3 : want.length >= 4 && (got.includes(want) || want.includes(got)) ? 2 : 0;
      return { place, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.place;

  let biz: Biz | null = null;
  if (best) {
    let tags = { ...(best.tags ?? {}) };
    try {
      const kind = best.osmType === "W" || best.osmType === "way" ? "W" : best.osmType === "R" || best.osmType === "relation" ? "R" : "N";
      const url = new URL("https://nominatim.openstreetmap.org/lookup");
      url.searchParams.set("osm_ids", `${kind}${best.osmId}`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("extratags", "1");
      const body = (await grab(url.toString())) as NominatimHit[];
      const row = Array.isArray(body) ? body.find((item) => item.osm_id === best.osmId) : undefined;
      if (row?.extratags) tags = { ...row.extratags, ...tags };
    } catch {
      /* seguimos sin teléfono */
    }
    const place: RawPlace = { ...best, tags };
    if (!cityMatches(place.city, town, place.lat, place.lon) && nearTown(place.lat, place.lon, town, 1.15)) {
      place.city = undefined;
    }
    biz = toBiz(place, cityId, sectorForPlace(place.osmValue, sectorHint));
  }

  if (!biz) biz = await fichaFromWeb(name, town, sectorHint);
  else {
    const extra = await fichaFromWeb(name, town, sectorHint);
    if (extra) {
      if (!biz.web && extra.web) {
        biz = { ...biz, web: extra.web, webName: extra.webName, hasPage: true };
      }
      const urls = new Set(biz.sources.map((item) => item.url));
      const sources = [...biz.sources];
      for (const item of extra.sources) {
        if (urls.has(item.url)) continue;
        urls.add(item.url);
        sources.push(item);
      }
      biz = { ...biz, sources: sources.slice(0, 8) };
    }
  }
  return { ok: true as const, biz, web: biz ? [] : webLinks(name, town.name) };
}

export const searchNamed = createServerFn({ method: "POST" })
  .validator((input: { cityId: string; name: string; sectorId?: string }) => {
    const cityId = String(input?.cityId || "");
    const name = String(input?.name || "").trim().slice(0, 120);
    const sectorId = String(input?.sectorId || "");
    if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
    if (name.length < 2) throw new Error("Falta el nombre");
    return { cityId, name, sectorId };
  })
  .handler(async ({ data }) => runSearchNamed(data.cityId, data.name, data.sectorId));

export async function runSearchOne(cityId: string, name: string) {
  const town = townGeo(cityId);
  const q = `${name} ${town.name}`.slice(0, 160);
  const candidates: RawPlace[] = [];
  const add = (place: RawPlace | null) => {
    if (place?.name) candidates.push(place);
  };

  await Promise.allSettled([
    (async () => {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "8");
      url.searchParams.set("lat", String(town.lat));
      url.searchParams.set("lon", String(town.lon));
      const body = (await grab(url.toString())) as { features?: PhotonFeature[] };
      for (const feature of body.features ?? []) add(fromPhoton(feature));
    })(),
    (async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "5");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("extratags", "1");
      url.searchParams.set("countrycodes", "es");
      const body = (await grab(url.toString())) as NominatimHit[];
      if (Array.isArray(body)) for (const row of body) add(fromNominatim(row));
    })(),
  ]);

  const want = nameKey(name);
  const best = candidates
    .map((place) => {
      const got = nameKey(place.name);
      const score = got === want ? 3 : got.includes(want) || want.includes(got) ? 2 : 0;
      return { place, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.place;

  if (!best) return { ok: false as const, error: "Este negocio no aparece en el mapa." };

  let tags = { ...(best.tags ?? {}) };
  try {
    const kind = best.osmType === "W" || best.osmType === "way" ? "W" : best.osmType === "R" || best.osmType === "relation" ? "R" : "N";
    const url = new URL("https://nominatim.openstreetmap.org/lookup");
    url.searchParams.set("osm_ids", `${kind}${best.osmId}`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("extratags", "1");
    const body = (await grab(url.toString())) as NominatimHit[];
    const row = Array.isArray(body) ? body.find((item) => item.osm_id === best.osmId) : undefined;
    if (row?.extratags) tags = { ...row.extratags, ...tags };
  } catch {
    /* seguimos con lo que ya había */
  }

  const contact = contactOf(tags);
  let web = contact.web;
  let webName = web ? hostOf(web) : "";
  if (!web) {
    try {
      const hits = await duckHits(`${name} ${town.name}`);
      const tokens = nameTokens(name);
      for (const hit of hits) {
        if (!nameKey(`${hit.url} ${hit.title}`).includes(nameKey(town.name))) continue;
        const link = classifyLink(hit.url, tokens, hit.title);
        if (!link || link.kind !== "page" || NOT_OWN.test(link.url)) continue;
        web = link.url;
        webName = siteTitle(hit.title) || hostOf(link.url);
        break;
      }
    } catch {
      /* sin web en los directorios */
    }
  }
  const address = [best.street, best.housenumber, best.postcode, best.city].filter(Boolean).join(", ");
  return {
    ok: true as const,
    name: best.name,
    phone: contact.phone,
    email: contact.email,
    web,
    webName,
    address: address.slice(0, 160),
    sourceUrl: osmLink(best.osmType, best.osmId),
  };
}

export const searchBusiness = createServerFn({ method: "POST" })
  .validator((input: { cityId: string; name: string }) => {
    const cityId = String(input?.cityId || "");
    const name = String(input?.name || "").trim().slice(0, 120);
    if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
    if (name.length < 2) throw new Error("Falta el nombre");
    return { cityId, name };
  })
  .handler(async ({ data }) => runSearchOne(data.cityId, data.name));

export const searchSector = createServerFn({ method: "POST" })
  .validator((input: { cityId: string; sectorId: string; force?: boolean }) => {
    const cityId = String(input?.cityId || "");
    const sectorId = String(input?.sectorId || "");
    if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
    if (!SECTOR_QUERIES[sectorId]) throw new Error("Elige un sector");
    return { cityId, sectorId, force: Boolean(input?.force) };
  })
  .handler(async ({ data }) => runSearch(data.cityId, data.sectorId, data.force));
