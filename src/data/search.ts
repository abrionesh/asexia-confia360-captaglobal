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

export async function runSearch(cityId: string, sectorId: string, force = false) {
  const queries = SECTOR_QUERIES[sectorId];
  const town = townGeo(cityId);
  if (!queries) return { ok: false as const, error: "Elige un sector para buscar." };
  const key = `v2:${cityId}:${sectorId}`;
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
    url.searchParams.set("limit", "50");
    url.searchParams.set("lat", String(town.lat));
    url.searchParams.set("lon", String(town.lon));
    const body = (await grab(url.toString())) as { features?: PhotonFeature[] };
    for (const feature of body.features ?? []) add(fromPhoton(feature));
  });

  const nominatimJob = (async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${queries[0]} ${town.name}`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "40");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("countrycodes", "es");
    url.searchParams.set("viewbox", `${town.west},${town.north},${town.east},${town.south}`);
    url.searchParams.set("bounded", "1");
    const body = (await grab(url.toString())) as NominatimHit[];
    if (Array.isArray(body)) for (const row of body) add(fromNominatim(row));
  })();

  const settled = await Promise.allSettled([...photonJobs, nominatimJob]);
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
    const biz = toBiz(place, cityId, sectorId);
    if (!biz) continue;
    const nk = nameKey(biz.name);
    if (!nk || seen.has(nk)) continue;
    seen.add(nk);
    rows.push(biz);
    if (rows.length >= 120) break;
  }
  rows.sort((a, b) => Number(Boolean(b.phone)) - Number(Boolean(a.phone)) || a.name.localeCompare(b.name, "es"));

  const note =
    cityId === "madrid"
      ? `${rows.length} fichas de OpenStreetMap cerca del centro. Madrid no cabe entero en una consulta. No es un censo y no inventa teléfonos.`
      : `${rows.length} fichas de OpenStreetMap en ${town.name}. No es un censo: lo que no sale puede existir. No inventa teléfonos.`;
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
const NO_FETCH = /restaurantguru\.|tripadvisor\.|menuweb\.|carta\.menu|cylex\.es|instagram\.com|facebook\.com|tiktok\.com|google\./i;

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

type PublicLink = { label: string; url: string; kind: "google" | "carta" | "instagram" | "facebook" | "tiktok" | "page" };

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

function classifyLink(raw: string, tokens: string[]): PublicLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const path = decodeURIComponent(url.pathname);
  if (SKIP_HOST.test(host) || /youtube\.com|youtu\.be|wikipedia\.org/.test(host)) return null;
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
    return { label: "Google", url: url.toString().slice(0, 400), kind: "google" };
  }
  if (/carta|\/menu|tripadvisor/.test(`${host}${path}`) && tokenHit(raw, tokens)) {
    return { label: /tripadvisor/.test(host) ? "Tripadvisor" : "Carta", url: url.toString().slice(0, 300), kind: "carta" };
  }
  if (!tokenHit(raw, tokens)) return null;
  return { label: host, url: url.toString().slice(0, 300), kind: "page" };
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
  const found: PublicLink[] = [];
  const seen = new Set<string>();
  const push = (link: PublicLink | null) => {
    if (!link) return;
    if (link.kind !== "page") {
      const idx = found.findIndex((item) => item.label === link.label);
      if (idx >= 0) {
        const current = found[idx];
        const rank = (url: string) => (url.includes("cid=") ? 3 : url.includes("query=") || url.includes("/maps/search") ? 2 : 1);
        const betterGoogle = link.label === "Google" && rank(link.url) > rank(current.url);
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

  if (!phone && !found.some((link) => link.kind !== "page")) return null;

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
    label: "Google",
    url: `https://www.google.com/maps/search/?api=1&query=${googleQuery}`,
    kind: "google",
  });
  const order = ["google", "carta", "instagram", "facebook", "tiktok", "page"];
  const sources = found
    .filter((link) => link.kind !== "page" || link.url.includes(dataHost))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, 8)
    .map((link) => ({ label: link.kind === "page" ? "Fuente" : link.label, url: link.url }));

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
    web: "",
    hasPage: false,
    certIssue: false,
    rating,
    reviews,
    reservations: "",
    orders: "",
    whatsapp: "sin-dato",
    chain: false,
    presence: rating ? "Nota" : "Web",
    why: `Teléfono y dirección${dataHost ? ` de ${dataHost}` : ""}. Google abre la ficha con carta y reseñas. Las redes solo entran si el enlace contiene el nombre. No es el informe del 6 nov: contrasta antes de usarlos.`,
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
  const address = [best.street, best.housenumber, best.postcode, best.city].filter(Boolean).join(", ");
  return {
    ok: true as const,
    name: best.name,
    phone: contact.phone,
    email: contact.email,
    web: contact.web,
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
