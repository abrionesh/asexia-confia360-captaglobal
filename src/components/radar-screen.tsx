import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  CarFront,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Flame,
  GraduationCap,
  Hotel,
  KeyRound,
  LayoutGrid,
  MapPin,
  PawPrint,
  Phone,
  Plane,
  Ruler,
  Scale,
  School,
  Scissors,
  Sparkles,
  Stethoscope,
  Upload,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RadarMap } from "@/components/radar-map";
import {
  CATALOG,
  SECTORS,
  TOWNS,
  buildOffers,
  channels,
  emptyPref,
  euro,
  gapLine,
  heatOf,
  moneyLine,
  nameKey,
  offerOn,
  originOf,
  parseImport,
  researchBrief,
  sectorById,
  telHref,
  totals,
  townById,
  type Biz,
  type Heat,
  type Pref,
  type Sector,
} from "@/data/model";
import { searchBusiness, searchNamed, searchSector } from "@/data/search";
import { townGeo } from "@/data/places";

const KEY = "asexia-radar-municipio-v1";
const FOUND_KEY = "asexia-radar-busqueda-v2";

type Found = Record<string, { at: number; rows: Biz[]; note: string }>;
type ContactPatch = { phone?: string; email?: string; phoneAlt?: string; web?: string; address?: string };

const ICONS: Record<string, LucideIcon> = {
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
  agencia: Plane,
};

const TICKET: Record<string, string> = {
  low: "Low ticket",
  medium: "Medium ticket",
  high: "High ticket",
};

const HEAT_LABEL: Record<Heat, string> = { high: "Alta", mid: "Media", low: "Baja" };

function ticketClass(ticket: Sector["ticket"], active: boolean) {
  if (!ticket) return "";
  if (ticket === "high") return active ? "bg-lime text-bg" : "text-lime";
  if (ticket === "medium") return active ? "bg-amber text-bg" : "text-amber";
  return "text-muted";
}

