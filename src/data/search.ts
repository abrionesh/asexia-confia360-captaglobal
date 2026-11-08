import { createServerFn } from "@tanstack/react-start";
import { SECTOR_QUERIES, cityMatches, toBiz, townGeo, type RawPlace } from "@/data/places";
import { nameKey, type Biz } from "@/data/model";

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

export const searchSector = createServerFn({ method: "POST" })
  .validator((input: { cityId: string; sectorId: string; force?: boolean }) => {
    const cityId = String(input?.cityId || "");
    const sectorId = String(input?.sectorId || "");
    if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
    if (!SECTOR_QUERIES[sectorId]) throw new Error("Elige un sector");
    return { cityId, sectorId, force: Boolean(input?.force) };
  })
  .handler(async ({ data }) => runSearch(data.cityId, data.sectorId, data.force));
