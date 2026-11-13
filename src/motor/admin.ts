export const DEFAULT_STAGES = [
  { id: "sin-contactar", label: "Sin contactar" },
  { id: "contactado", label: "Contactado" },
  { id: "visitado", label: "Visitado" },
  { id: "propuesta", label: "Propuesta" },
  { id: "cliente", label: "Cliente" },
  { id: "no-ahora", label: "No ahora" },
  { id: "perdido", label: "Perdido" },
] as const;

export type StageId = (typeof DEFAULT_STAGES)[number]["id"];

export type StageConf = { id: StageId; label: string };

export type MotorAdmin = {
  stages: StageConf[];
  commercials: string[];
};

const KEY = "asexia-motor-admin-v1";

function defaults(): MotorAdmin {
  return { stages: DEFAULT_STAGES.map((stage) => ({ ...stage })), commercials: [] };
}

export function loadAdmin(): MotorAdmin {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Partial<MotorAdmin>;
    const saved = Array.isArray(data.stages) ? data.stages : [];
    const stages = base.stages.map((stage) => {
      const found = saved.find((item) => item && item.id === stage.id);
      const label = found?.label?.trim().slice(0, 40);
      return { id: stage.id, label: label || stage.label };
    });
    const order = saved.map((item) => item?.id).filter((id): id is StageId => base.stages.some((stage) => stage.id === id));
    const ordered = [
      ...order.map((id) => stages.find((stage) => stage.id === id)!),
      ...stages.filter((stage) => !order.includes(stage.id)),
    ];
    const commercials = Array.isArray(data.commercials)
      ? [...new Set(data.commercials.map((name) => String(name).trim()).filter(Boolean))].slice(0, 30)
      : [];
    return { stages: ordered, commercials };
  } catch {
    return base;
  }
}

export function saveAdmin(admin: MotorAdmin) {
  try {
    localStorage.setItem(KEY, JSON.stringify(admin));
  } catch {
    /* quota */
  }
}

export function stageName(id: string, admin = loadAdmin()) {
  return admin.stages.find((stage) => stage.id === id)?.label ?? id;
}
