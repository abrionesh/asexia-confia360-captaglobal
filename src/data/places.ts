import { nameKey, sectorById, type Biz } from "@/data/model";

export type TownGeo = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  aliases: string[];
  west: number;
  south: number;
  east: number;
  north: number;
};

export const TOWN_GEO: TownGeo[] = [
  { id: "getafe", name: "Getafe", lat: 40.3071, lon: -3.7332, radiusKm: 7, aliases: ["getafe"], west: -3.7617, south: 40.2664, east: -3.5701, north: 40.3347 },
  { id: "leganes", name: "Leganés", lat: 40.3282, lon: -3.7653, radiusKm: 6, aliases: ["leganes"], west: -3.8184, south: 40.2925, east: -3.7209, north: 40.3655 },
  { id: "pinto", name: "Pinto", lat: 40.241, lon: -3.7005, radiusKm: 8, aliases: ["pinto"], west: -3.7413, south: 40.1989, east: -3.6225, north: 40.2929 },
  { id: "fuenlabrada", name: "Fuenlabrada", lat: 40.2825, lon: -3.7923, radiusKm: 6, aliases: ["fuenlabrada"], west: -3.844, south: 40.2496, east: -3.7393, north: 40.3277 },
  { id: "alcorcon", name: "Alcorcón", lat: 40.3493, lon: -3.8284, radiusKm: 6, aliases: ["alcorcon"], west: -3.8788, south: 40.3239, east: -3.7879, north: 40.4031 },
  { id: "mostoles", name: "Móstoles", lat: 40.3239, lon: -3.8649, radiusKm: 7, aliases: ["mostoles"], west: -3.9454, south: 40.2858, east: -3.8409, north: 40.3541 },
  { id: "parla", name: "Parla", lat: 40.2374, lon: -3.7719, radiusKm: 5, aliases: ["parla"], west: -3.8074, south: 40.2012, east: -3.7338, north: 40.2565 },
  { id: "valdemoro", name: "Valdemoro", lat: 40.1887, lon: -3.6706, radiusKm: 8, aliases: ["valdemoro"], west: -3.7182, south: 40.1327, east: -3.5916, north: 40.2296 },
  { id: "humanes", name: "Humanes de Madrid", lat: 40.2509, lon: -3.8271, radiusKm: 4, aliases: ["humanesdemadrid", "humanes"], west: -3.8534, south: 40.2271, east: -3.7964, north: 40.2775 },
  { id: "madrid", name: "Madrid", lat: 40.4168, lon: -3.7038, radiusKm: 12, aliases: ["madrid"], west: -3.889, south: 40.312, east: -3.518, north: 40.643 },
];

export const SECTOR_QUERIES: Record<string, string[]> = {
  hosteleria: ["restaurante", "bar", "cafeteria"],
  peluqueria: ["peluqueria", "barberia"],
  gimnasio: ["gimnasio"],
  clinica: ["clinica", "dentista"],
  estetica: ["estetica", "centro de belleza"],
  vet: ["veterinario"],
  inmobiliaria: ["inmobiliaria"],
  gestion: ["gestion de pisos"],
  taller: ["taller mecanico"],
  asesoria: ["asesoria", "gestoria"],
  academia: ["academia"],
  escuela: ["colegio", "escuela"],
  abogado: ["abogado"],
  arquitectura: ["arquitecto"],
  hotel: ["hotel"],
  concesionario: ["concesionario"],
  alquiler: ["alquiler de coches"],
  agencia: ["agencia de viajes"],
};

const SUB: Record<string, string> = {
  restaurant: "Restaurante",
  bar: "Bar",
  cafe: "Cafetería",
  fast_food: "Comida rápida",
  pub: "Bar",
  ice_cream: "Heladería",
  hairdresser: "Peluquería",
  beauty: "Estética",
  fitness_centre: "Gimnasio",
  clinic: "Clínica",
  doctors: "Clínica",
  dentist: "Clínica dental",
  veterinary: "Veterinaria",
  estate_agent: "Inmobiliaria",
  car_repair: "Taller",
  school: "Escuela",
  kindergarten: "Escuela",
  college: "Escuela",
  hotel: "Hotel",
  guest_house: "Hotel",
  hostel: "Hotel",
  car: "Concesionario",
  car_rental: "Alquiler",
  travel_agency: "Agencia",
  lawyer: "Abogado",
  architect: "Arquitectura",
  tax_advisor: "Asesoría",
  accountant: "Asesoría",
};

export function townGeo(id: string) {
  return TOWN_GEO.find((t) => t.id === id) ?? TOWN_GEO[0];
}

