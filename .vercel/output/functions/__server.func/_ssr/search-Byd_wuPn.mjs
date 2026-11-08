import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { C as townGeo, b as toBiz, p as nameKey, r as SECTOR_QUERIES, s as cityMatches } from "./places-BJ7DURjs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-Byd_wuPn.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var UA = "RadarAsExIA/1.0 (radar comercial de municipios; contacto publico)";
var TOWN_OK = /* @__PURE__ */ new Set([
	"getafe",
	"leganes",
	"pinto",
	"fuenlabrada",
	"alcorcon",
	"mostoles",
	"parla",
	"valdemoro",
	"humanes",
	"madrid"
]);
var cache = /* @__PURE__ */ new Map();
var TTL = 216e5;
async function grab(url) {
	const res = await fetch(url, {
		headers: {
			"User-Agent": UA,
			Accept: "application/json"
		},
		signal: AbortSignal.timeout(14e3)
	});
	if (!res.ok) throw new Error(String(res.status));
	return res.json();
}
function fromPhoton(f) {
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
		osmValue: p.osm_value
	};
}
function fromNominatim(h) {
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
		tags: h.extratags
	};
}
async function runSearch(cityId, sectorId, force = false) {
	const queries = SECTOR_QUERIES[sectorId];
	const town = townGeo(cityId);
	if (!queries) return {
		ok: false,
		error: "Elige un sector para buscar."
	};
	const key = `v2:${cityId}:${sectorId}`;
	const hit = cache.get(key);
	if (!force && hit && Date.now() - hit.at < TTL) return {
		ok: true,
		rows: hit.rows,
		note: hit.note,
		at: hit.at
	};
	const places = /* @__PURE__ */ new Map();
	const add = (place) => {
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
		const body = await grab(url.toString());
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
		const body = await grab(url.toString());
		if (Array.isArray(body)) for (const row of body) add(fromNominatim(row));
	})();
	if ((await Promise.allSettled([...photonJobs, nominatimJob])).every((s) => s.status === "rejected") && places.size === 0) return {
		ok: false,
		error: "El mapa no ha respondido. Prueba de nuevo o importa un Excel."
	};
	const idList = [...places.values()].slice(0, 50);
	if (idList.length) try {
		const osmIds = idList.map((p) => {
			return `${p.osmType === "W" || p.osmType === "way" ? "W" : p.osmType === "R" || p.osmType === "relation" ? "R" : "N"}${p.osmId}`;
		});
		const url = new URL("https://nominatim.openstreetmap.org/lookup");
		url.searchParams.set("osm_ids", osmIds.join(","));
		url.searchParams.set("format", "jsonv2");
		url.searchParams.set("extratags", "1");
		const body = await grab(url.toString());
		if (Array.isArray(body)) {
			const byId = new Map(idList.map((p) => [p.osmId, p]));
			for (const row of body) {
				const place = row.osm_id ? byId.get(row.osm_id) : void 0;
				if (!place || !row.extratags) continue;
				place.tags = {
					...row.extratags,
					...place.tags
				};
			}
		}
	} catch {}
	const seen = /* @__PURE__ */ new Set();
	const rows = [];
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
	const note = cityId === "madrid" ? `${rows.length} fichas de OpenStreetMap cerca del centro. Madrid no cabe entero en una consulta. No es un censo y no inventa teléfonos.` : `${rows.length} fichas de OpenStreetMap en ${town.name}. No es un censo: lo que no sale puede existir. No inventa teléfonos.`;
	const at = Date.now();
	cache.set(key, {
		at,
		rows,
		note
	});
	return {
		ok: true,
		rows,
		note,
		at
	};
}
var searchSector_createServerFn_handler = createServerRpc({
	id: "7558de16b2ae04204a8ee48e09bb157babdc355e46e04af4a81dc908f52a0bb3",
	name: "searchSector",
	filename: "src/data/search.ts"
}, (opts) => searchSector.__executeServer(opts));
var searchSector = createServerFn({ method: "POST" }).validator((input) => {
	const cityId = String(input?.cityId || "");
	const sectorId = String(input?.sectorId || "");
	if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
	if (!SECTOR_QUERIES[sectorId]) throw new Error("Elige un sector");
	return {
		cityId,
		sectorId,
		force: Boolean(input?.force)
	};
}).handler(searchSector_createServerFn_handler, async ({ data }) => runSearch(data.cityId, data.sectorId, data.force));
//#endregion
export { searchSector_createServerFn_handler };
