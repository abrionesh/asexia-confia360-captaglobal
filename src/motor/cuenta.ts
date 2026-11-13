export const MODULOS = [
  { id: "radar", label: "Radar" },
  { id: "crm", label: "CRM" },
  { id: "fichajes", label: "Fichajes y turnos" },
  { id: "web", label: "Web del negocio" },
] as const;

export type ModuloId = (typeof MODULOS)[number]["id"];
export type ModuloEstado = "no-contratado" | "activo" | "aviso";

export type ModuloCuenta = {
  id: ModuloId;
  estado: ModuloEstado;
  vence: string;
  nota: string;
};

export function emptyModulos(): ModuloCuenta[] {
  return MODULOS.map((item) => ({ id: item.id, estado: "no-contratado", vence: "", nota: "" }));
}

export function moduloLabel(id: ModuloId) {
  return MODULOS.find((item) => item.id === id)?.label ?? id;
}

export function mergeModulos(list: ModuloCuenta[] | undefined): ModuloCuenta[] {
  const saved = Array.isArray(list) ? list : [];
  return emptyModulos().map((item) => {
    const found = saved.find((row) => row.id === item.id);
    if (!found) return item;
    const estado: ModuloEstado = found.estado === "activo" || found.estado === "aviso" ? found.estado : "no-contratado";
    return { id: item.id, estado, vence: found.vence || "", nota: found.nota || "" };
  });
}

export function renewalDue(item: ModuloCuenta, today: string) {
  if (item.estado === "no-contratado") return false;
  if (item.estado === "aviso") return true;
  return Boolean(item.vence && item.vence <= today);
}