export function RadarScreen() {
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const foundRef = useRef<Found>({});
  const force = useRef(false);
  const [city, setCity] = useState("getafe");
  const [sector, setSector] = useState("hosteleria");
  const [sub, setSub] = useState("");
  const [q, setQ] = useState("");
  const [phoneOnly, setPhoneOnly] = useState(true);
  const [sort, setSort] = useState<"money" | "reviews" | "name">("money");
  const [openId, setOpenId] = useState<number | null>(null);
  const [extras, setExtras] = useState<Record<number, Pref>>({});
  const [imported, setImported] = useState<Biz[]>([]);
  const [found, setFound] = useState<Found>({});
  const [patches, setPatches] = useState<Record<number, ContactPatch>>({});
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [tick, setTick] = useState(0);
  const [cityOpen, setCityOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [toast, setToast] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [webHits, setWebHits] = useState<{ title: string; url: string }[]>([]);
  const [webNote, setWebNote] = useState("");
  foundRef.current = found;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw) as {
          imported?: Biz[];
          extras?: Record<number, Pref>;
          city?: string;
          patches?: Record<number, ContactPatch>;
        };
        if (Array.isArray(data.imported)) setImported(data.imported);
        if (data.extras) setExtras(data.extras);
        if (data.patches) setPatches(data.patches);
        if (data.city && TOWNS.some((t) => t.id === data.city)) setCity(data.city);
      }
      const saved = localStorage.getItem(FOUND_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Found;
        if (parsed && typeof parsed === "object") setFound(parsed);
      }
    } catch {
      /* ignore broken local copy */
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted) return;
    localStorage.setItem(KEY, JSON.stringify({ imported, extras, city, patches }));
  }, [imported, extras, city, patches, booted]);

  useEffect(() => {
    if (!booted) return;
    try {
      localStorage.setItem(FOUND_KEY, JSON.stringify(found));
    } catch {
      /* quota */
    }
  }, [found, booted]);

  useEffect(() => {
    if (!booted || sector === "todos") return;
    const key = `${city}:${sector}`;
    const bypass = force.current;
    force.current = false;
    const cached = foundRef.current[key];
    if (!bypass && cached) {
      setSearchError("");
      return;
    }
    let dead = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError("");
      void searchSector({ data: { cityId: city, sectorId: sector, force: bypass } })
        .then((res) => {
          if (dead) return;
          if (!res.ok) {
            setSearchError(res.error);
            return;
          }
          setFound((prev) => ({ ...prev, [key]: { at: res.at, rows: res.rows, note: res.note } }));
        })
        .catch(() => {
          if (!dead) setSearchError("No se ha podido buscar. Puedes importar un Excel.");
        })
        .finally(() => {
          if (!dead) setSearching(false);
        });
    }, 350);
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [booted, city, sector, tick]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const town = townById(city);
  const sectorMeta = sectorById(sector);

  const pool = useMemo(() => {
    const base = city === "getafe" ? CATALOG : [];
    const known = new Set(base.map((b) => nameKey(b.name)));
    const fromFile = imported.filter((b) => b.city === city && !known.has(nameKey(b.name)));
    for (const b of fromFile) known.add(nameKey(b.name));
    const fromMap = Object.entries(found)
      .filter(([k]) => k.startsWith(`${city}:`))
      .flatMap(([, pack]) => pack.rows)
      .filter((b) => b.city === city && !known.has(nameKey(b.name)));
    return [...base, ...fromFile, ...fromMap];
  }, [city, imported, found]);

  const patched = useMemo(
    () =>
      pool.map((b) => {
        const p = patches[b.id];
        if (!p) return b;
        return {
          ...b,
          phone: p.phone ?? b.phone,
          email: p.email ?? b.email,
          phoneAlt: p.phoneAlt ?? b.phoneAlt,
          web: p.web ?? b.web,
          address: p.address ?? b.address,
          hasPage: p.web ? true : b.hasPage,
        };
      }),
    [pool, patches],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: pool.length };
    for (const s of SECTORS) if (s.id !== "todos") map[s.id] = 0;
    for (const b of pool) map[b.sectorId] = (map[b.sectorId] ?? 0) + 1;
    return map;
  }, [pool]);

  const subs = useMemo(() => {
    const src = pool.filter((b) => sector === "todos" || b.sectorId === sector);
    const map = new Map<string, number>();
    for (const b of src) map.set(b.sub, (map.get(b.sub) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [pool, sector]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = patched.filter((b) => {
      if (sector !== "todos" && b.sectorId !== sector) return false;
      if (sub && b.sub !== sub) return false;
      if (phoneOnly && !(b.phone || "").trim() && !(b.phoneAlt || "").trim()) return false;
      if (!query) return true;
      return `${b.name} ${b.zone} ${b.sub} ${b.address} ${b.email}`.toLowerCase().includes(query);
    });
    const prefOf = (b: Biz) => extras[b.id] ?? emptyPref();
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "reviews") return (b.reviews || 0) - (a.reviews || 0);
      const ma = totals(buildOffers(a), prefOf(a)).b;
      const mb = totals(buildOffers(b), prefOf(b)).b;
      return mb - ma || (b.reviews || 0) - (a.reviews || 0);
    });
    return list;
  }, [patched, sector, sub, phoneOnly, q, sort, extras]);

  const points = useMemo(
    () =>
      visible.map((biz) => ({
        biz,
        heat: heatOf(totals(buildOffers(biz), extras[biz.id] ?? emptyPref()).b),
      })),
    [visible, extras],
  );

  const withPhone = patched.filter((b) => (b.phone || "").trim() || (b.phoneAlt || "").trim()).length;
  const searchPack = sector === "todos" ? undefined : found[`${city}:${sector}`];
  const hiddenPhones = patched.filter((b) => {
    if (sector !== "todos" && b.sectorId !== sector) return false;
    return !(b.phone || "").trim() && !(b.phoneAlt || "").trim();
  }).length;

  function scrollSectors(dir: number) {
    scroller.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  function setContact(id: number, field: "phone" | "email" | "phoneAlt", value: string) {
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value.slice(0, 120) } }));
  }

  async function refreshBiz(b: Biz) {
    setRefreshingId(b.id);
    try {
      const res = await searchBusiness({ data: { cityId: b.city || city, name: b.name } });
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      setPatches((prev) => {
        const cur = prev[b.id] ?? {};
        const next = { ...cur };
        if (res.phone) next.phone = res.phone;
        if (res.email) next.email = res.email;
        if (res.web) next.web = res.web;
        if (res.address) next.address = res.address;
        return { ...prev, [b.id]: next };
      });
      const bits = [res.phone && "teléfono", res.email && "correo", res.web && "web"].filter(Boolean);
      setToast(bits.length ? `Actualizado: ${bits.join(", ")}` : "Sigue sin teléfono ni correo en el mapa");
    } catch {
      setToast("No se ha podido repetir la búsqueda");
    } finally {
      setRefreshingId(null);
    }
  }

  function inRecords(query: string) {
    const want = nameKey(query);
    if (want.length < 2) return [];
    return pool.filter((b) => {
      const got = nameKey(b.name);
      return got === want || (want.length >= 4 && got.includes(want));
    });
  }

  async function lookupName() {
    const query = q.trim();
    if (query.length < 2) {
      setToast("Escribe el nombre");
      return;
    }
    setWebHits([]);
    setWebNote("");
    const local = inRecords(query);
    if (local.length) {
      const want = nameKey(query);
      const exact = local.filter((b) => nameKey(b.name) === want);
      const pickFrom = exact.length ? exact : local;
      const first = pickFrom.find((b) => sector === "todos" || b.sectorId === sector) ?? pickFrom[0];
      setSub("");
      if (first.sectorId !== sector) setSector(first.sectorId);
      if (!(first.phone || first.phoneAlt)) setPhoneOnly(false);
      setOpenId(first.id);
      setToast(exact.length ? "Está en tus registros" : `${local.length} coincidencias en tus registros`);
      return;
    }
    setNameBusy(true);
    try {
      const res = await searchNamed({ data: { cityId: city, name: query, sectorId: sector } });
      if (res.biz) {
        const biz = res.biz;
        const key = `${city}:nombre`;
        setFound((prev) => {
          const cur = prev[key]?.rows ?? [];
          const rows = [biz, ...cur.filter((row) => nameKey(row.name) !== nameKey(biz.name) && row.id !== biz.id)];
          return { ...prev, [key]: { at: Date.now(), rows, note: "Búsqueda por nombre" } };
        });
        setSub("");
        setSector(biz.sectorId);
        if (!biz.phone && !biz.phoneAlt) setPhoneOnly(false);
        setQ(biz.name);
        setOpenId(biz.id);
        const fromWeb = biz.origin === "web";
        setToast(fromWeb ? "Ficha incorporada desde la web" : "Ficha incorporada desde el mapa");
        setWebHits(fromWeb ? biz.sources.filter((s) => s.url).map((s) => ({ title: s.label, url: s.url })) : []);
        setWebNote(fromWeb ? biz.why : "");
      } else {
        setWebHits(res.web);
        setWebNote("No está en tus registros, ni en el mapa, ni en las páginas que he podido leer. Abre la búsqueda. Puede existir igualmente.");
      }
    } catch {
      setToast("No se ha podido buscar");
    } finally {
      setNameBusy(false);
    }
  }

  function toggleOffer(b: Biz, id: string, evidenced: boolean) {
    setExtras((prev) => {
      const p = prev[b.id] ?? emptyPref();
      const next: Pref = { on: [...p.on], off: [...p.off] };
      if (evidenced) {
        next.off = next.off.includes(id) ? next.off.filter((x) => x !== id) : [...next.off, id];
      } else {
        next.on = next.on.includes(id) ? next.on.filter((x) => x !== id) : [...next.on, id];
      }
      return { ...prev, [b.id]: next };
    });
  }

  function pick(id: number) {
    setOpenId(id);
    window.setTimeout(() => {
      document.getElementById(`biz-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    const header = [
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
      "lng",
    ];
    const lines = visible.map((b) => {
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
        b.lng ?? "",
      ];
    });
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `radar-asexia-${city}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function absorb(rows: Biz[], skipped: number) {
    if (!rows.length) {
      setToast(skipped ? "Ninguna fila con nombre" : "El archivo no trae fichas");
      return;
    }
    const knownNames = new Set(pool.map((b) => nameKey(b.name)));
    const fresh = rows.filter((r) => !knownNames.has(nameKey(r.name)));
    setImported((prev) => {
      let nextId = 200000 + prev.length;
      return [...prev, ...fresh.map((r) => ({ ...r, id: ++nextId }))];
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

  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const lower = file.name.toLowerCase();
      let text = "";
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const book = XLSX.read(buf, { type: "array" });
        const sheet = book.Sheets[book.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
      } else {
        const utf = new TextDecoder("utf-8").decode(buf);
        text = utf.includes("\uFFFD") ? new TextDecoder("iso-8859-1").decode(buf) : utf;
      }
      const { rows, skipped } = parseImport(text, city);
      absorb(rows, skipped);
    } catch {
      setToast("No se ha podido leer el archivo");
    }
  }

  const showResearch = visible.length === 0 && !q;

  return (
    <main className="safe-pad mx-auto min-h-screen max-w-lg px-4 pb-16 pt-4">
      <p className="text-xs font-semibold tracking-widest text-lime uppercase">Radar · AsExIA</p>
      <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight">
        ¿A quién le preparas una propuesta?
      </h1>

      <section className="relative mt-4 overflow-hidden rounded-3xl border border-line">
        <RadarMap
          points={points}
          activeId={openId}
          onPick={pick}
          homeLat={townGeo(city).lat}
          homeLng={townGeo(city).lon}
          frame={`${city}:${sector}:${points.length}`}
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
          <Legend heat="high" label="+3.500 €" />
          <Legend heat="mid" label="1.500 – 3.500 €" />
          <Legend heat="low" label="menos" />
        </div>
      </section>
      <p className="mt-2 text-xs text-muted">
        {searching
          ? `Buscando ${sectorMeta.label.toLowerCase()} en ${town.name}…`
          : searchError
            ? searchError
            : (searchPack?.note ??
              "El informe del 6 nov 2026 sigue en Getafe hostelería. El resto lo busca OpenStreetMap: no inventa teléfonos.")}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCityOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-lime bg-card px-4 text-sm font-semibold text-lime"
        >
          <MapPin className="size-4" aria-hidden />
          {town.name}
          <span className="font-normal text-muted">· cambiar</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (sector === "todos") {
              setSector("hosteleria");
              return;
            }
            force.current = true;
            setTick((n) => n + 1);
          }}
          className="min-h-11 shrink-0 text-sm font-semibold text-lime"
        >
          {searching ? "Buscando…" : "Buscar de nuevo"}
        </button>
      </div>
      <div className="mt-2 text-right text-sm text-muted">
        <span className="text-ink">{visible.length} en pantalla</span>
        <span>
          {" "}
          · {pool.length} fichas · {withPhone} con teléfono
        </span>
        {phoneOnly && hiddenPhones > 0 ? (
          <button type="button" onClick={() => setPhoneOnly(false)} className="mt-1 block text-xs font-semibold text-lime">
            Ver {hiddenPhones} sin teléfono
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Sectores anteriores"
          onClick={() => scrollSectors(-1)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-lime bg-bg text-lime"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div ref={scroller} className="scroll-x min-w-0 flex-1 py-1">
          <div className="grid grid-flow-col grid-rows-2 gap-2" style={{ gridAutoColumns: "7.5rem" }}>
          {SECTORS.map((s) => {
            const Icon = ICONS[s.id] ?? LayoutGrid;
            const active = sector === s.id;
            const n = counts[s.id] ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSector(s.id);
                  setSub("");
                  setOpenId(null);
                }}
                className={
                  "flex h-full min-h-32 flex-col rounded-2xl border p-3 text-left " +
                  (active ? "border-lime bg-surface" : "border-line bg-card")
                }
              >
                <Icon className={active ? "size-6 text-lime" : "size-6 text-muted"} aria-hidden />
                <span className="mt-2 block truncate text-sm font-semibold">{s.label}</span>
                <span className="font-display text-2xl leading-none">{n}</span>
                {s.ticket ? (
                  <span
                    className={
                      "mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs font-semibold " +
                      ticketClass(s.ticket, active)
                    }
                  >
                    {TICKET[s.ticket]}
                  </span>
                ) : (
                  <span className="mt-2 block text-xs text-muted">Catálogo</span>
                )}
                {!s.investigated && n === 0 ? (
                  <span className="mt-1 block text-xs text-muted">{searching && sector === s.id ? "Buscando" : "Sin buscar"}</span>
                ) : null}
              </button>
            );
          })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Sectores siguientes"
          onClick={() => scrollSectors(1)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-lime bg-bg text-lime"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {subs.length > 1 ? (
        <div className="scroll-x mt-3 flex gap-2">
          <SubChip active={!sub} label="Subsector" count={subs.reduce((a, [, n]) => a + n, 0)} onClick={() => setSub("")} />
          {subs.map(([name, n]) => (
            <SubChip key={name} active={sub === name} label={name} count={n} onClick={() => setSub(name)} />
          ))}
        </div>
      ) : null}

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookupName();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Buscar negocio</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setWebHits([]);
              setWebNote("");
            }}
            placeholder="Nombre del negocio"
            className="min-h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={nameBusy || q.trim().length < 2}
          className="min-h-11 shrink-0 rounded-xl bg-lime px-4 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {nameBusy ? "Buscando…" : "Buscar"}
        </button>
        <label className="min-h-11">
          <span className="sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="min-h-11 rounded-xl border border-line bg-card px-3 text-sm"
          >
            <option value="money">Más dinero primero</option>
            <option value="reviews">Más reseñas</option>
            <option value="name">Nombre</option>
          </select>
        </label>
      </form>

      {webNote ? (
        <section className="mt-3 rounded-2xl border border-line bg-card p-3">
          <h2 className="text-sm font-semibold">{webNote}</h2>
          <ul className="mt-2 space-y-2">
            {webHits.map((hit) => (
              <li key={hit.url}>
                <a href={hit.url} target="_blank" rel="noopener noreferrer" className="text-sm text-lime underline-offset-2 hover:underline">
                  {hit.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPhoneOnly((v) => !v)}
          className="inline-flex min-h-11 items-center gap-2 text-sm"
          aria-pressed={phoneOnly}
        >
          <span className={"relative h-6 w-11 rounded-full " + (phoneOnly ? "bg-lime" : "bg-line")}>
            <span
              className={
                "absolute top-0.5 size-5 rounded-full bg-bg transition-transform " +
                (phoneOnly ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </span>
          Solo con teléfono
        </button>
        <button type="button" onClick={downloadCsv} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted">
          <Download className="size-4" aria-hidden />
          CSV
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-lime"
        >
          <Upload className="size-4" aria-hidden />
          Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </div>

      {showResearch ? (
        <section className="mt-4 rounded-3xl border border-dashed border-line bg-card p-4">
          <h2 className="font-display text-xl font-semibold">
            {searching ? "Buscando en el mapa" : `Sin fichas de ${sectorMeta.label.toLowerCase()} en ${town.name}`}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {phoneOnly && hiddenPhones > 0
              ? "Hay fichas sin teléfono. Quita el filtro para verlas, o importa un Excel con los contactos que ya tengas."
              : "OpenStreetMap no ha devuelto esta lista. No significa que no existan. Puedes repetir la búsqueda o importar CSV / Excel."}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                force.current = true;
                setTick((n) => n + 1);
              }}
              className="min-h-11 rounded-xl bg-lime px-4 font-semibold text-bg"
            >
              Buscar otra vez
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl border border-line px-4">
              Importar
            </button>
          </div>
        </section>
      ) : (
        <p className="mt-3 text-sm text-muted">{visible.length} fichas en pantalla</p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {visible.map((b) => {
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
          return (
            <article
              key={b.id}
              id={`biz-${b.id}`}
              className={"rounded-3xl border bg-card " + (open ? "border-lime" : "border-line")}
            >
              <div className="p-4">
                <button type="button" onClick={() => setOpenId(open ? null : b.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl leading-tight font-semibold">{b.name}</h2>
                    <span
                      className={
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold " +
                        (heat === "high" ? "bg-lime text-bg" : heat === "mid" ? "bg-amber text-bg" : "bg-surface text-muted")
                      }
                    >
                      <Flame className="size-3.5" aria-hidden />
                      {HEAT_LABEL[heat]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-sm">
                      <span className="text-muted">
                        {b.sectorLabel} · {b.sub}
                        {b.zone ? ` · ${b.zone}` : ""}
                      </span>
                      <span className="mt-1 block text-rose">{gapLine(b, offers, pref)}</span>
                    </p>
                    <p className="shrink-0 text-right">
                      <span className="block text-xs text-muted">hasta</span>
                      <span className="font-display text-2xl font-extrabold text-lime">{euro(sum.b)}</span>
                    </p>
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setOpenId(open ? null : b.id)} className="flex min-w-0 flex-1 flex-wrap gap-1 text-left">
                    {shown.map((c) => (
                      <span key={c} className="rounded-full bg-surface px-2 py-1 text-xs text-muted">
                        {c}
                      </span>
                    ))}
                    {rest > 0 ? <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted">+{rest}</span> : null}
                    {b.chain ? <span className="rounded-full bg-surface px-2 py-1 text-xs text-amber">Cadena</span> : null}
                    {b.pending ? <span className="rounded-full bg-surface px-2 py-1 text-xs text-rose">Pendiente</span> : null}
                    <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted">
                      {originOf(b) === "osm" ? "Mapa" : originOf(b) === "archivo" ? "Archivo" : originOf(b) === "web" ? "Web" : "Informe"}
                    </span>
                  </button>
                  <span className="inline-flex items-center gap-2 text-sm text-muted">
                    {sum.m > 0 ? <span>+{sum.m} €/mes</span> : null}
                    {call ? (
                      <a
                        href={call}
                        aria-label={`Llamar a ${b.name}`}
                        className="flex size-11 items-center justify-center rounded-full border border-lime text-lime"
                      >
                        <Phone className="size-4" />
                      </a>
                    ) : (
                      <button type="button" onClick={() => setOpenId(open ? null : b.id)} aria-label={open ? "Cerrar ficha" : "Abrir ficha"}>
                        <ChevronDown className={"size-4 " + (open ? "rotate-180" : "")} aria-hidden />
                      </button>
                    )}
                  </span>
                </div>
              </div>

              {open ? (
                <div className="border-t border-line px-4 pt-3 pb-4">
                  <p className="text-sm text-muted">{b.address || "Dirección no consignada"}</p>
                  {b.rating ? (
                    <p className="mt-1 text-sm text-muted">
                      {b.presence || "Nota"} {String(b.rating).replace(".", ",")} · {b.reviews.toLocaleString("es-ES")} reseñas
                    </p>
                  ) : null}
                  {!b.mapsOk && !b.imported && originOf(b) === "informe" ? (
                    <p className="mt-2 text-sm text-rose">La ficha de Maps no se reconfirmó en la consulta nueva.</p>
                  ) : null}
                  {b.why ? (
                    <p className="mt-2 text-sm text-muted">
                      <span className="text-ink">Nota: </span>
                      {b.why}
                    </p>
                  ) : null}

                  <label className="mt-3 block">
                    <span className="text-xs text-muted">Teléfono</span>
                    <input
                      value={b.phone}
                      onChange={(e) => setContact(b.id, "phone", e.target.value)}
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="Añadir teléfono"
                      className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
                    />
                  </label>
                  {b.phoneAlt || patches[b.id]?.phoneAlt !== undefined ? (
                    <label className="mt-2 block">
                      <span className="text-xs text-muted">Otro teléfono</span>
                      <input
                        value={b.phoneAlt}
                        onChange={(e) => setContact(b.id, "phoneAlt", e.target.value)}
                        inputMode="tel"
                        autoComplete="off"
                        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
                      />
                    </label>
                  ) : null}
                  <label className="mt-2 block">
                    <span className="text-xs text-muted">Correo</span>
                    <input
                      value={b.email}
                      onChange={(e) => setContact(b.id, "email", e.target.value)}
                      type="email"
                      autoComplete="off"
                      placeholder="Añadir correo"
                      className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {call ? (
                      <a href={call} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-surface px-4 font-semibold">
                        <Phone className="size-4" aria-hidden /> Llamar
                      </a>
                    ) : null}
                    {callAlt && callAlt !== call ? (
                      <a href={callAlt} className="flex min-h-11 items-center justify-center rounded-2xl border border-line px-4">
                        Otro tel.
                      </a>
                    ) : null}
                    {b.email.includes("@") ? (
                      <a href={`mailto:${b.email}`} className="flex min-h-11 items-center justify-center rounded-2xl border border-line px-4">
                        Email
                      </a>
                    ) : null}
                    {b.web ? (
                      <a href={b.web} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-2xl border border-line px-4">
                        Ver web
                      </a>
                    ) : null}
                    {b.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center justify-center rounded-2xl border border-line px-4"
                      >
                        {s.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      onClick={() => void refreshBiz(b)}
                      disabled={refreshingId === b.id}
                      className="min-h-11 rounded-2xl bg-lime px-4 font-semibold text-bg disabled:opacity-60"
                    >
                      {refreshingId === b.id ? "Buscando…" : "Repetir búsqueda"}
                    </button>
                  </div>

                  <ul className="mt-3 flex flex-col gap-2">
                    {offers.map((o) => {
                      const on = offerOn(o, pref);
                      return (
                        <li key={o.id}>
                          <label className="flex items-start gap-3 rounded-2xl bg-surface p-3">
                            <input
                              type="checkbox"
                              className="mt-1 size-4 accent-lime"
                              checked={on}
                              onChange={() => toggleOffer(b, o.id, o.evidenced)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">{o.title}</span>
                              <span className="block text-sm text-muted">{o.detail}</span>
                            </span>
                            <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-lime">{moneyLine(o)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted">
        Investigación privada de hostelería en Getafe, 6 de noviembre de 2026. 145 filas, no es un censo. Contactos
        públicos, sin llamada. Las tarifas son las del catálogo AsExIA y solo suman lo que dejas marcado.
      </p>
      <button type="button" onClick={() => setBriefOpen(true)} className="mt-3 min-h-11 text-sm font-semibold text-lime">
        Investigar otro sector o municipio
      </button>

      {cityOpen ? (
        <dialog open className="fixed inset-0 z-20 m-0 flex h-full w-full items-end justify-center bg-bg/80 p-0">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card p-4">
            <h2 className="font-display text-xl font-semibold">Población</h2>
            <ul className="mt-3">
              {TOWNS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCity(t.id);
                      setSector((current) => (current === "todos" ? "hosteleria" : current));
                      setSub("");
                      setOpenId(null);
                      setCityOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between border-b border-line text-left"
                  >
                    <span>{t.name}</span>
                    <span className="text-xs text-muted">{t.ready ? "Informe + mapa" : "Búsqueda en el mapa"}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setCityOpen(false)} className="mt-3 min-h-11 w-full rounded-xl border border-line">
              Cerrar
            </button>
          </div>
        </dialog>
      ) : null}

      {briefOpen ? (
        <dialog open className="fixed inset-0 z-20 m-0 flex h-full w-full items-end justify-center bg-bg/80 p-0">
          <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card p-4">
            <h2 className="font-display text-xl font-semibold">
              Investigar {sector === "todos" ? "negocios" : sectorMeta.label.toLowerCase()} en {town.name}
            </h2>
            <p className="mt-2 text-sm text-muted">
              La app ya busca en OpenStreetMap al elegir municipio y sector. Si tienes una lista propia, pégala o sube
              un Excel / CSV. No hace falta que traiga todas las columnas.
            </p>
            <textarea
              readOnly
              value={researchBrief(sector === "todos" ? "negocios" : sectorMeta.label, town.name)}
              className="mt-3 h-40 w-full rounded-xl border border-line bg-surface p-3 text-sm"
            />
            <button type="button" onClick={copyBrief} className="mt-2 min-h-11 rounded-xl bg-lime px-4 font-semibold text-bg">
              Copiar encargo
            </button>
            <h3 className="mt-4 font-semibold">Importar CSV o Excel</h3>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 min-h-11 rounded-xl border border-line px-4">
              Elegir archivo
            </button>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="nombre;sector;subtipo;direccion;telefono;email;web;zona;lat;lng;reservas;pedidos;fuente_url"
              className="mt-2 h-28 w-full rounded-xl border border-line bg-surface p-3 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onImport} className="min-h-11 flex-1 rounded-xl bg-lime font-semibold text-bg">
                Importar
              </button>
              <button type="button" onClick={() => setBriefOpen(false)} className="min-h-11 flex-1 rounded-xl border border-line">
                Cerrar
              </button>
            </div>
          </div>
        </dialog>
      ) : null}

      <p
        role="status"
        className={
          "fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg " +
          (toast ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        {toast}
      </p>
    </main>
  );
}

function Legend({ heat, label }: { heat: Heat; label: string }) {
  const dot = heat === "high" ? "bg-lime" : heat === "mid" ? "bg-amber" : "bg-slate";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg/90 px-2 py-1 text-xs text-ink">
      <span className={"size-2 rounded-full " + dot} />
      {label}
    </span>
  );
}

function SubChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-3 py-2 text-sm " +
        (active ? "border-lime bg-surface text-ink" : "border-line text-muted")
      }
    >
      {label} <span className="text-muted">{count}</span>
    </button>
  );
}
