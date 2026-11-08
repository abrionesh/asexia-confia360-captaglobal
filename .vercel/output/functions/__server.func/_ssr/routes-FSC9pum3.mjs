import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as ChevronLeft, D as Briefcase, E as Building2, S as ChevronRight, T as CarFront, _ as Hotel, a as Stethoscope, b as Dumbbell, c as School, d as Plane, f as Phone, g as KeyRound, h as LayoutGrid, l as Scale, m as MapPin, n as UtensilsCrossed, o as Sparkles, p as PawPrint, r as Upload, s as Scissors, t as Wrench, u as Ruler, v as GraduationCap, w as ChevronDown, x as Download, y as Flame } from "../_libs/lucide-react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { C as townGeo, S as townById, _ as researchBrief, a as buildOffers, c as emptyPref, d as heatOf, f as moneyLine, g as parseImport, h as originOf, i as TOWNS, l as euro, m as offerOn, n as SECTORS, o as channels, p as nameKey, r as SECTOR_QUERIES, t as CATALOG, u as gapLine, v as sectorById, x as totals, y as telHref } from "./places-BJ7DURjs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-FSC9pum3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COLOR = {
	high: "#a3e635",
	mid: "#e3a008",
	low: "#8b97a3"
};
function RadarMap({ points, activeId, onPick, homeLat, homeLng, frame }) {
	const host = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	const groupRef = (0, import_react.useRef)(null);
	const leafletRef = (0, import_react.useRef)(null);
	const pick = (0, import_react.useRef)(onPick);
	pick.current = onPick;
	const fitted = (0, import_react.useRef)("");
	const [epoch, setEpoch] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!host.current) return;
		let dead = false;
		let view = null;
		(async () => {
			const L = await import("../_libs/leaflet.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
			if (dead || !host.current) return;
			view = L.map(host.current, {
				zoomControl: false,
				scrollWheelZoom: false,
				attributionControl: true
			}).setView([40.308, -3.732], 13);
			L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
				attribution: "&copy; OpenStreetMap &copy; CARTO",
				subdomains: "abcd",
				maxZoom: 19
			}).addTo(view);
			const group = L.layerGroup().addTo(view);
			leafletRef.current = L;
			mapRef.current = view;
			groupRef.current = group;
			setEpoch((n) => n + 1);
			window.setTimeout(() => view?.invalidateSize(), 80);
		})();
		return () => {
			dead = true;
			view?.remove();
			mapRef.current = null;
			groupRef.current = null;
			leafletRef.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const L = leafletRef.current;
		const group = groupRef.current;
		if (!epoch || !L || !group) return;
		group.clearLayers();
		for (const { biz, heat } of points) {
			if (biz.lat == null || biz.lng == null) continue;
			const active = biz.id === activeId;
			const marker = L.circleMarker([biz.lat, biz.lng], {
				radius: active ? 9 : 6,
				color: active ? "#f3f6f1" : COLOR[heat],
				weight: active ? 2 : 1,
				fillColor: COLOR[heat],
				fillOpacity: .92
			});
			marker.on("click", () => pick.current(biz.id));
			marker.bindTooltip(biz.name, {
				direction: "top",
				opacity: .95
			});
			marker.addTo(group);
		}
		const coords = points.flatMap(({ biz }) => biz.lat == null || biz.lng == null ? [] : [[biz.lat, biz.lng]]);
		const map = mapRef.current;
		if (map && fitted.current !== frame) {
			fitted.current = frame;
			if (coords.length >= 2) map.fitBounds(L.latLngBounds(coords), {
				padding: [28, 28],
				maxZoom: 14,
				animate: false
			});
			else if (coords.length === 1) map.setView(coords[0], 15, { animate: false });
			else map.setView([homeLat, homeLng], 13, { animate: false });
		}
	}, [
		points,
		activeId,
		epoch,
		frame,
		homeLat,
		homeLng
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: host,
		className: "radar-map h-64 w-full"
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
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
var searchBusiness = createServerFn({ method: "POST" }).validator((input) => {
	const cityId = String(input?.cityId || "");
	const name = String(input?.name || "").trim().slice(0, 120);
	if (!TOWN_OK.has(cityId)) throw new Error("Municipio no admitido");
	if (name.length < 2) throw new Error("Falta el nombre");
	return {
		cityId,
		name
	};
}).handler(createSsrRpc("a48c5685df01995c7132b76b9d4ec95741f9c93fba631f11bb5dd4fce342aaf8"));
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
}).handler(createSsrRpc("7558de16b2ae04204a8ee48e09bb157babdc355e46e04af4a81dc908f52a0bb3"));
var KEY = "asexia-radar-municipio-v1";
var FOUND_KEY = "asexia-radar-busqueda-v2";
var FRESH = 432e5;
var ICONS = {
	todos: LayoutGrid,
	hosteleria: UtensilsCrossed,
	peluqueria: Scissors,
	gimnasio: Dumbbell,
	clinica: Stethoscope,
	estetica: Sparkles,
	vet: PawPrint,
	inmobiliaria: Building2,
	gestion: KeyRound,
	taller: Wrench,
	asesoria: Briefcase,
	academia: GraduationCap,
	escuela: School,
	abogado: Scale,
	arquitectura: Ruler,
	hotel: Hotel,
	concesionario: CarFront,
	alquiler: CarFront,
	agencia: Plane
};
var TICKET = {
	low: "Low ticket",
	medium: "Medium ticket",
	high: "High ticket"
};
var HEAT_LABEL = {
	high: "Alta",
	mid: "Media",
	low: "Baja"
};
function ticketClass(ticket, active) {
	if (!ticket) return "";
	if (ticket === "high") return active ? "bg-lime text-bg" : "text-lime";
	if (ticket === "medium") return active ? "bg-amber text-bg" : "text-amber";
	return "text-muted";
}
function RadarScreen() {
	const scroller = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const foundRef = (0, import_react.useRef)({});
	const force = (0, import_react.useRef)(false);
	const [city, setCity] = (0, import_react.useState)("getafe");
	const [sector, setSector] = (0, import_react.useState)("hosteleria");
	const [sub, setSub] = (0, import_react.useState)("");
	const [q, setQ] = (0, import_react.useState)("");
	const [phoneOnly, setPhoneOnly] = (0, import_react.useState)(true);
	const [sort, setSort] = (0, import_react.useState)("money");
	const [openId, setOpenId] = (0, import_react.useState)(null);
	const [extras, setExtras] = (0, import_react.useState)({});
	const [imported, setImported] = (0, import_react.useState)([]);
	const [found, setFound] = (0, import_react.useState)({});
	const [patches, setPatches] = (0, import_react.useState)({});
	const [refreshingId, setRefreshingId] = (0, import_react.useState)(null);
	const [booted, setBooted] = (0, import_react.useState)(false);
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [searchError, setSearchError] = (0, import_react.useState)("");
	const [tick, setTick] = (0, import_react.useState)(0);
	const [cityOpen, setCityOpen] = (0, import_react.useState)(false);
	const [briefOpen, setBriefOpen] = (0, import_react.useState)(false);
	const [paste, setPaste] = (0, import_react.useState)("");
	const [toast, setToast] = (0, import_react.useState)("");
	foundRef.current = found;
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) {
				const data = JSON.parse(raw);
				if (Array.isArray(data.imported)) setImported(data.imported);
				if (data.extras) setExtras(data.extras);
				if (data.patches) setPatches(data.patches);
				if (data.city && TOWNS.some((t) => t.id === data.city)) setCity(data.city);
			}
			const saved = localStorage.getItem(FOUND_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") setFound(parsed);
			}
		} catch {}
		setBooted(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!booted) return;
		localStorage.setItem(KEY, JSON.stringify({
			imported,
			extras,
			city,
			patches
		}));
	}, [
		imported,
		extras,
		city,
		patches,
		booted
	]);
	(0, import_react.useEffect)(() => {
		if (!booted) return;
		try {
			localStorage.setItem(FOUND_KEY, JSON.stringify(found));
		} catch {}
	}, [found, booted]);
	(0, import_react.useEffect)(() => {
		if (!booted || sector === "todos") return;
		const key = `${city}:${sector}`;
		const bypass = force.current;
		force.current = false;
		const cached = foundRef.current[key];
		if (!bypass && cached && Date.now() - cached.at < FRESH) {
			setSearchError("");
			return;
		}
		let dead = false;
		const timer = window.setTimeout(() => {
			setSearching(true);
			setSearchError("");
			searchSector({ data: {
				cityId: city,
				sectorId: sector,
				force: bypass
			} }).then((res) => {
				if (dead) return;
				if (!res.ok) {
					setSearchError(res.error);
					return;
				}
				setFound((prev) => ({
					...prev,
					[key]: {
						at: res.at,
						rows: res.rows,
						note: res.note
					}
				}));
			}).catch(() => {
				if (!dead) setSearchError("No se ha podido buscar. Puedes importar un Excel.");
			}).finally(() => {
				if (!dead) setSearching(false);
			});
		}, 350);
		return () => {
			dead = true;
			window.clearTimeout(timer);
		};
	}, [
		booted,
		city,
		sector,
		tick
	]);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const t = window.setTimeout(() => setToast(""), 2200);
		return () => window.clearTimeout(t);
	}, [toast]);
	const town = townById(city);
	const sectorMeta = sectorById(sector);
	const pool = (0, import_react.useMemo)(() => {
		const base = city === "getafe" ? CATALOG : [];
		const known = new Set(base.map((b) => nameKey(b.name)));
		const fromFile = imported.filter((b) => b.city === city && !known.has(nameKey(b.name)));
		for (const b of fromFile) known.add(nameKey(b.name));
		const fromMap = Object.entries(found).filter(([k]) => k.startsWith(`${city}:`)).flatMap(([, pack]) => pack.rows).filter((b) => b.city === city && !known.has(nameKey(b.name)));
		return [
			...base,
			...fromFile,
			...fromMap
		];
	}, [
		city,
		imported,
		found
	]);
	const patched = (0, import_react.useMemo)(() => pool.map((b) => {
		const p = patches[b.id];
		if (!p) return b;
		return {
			...b,
			phone: p.phone ?? b.phone,
			email: p.email ?? b.email,
			phoneAlt: p.phoneAlt ?? b.phoneAlt,
			web: p.web ?? b.web,
			address: p.address ?? b.address,
			hasPage: p.web ? true : b.hasPage
		};
	}), [pool, patches]);
	const counts = (0, import_react.useMemo)(() => {
		const map = { todos: pool.length };
		for (const s of SECTORS) if (s.id !== "todos") map[s.id] = 0;
		for (const b of pool) map[b.sectorId] = (map[b.sectorId] ?? 0) + 1;
		return map;
	}, [pool]);
	const subs = (0, import_react.useMemo)(() => {
		const src = pool.filter((b) => sector === "todos" || b.sectorId === sector);
		const map = /* @__PURE__ */ new Map();
		for (const b of src) map.set(b.sub, (map.get(b.sub) ?? 0) + 1);
		return [...map.entries()].sort((a, b) => b[1] - a[1]);
	}, [pool, sector]);
	const visible = (0, import_react.useMemo)(() => {
		const query = q.trim().toLowerCase();
		const list = patched.filter((b) => {
			if (sector !== "todos" && b.sectorId !== sector) return false;
			if (sub && b.sub !== sub) return false;
			if (phoneOnly && !(b.phone || "").trim() && !(b.phoneAlt || "").trim()) return false;
			if (!query) return true;
			return `${b.name} ${b.zone} ${b.sub} ${b.address} ${b.email}`.toLowerCase().includes(query);
		});
		const prefOf = (b) => extras[b.id] ?? emptyPref();
		list.sort((a, b) => {
			if (sort === "name") return a.name.localeCompare(b.name, "es");
			if (sort === "reviews") return (b.reviews || 0) - (a.reviews || 0);
			const ma = totals(buildOffers(a), prefOf(a)).b;
			return totals(buildOffers(b), prefOf(b)).b - ma || (b.reviews || 0) - (a.reviews || 0);
		});
		return list;
	}, [
		patched,
		sector,
		sub,
		phoneOnly,
		q,
		sort,
		extras
	]);
	const points = (0, import_react.useMemo)(() => visible.map((biz) => ({
		biz,
		heat: heatOf(totals(buildOffers(biz), extras[biz.id] ?? emptyPref()).b)
	})), [visible, extras]);
	const withPhone = patched.filter((b) => (b.phone || "").trim() || (b.phoneAlt || "").trim()).length;
	const searchPack = sector === "todos" ? void 0 : found[`${city}:${sector}`];
	const hiddenPhones = patched.filter((b) => {
		if (sector !== "todos" && b.sectorId !== sector) return false;
		return !(b.phone || "").trim() && !(b.phoneAlt || "").trim();
	}).length;
	function scrollSectors(dir) {
		scroller.current?.scrollBy({
			left: dir * 220,
			behavior: "smooth"
		});
	}
	function setContact(id, field, value) {
		setPatches((prev) => ({
			...prev,
			[id]: {
				...prev[id],
				[field]: value.slice(0, 120)
			}
		}));
	}
	async function refreshBiz(b) {
		setRefreshingId(b.id);
		try {
			const res = await searchBusiness({ data: {
				cityId: b.city || city,
				name: b.name
			} });
			if (!res.ok) {
				setToast(res.error);
				return;
			}
			setPatches((prev) => {
				const next = { ...prev[b.id] ?? {} };
				if (res.phone) next.phone = res.phone;
				if (res.email) next.email = res.email;
				if (res.web) next.web = res.web;
				if (res.address) next.address = res.address;
				return {
					...prev,
					[b.id]: next
				};
			});
			const bits = [
				res.phone && "teléfono",
				res.email && "correo",
				res.web && "web"
			].filter(Boolean);
			setToast(bits.length ? `Actualizado: ${bits.join(", ")}` : "Sigue sin teléfono ni correo en el mapa");
		} catch {
			setToast("No se ha podido repetir la búsqueda");
		} finally {
			setRefreshingId(null);
		}
	}
	function toggleOffer(b, id, evidenced) {
		setExtras((prev) => {
			const p = prev[b.id] ?? emptyPref();
			const next = {
				on: [...p.on],
				off: [...p.off]
			};
			if (evidenced) next.off = next.off.includes(id) ? next.off.filter((x) => x !== id) : [...next.off, id];
			else next.on = next.on.includes(id) ? next.on.filter((x) => x !== id) : [...next.on, id];
			return {
				...prev,
				[b.id]: next
			};
		});
	}
	function pick(id) {
		setOpenId(id);
		window.setTimeout(() => {
			document.getElementById(`biz-${id}`)?.scrollIntoView({
				block: "nearest",
				behavior: "smooth"
			});
		}, 30);
	}
	async function copyBrief() {
		const text = researchBrief(sector === "todos" ? "negocios" : sectorMeta.label, town.name);
		try {
			await navigator.clipboard.writeText(text);
			setToast("Encargo copiado");
		} catch {
			setToast("No se pudo copiar");
		}
	}
	function downloadCsv() {
		const csv = [[
			"nombre",
			"sector",
			"subtipo",
			"zona",
			"direccion",
			"telefono",
			"telefono_alt",
			"email",
			"web",
			"reservas",
			"pedidos",
			"hipotesis_hasta",
			"mensual",
			"lat",
			"lng"
		], ...visible.map((b) => {
			const t = totals(buildOffers(b), extras[b.id] ?? emptyPref());
			return [
				b.name,
				b.sectorLabel,
				b.sub,
				b.zone,
				b.address,
				b.phone,
				b.phoneAlt,
				b.email,
				b.web,
				b.reservations,
				b.orders,
				String(t.b),
				String(t.m),
				b.lat ?? "",
				b.lng ?? ""
			];
		})].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(";")).join("\n");
		const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `radar-asexia-${city}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
	function absorb(rows, skipped) {
		if (!rows.length) {
			setToast(skipped ? "Ninguna fila con nombre" : "El archivo no trae fichas");
			return;
		}
		const knownNames = new Set(pool.map((b) => nameKey(b.name)));
		const fresh = rows.filter((r) => !knownNames.has(nameKey(r.name)));
		setImported((prev) => {
			let nextId = 2e5 + prev.length;
			return [...prev, ...fresh.map((r) => ({
				...r,
				id: ++nextId
			}))];
		});
		setPaste("");
		setBriefOpen(false);
		setSector("todos");
		setToast(fresh.length ? `${fresh.length} fichas del archivo` : "Esas fichas ya estaban");
	}
	function onImport() {
		const { rows, skipped } = parseImport(paste, city);
		absorb(rows, skipped);
	}
	async function onFile(file) {
		try {
			const buf = await file.arrayBuffer();
			const lower = file.name.toLowerCase();
			let text = "";
			if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
				const XLSX = await import("../_libs/xlsx.mjs").then((n) => n.t);
				const book = XLSX.read(buf, { type: "array" });
				const sheet = book.Sheets[book.SheetNames[0]];
				text = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
			} else {
				const utf = new TextDecoder("utf-8").decode(buf);
				text = utf.includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : utf;
			}
			const { rows, skipped } = parseImport(text, city);
			absorb(rows, skipped);
		} catch {
			setToast("No se ha podido leer el archivo");
		}
	}
	const showResearch = visible.length === 0 && !q;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "safe-pad mx-auto min-h-screen max-w-lg px-4 pb-16 pt-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold tracking-widest text-lime uppercase",
				children: "Radar · AsExIA"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-display text-3xl leading-none font-extrabold tracking-tight",
				children: "¿A quién le preparas una propuesta?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative mt-4 overflow-hidden rounded-3xl border border-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadarMap, {
					points,
					activeId: openId,
					onPick: pick,
					homeLat: townGeo(city).lat,
					homeLng: townGeo(city).lon,
					frame: `${city}:${sector}:${points.length}`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
							heat: "high",
							label: "+3.500 €"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
							heat: "mid",
							label: "1.500 – 3.500 €"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
							heat: "low",
							label: "menos"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: searching ? `Buscando ${sectorMeta.label.toLowerCase()} en ${town.name}…` : searchError ? searchError : searchPack?.note ?? "El informe del 6 nov 2026 sigue en Getafe hostelería. El resto lo busca OpenStreetMap: no inventa teléfonos."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setCityOpen(true),
					className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-lime bg-card px-4 text-sm font-semibold text-lime",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
							className: "size-4",
							"aria-hidden": true
						}),
						town.name,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-normal text-muted",
							children: "· cambiar"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (sector === "todos") {
							setSector("hosteleria");
							return;
						}
						force.current = true;
						setTick((n) => n + 1);
					},
					className: "min-h-11 shrink-0 text-sm font-semibold text-lime",
					children: searching ? "Buscando…" : "Buscar de nuevo"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 text-right text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-ink",
						children: [visible.length, " en pantalla"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						" ",
						"· ",
						pool.length,
						" fichas · ",
						withPhone,
						" con teléfono"
					] }),
					phoneOnly && hiddenPhones > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setPhoneOnly(false),
						className: "mt-1 block text-xs font-semibold text-lime",
						children: [
							"Ver ",
							hiddenPhones,
							" sin teléfono"
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Sectores anteriores",
						onClick: () => scrollSectors(-1),
						className: "flex size-11 shrink-0 items-center justify-center rounded-full border border-lime bg-bg text-lime",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: scroller,
						className: "scroll-x min-w-0 flex-1 py-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-flow-col grid-rows-2 gap-2",
							style: { gridAutoColumns: "7.5rem" },
							children: SECTORS.map((s) => {
								const Icon = ICONS[s.id] ?? LayoutGrid;
								const active = sector === s.id;
								const n = counts[s.id] ?? 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										setSector(s.id);
										setSub("");
										setOpenId(null);
									},
									className: "flex h-full min-h-32 flex-col rounded-2xl border p-3 text-left " + (active ? "border-lime bg-surface" : "border-line bg-card"),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											className: active ? "size-6 text-lime" : "size-6 text-muted",
											"aria-hidden": true
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-2 block truncate text-sm font-semibold",
											children: s.label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-display text-2xl leading-none",
											children: n
										}),
										s.ticket ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs font-semibold " + ticketClass(s.ticket, active),
											children: TICKET[s.ticket]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-2 block text-xs text-muted",
											children: "Catálogo"
										}),
										!s.investigated && n === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-1 block text-xs text-muted",
											children: searching && sector === s.id ? "Buscando" : "Sin buscar"
										}) : null
									]
								}, s.id);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Sectores siguientes",
						onClick: () => scrollSectors(1),
						className: "flex size-11 shrink-0 items-center justify-center rounded-full border border-lime bg-bg text-lime",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-5" })
					})
				]
			}),
			subs.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "scroll-x mt-3 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubChip, {
					active: !sub,
					label: "Subsector",
					count: subs.reduce((a, [, n]) => a + n, 0),
					onClick: () => setSub("")
				}), subs.map(([name, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubChip, {
					active: sub === name,
					label: name,
					count: n,
					onClick: () => setSub(name)
				}, name))]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "Buscar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Nombre, zona o subtipo",
						className: "min-h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "min-h-11",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "Ordenar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: sort,
						onChange: (e) => setSort(e.target.value),
						className: "min-h-11 rounded-xl border border-line bg-card px-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "money",
								children: "Más dinero primero"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "reviews",
								children: "Más reseñas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "name",
								children: "Nombre"
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex items-center justify-between gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setPhoneOnly((v) => !v),
						className: "inline-flex min-h-11 items-center gap-2 text-sm",
						"aria-pressed": phoneOnly,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "relative h-6 w-11 rounded-full " + (phoneOnly ? "bg-lime" : "bg-line"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-0.5 size-5 rounded-full bg-bg transition-transform " + (phoneOnly ? "translate-x-5" : "translate-x-0.5") })
						}), "Solo con teléfono"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: downloadCsv,
						className: "inline-flex min-h-11 items-center gap-1 text-sm text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
							className: "size-4",
							"aria-hidden": true
						}), "CSV"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => fileRef.current?.click(),
						className: "inline-flex min-h-11 items-center gap-1 text-sm text-lime",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {
							className: "size-4",
							"aria-hidden": true
						}), "Excel"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: ".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						className: "sr-only",
						onChange: (e) => {
							const file = e.target.files?.[0];
							e.target.value = "";
							if (file) onFile(file);
						}
					})
				]
			}),
			showResearch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-3xl border border-dashed border-line bg-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-semibold",
						children: searching ? "Buscando en el mapa" : `Sin fichas de ${sectorMeta.label.toLowerCase()} en ${town.name}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: phoneOnly && hiddenPhones > 0 ? "Hay fichas sin teléfono. Quita el filtro para verlas, o importa un Excel con los contactos que ya tengas." : "OpenStreetMap no ha devuelto esta lista. No significa que no existan. Puedes repetir la búsqueda o importar CSV / Excel."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								force.current = true;
								setTick((n) => n + 1);
							},
							className: "min-h-11 rounded-xl bg-lime px-4 font-semibold text-bg",
							children: "Buscar otra vez"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => fileRef.current?.click(),
							className: "min-h-11 rounded-xl border border-line px-4",
							children: "Importar"
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [visible.length, " fichas en pantalla"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-col gap-3",
				children: visible.map((b) => {
					const pref = extras[b.id] ?? emptyPref();
					const offers = buildOffers(b);
					const sum = totals(offers, pref);
					const heat = heatOf(sum.b);
					const open = openId === b.id;
					const chips = channels(b);
					const shown = chips.slice(0, 2);
					const rest = chips.length - shown.length;
					const call = telHref(b.phone);
					const callAlt = telHref(b.phoneAlt);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						id: `biz-${b.id}`,
						className: "rounded-3xl border bg-card " + (open ? "border-lime" : "border-line"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setOpenId(open ? null : b.id),
								className: "w-full text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-xl leading-tight font-semibold",
										children: b.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold " + (heat === "high" ? "bg-lime text-bg" : heat === "mid" ? "bg-amber text-bg" : "bg-surface text-muted"),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, {
											className: "size-3.5",
											"aria-hidden": true
										}), HEAT_LABEL[heat]]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex items-end justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted",
											children: [
												b.sectorLabel,
												" · ",
												b.sub,
												b.zone ? ` · ${b.zone}` : ""
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-1 block text-rose",
											children: gapLine(b, offers, pref)
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "shrink-0 text-right",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-xs text-muted",
											children: "hasta"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-display text-2xl font-extrabold text-lime",
											children: euro(sum.b)
										})]
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setOpenId(open ? null : b.id),
									className: "flex min-w-0 flex-1 flex-wrap gap-1 text-left",
									children: [
										shown.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-surface px-2 py-1 text-xs text-muted",
											children: c
										}, c)),
										rest > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "rounded-full bg-surface px-2 py-1 text-xs text-muted",
											children: ["+", rest]
										}) : null,
										b.chain ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-surface px-2 py-1 text-xs text-amber",
											children: "Cadena"
										}) : null,
										b.pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-surface px-2 py-1 text-xs text-rose",
											children: "Pendiente"
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-surface px-2 py-1 text-xs text-muted",
											children: originOf(b) === "osm" ? "Mapa" : originOf(b) === "archivo" ? "Archivo" : "Informe"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-2 text-sm text-muted",
									children: [sum.m > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"+",
										sum.m,
										" €/mes"
									] }) : null, call ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: call,
										"aria-label": `Llamar a ${b.name}`,
										className: "flex size-11 items-center justify-center rounded-full border border-lime text-lime",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" })
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setOpenId(open ? null : b.id),
										"aria-label": open ? "Cerrar ficha" : "Abrir ficha",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
											className: "size-4 " + (open ? "rotate-180" : ""),
											"aria-hidden": true
										})
									})]
								})]
							})]
						}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-line px-4 pt-3 pb-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: b.address || "Dirección no consignada"
								}),
								b.rating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-sm text-muted",
									children: [
										"Google ",
										String(b.rating).replace(".", ","),
										" · ",
										b.reviews.toLocaleString("es-ES"),
										" reseñas · presencia ",
										b.presence || "sin dato"
									]
								}) : null,
								!b.mapsOk && !b.imported && originOf(b) === "informe" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-rose",
									children: "La ficha de Maps no se reconfirmó en la consulta nueva."
								}) : null,
								b.why ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-ink",
										children: "Nota: "
									}), b.why]
								}) : null,
								b.sources.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm",
									children: b.sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: s.url,
										target: "_blank",
										rel: "noreferrer",
										className: "text-lime underline-offset-2",
										children: s.label
									}) }, s.url))
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "mt-3 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted",
										children: "Teléfono"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: b.phone,
										onChange: (e) => setContact(b.id, "phone", e.target.value),
										inputMode: "tel",
										autoComplete: "off",
										placeholder: "Añadir teléfono",
										className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
									})]
								}),
								b.phoneAlt || patches[b.id]?.phoneAlt !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "mt-2 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted",
										children: "Otro teléfono"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: b.phoneAlt,
										onChange: (e) => setContact(b.id, "phoneAlt", e.target.value),
										inputMode: "tel",
										autoComplete: "off",
										className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
									})]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "mt-2 block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted",
										children: "Correo"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: b.email,
										onChange: (e) => setContact(b.id, "email", e.target.value),
										type: "email",
										autoComplete: "off",
										placeholder: "Añadir correo",
										className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex flex-wrap gap-2",
									children: [
										call ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: call,
											className: "flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-surface px-4 font-semibold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
												className: "size-4",
												"aria-hidden": true
											}), " Llamar"]
										}) : null,
										callAlt && callAlt !== call ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: callAlt,
											className: "flex min-h-11 items-center justify-center rounded-2xl border border-line px-4",
											children: "Otro tel."
										}) : null,
										b.email.includes("@") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: `mailto:${b.email}`,
											className: "flex min-h-11 items-center justify-center rounded-2xl border border-line px-4",
											children: "Email"
										}) : null,
										b.web ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: b.web,
											target: "_blank",
											rel: "noreferrer",
											className: "flex min-h-11 items-center justify-center rounded-2xl border border-line px-4",
											children: "Ver web"
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void refreshBiz(b),
											disabled: refreshingId === b.id,
											className: "min-h-11 rounded-2xl bg-lime px-4 font-semibold text-bg disabled:opacity-60",
											children: refreshingId === b.id ? "Buscando…" : "Repetir búsqueda"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 flex flex-col gap-2",
									children: offers.map((o) => {
										const on = offerOn(o, pref);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-start gap-3 rounded-2xl bg-surface p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "checkbox",
													className: "mt-1 size-4 accent-lime",
													checked: on,
													onChange: () => toggleOffer(b, o.id, o.evidenced)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "min-w-0 flex-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block font-semibold",
														children: o.title
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block text-sm text-muted",
														children: o.detail
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "shrink-0 text-right text-sm font-semibold whitespace-nowrap text-lime",
													children: moneyLine(o)
												})
											]
										}) }, o.id);
									})
								})
							]
						}) : null]
					}, b.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-xs text-muted",
				children: "Investigación privada de hostelería en Getafe, 6 de noviembre de 2026. 145 filas, no es un censo. Contactos públicos, sin llamada. Las tarifas son las del catálogo AsExIA y solo suman lo que dejas marcado."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setBriefOpen(true),
				className: "mt-3 min-h-11 text-sm font-semibold text-lime",
				children: "Investigar otro sector o municipio"
			}),
			cityOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
				open: true,
				className: "fixed inset-0 z-20 m-0 flex h-full w-full items-end justify-center bg-bg/80 p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-h-[80vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-xl font-semibold",
							children: "Población"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3",
							children: TOWNS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setCity(t.id);
									setSector((current) => current === "todos" ? "hosteleria" : current);
									setSub("");
									setOpenId(null);
									setCityOpen(false);
								},
								className: "flex min-h-11 w-full items-center justify-between border-b border-line text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted",
									children: t.ready ? "Informe + mapa" : "Búsqueda en el mapa"
								})]
							}) }, t.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCityOpen(false),
							className: "mt-3 min-h-11 w-full rounded-xl border border-line",
							children: "Cerrar"
						})
					]
				})
			}) : null,
			briefOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
				open: true,
				className: "fixed inset-0 z-20 m-0 flex h-full w-full items-end justify-center bg-bg/80 p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "font-display text-xl font-semibold",
							children: [
								"Investigar ",
								sector === "todos" ? "negocios" : sectorMeta.label.toLowerCase(),
								" en ",
								town.name
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "La app ya busca en OpenStreetMap al elegir municipio y sector. Si tienes una lista propia, pégala o sube un Excel / CSV. No hace falta que traiga todas las columnas."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							readOnly: true,
							value: researchBrief(sector === "todos" ? "negocios" : sectorMeta.label, town.name),
							className: "mt-3 h-40 w-full rounded-xl border border-line bg-surface p-3 text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: copyBrief,
							className: "mt-2 min-h-11 rounded-xl bg-lime px-4 font-semibold text-bg",
							children: "Copiar encargo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-4 font-semibold",
							children: "Importar CSV o Excel"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => fileRef.current?.click(),
							className: "mt-2 min-h-11 rounded-xl border border-line px-4",
							children: "Elegir archivo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: paste,
							onChange: (e) => setPaste(e.target.value),
							placeholder: "nombre;sector;subtipo;direccion;telefono;email;web;zona;lat;lng;reservas;pedidos;fuente_url",
							className: "mt-2 h-28 w-full rounded-xl border border-line bg-surface p-3 text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onImport,
								className: "min-h-11 flex-1 rounded-xl bg-lime font-semibold text-bg",
								children: "Importar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setBriefOpen(false),
								className: "min-h-11 flex-1 rounded-xl border border-line",
								children: "Cerrar"
							})]
						})
					]
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "status",
				className: "fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg " + (toast ? "opacity-100" : "pointer-events-none opacity-0"),
				children: toast
			})
		]
	});
}
function Legend({ heat, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 rounded-full bg-bg/90 px-2 py-1 text-xs text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full " + (heat === "high" ? "bg-lime" : heat === "mid" ? "bg-amber" : "bg-slate") }), label]
	});
}
function SubChip({ active, label, count, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "shrink-0 rounded-full border px-3 py-2 text-sm " + (active ? "border-lime bg-surface text-ink" : "border-line text-muted"),
		children: [
			label,
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: count
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadarScreen, {});
}
//#endregion
export { Home as component };