function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

export function nearTown(lat: number, lon: number, town: TownGeo, factor = 1) {
  return km(lat, lon, town.lat, town.lon) <= town.radiusKm * factor;
}

const VALUE_SECTOR: Record<string, string> = {
  restaurant: "hosteleria",
  bar: "hosteleria",
  cafe: "hosteleria",
  fast_food: "hosteleria",
  pub: "hosteleria",
  ice_cream: "hosteleria",
  hairdresser: "peluqueria",
  beauty: "estetica",
  fitness_centre: "gimnasio",
  clinic: "clinica",
  doctors: "clinica",
  dentist: "clinica",
  veterinary: "vet",
  estate_agent: "inmobiliaria",
  car_repair: "taller",
  school: "escuela",
  kindergarten: "escuela",
  college: "escuela",
  hotel: "hotel",
  guest_house: "hotel",
  hostel: "hotel",
  car: "concesionario",
  car_rental: "alquiler",
  travel_agency: "agencia",
  lawyer: "abogado",
  architect: "arquitectura",
  tax_advisor: "asesoria",
  accountant: "asesoria",
};

export function sectorForPlace(osmValue: string | undefined, fallback: string) {
  const hit = osmValue ? VALUE_SECTOR[osmValue] : "";
  if (hit) return hit;
  if (fallback && fallback !== "todos" && SECTOR_QUERIES[fallback]) return fallback;
  return "hosteleria";
}

export function cityMatches(raw: string | undefined, town: TownGeo, lat: number, lon: number) {
  const key = nameKey(raw || "");
  if (key && town.aliases.some((a) => key === a || key.startsWith(a))) return true;
  if (key) return false;
  return km(lat, lon, town.lat, town.lon) <= town.radiusKm;
}

function osmUrl(osmType: string, osmId: number) {
  const kind = osmType === "W" || osmType === "way" ? "way" : osmType === "R" || osmType === "relation" ? "relation" : "node";
  return `https://www.openstreetmap.org/${kind}/${osmId}`;
}

function bizId(osmType: string, osmId: number) {
  const s = `${osmType}:${osmId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 300000000 + ((h >>> 0) % 90000000);
}

function cleanWeb(raw: string) {
  const s = raw.trim();
  if (!s || /^(no|none|null|-)$/i.test(s)) return "";
  if (/^https?:\/\//i.test(s)) return s.slice(0, 200);
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(s)) return `https://${s}`.slice(0, 200);
  return "";
}

function pickPhone(tags: Record<string, string>) {
  return (tags.phone || tags["contact:phone"] || tags["contact:mobile"] || tags.mobile || "").slice(0, 40);
}

export type RawPlace = {
  osmType: string;
  osmId: number;
  name: string;
  lat: number;
  lon: number;
  city?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  district?: string;
  osmValue?: string;
  tags?: Record<string, string>;
};

export function toBiz(place: RawPlace, cityId: string, sectorId: string): Biz | null {
  const town = townGeo(cityId);
  if (!place.name.trim()) return null;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return null;
  if (!cityMatches(place.city, town, place.lat, place.lon)) return null;
  const tags = place.tags ?? {};
  const sector = sectorById(sectorId);
  const web = cleanWeb(tags.website || tags["contact:website"] || tags.url || "");
  const phone = pickPhone(tags);
  const email = (tags.email || tags["contact:email"] || "").includes("@")
    ? (tags.email || tags["contact:email"]).slice(0, 120)
    : "";
  const sub = SUB[place.osmValue || ""] || sector.label;
  const address = [place.street, place.housenumber, place.postcode].filter(Boolean).join(", ");
  return {
    id: bizId(place.osmType, place.osmId),
    city: cityId,
    sectorId,
    name: place.name.trim().slice(0, 120),
    sectorLabel: sector.label,
    sub,
    zone: (place.district || "").slice(0, 60),
    address: address.slice(0, 160),
    phone,
    phoneAlt: "",
    email,
    web,
    hasPage: Boolean(web),
    certIssue: false,
    rating: null,
    reviews: 0,
    reservations: "",
    orders: "",
    whatsapp: "sin-dato",
    chain: false,
    presence: "Mapa",
    why: "Ficha pública de OpenStreetMap. No es el informe del 6 nov 2026 y no está auditada.",
    lat: place.lat,
    lng: place.lon,
    pending: false,
    mapsOk: false,
    sources: [{ label: "OpenStreetMap", url: osmUrl(place.osmType, place.osmId) }],
    imported: false,
    origin: "osm",
  };
}
