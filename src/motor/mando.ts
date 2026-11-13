import { motorToday, type MotorRecord } from "@/motor/expediente";
import { type StageConf } from "@/motor/admin";

export type Mando = {
  total: number;
  byStage: { id: string; label: string; count: number }[];
  overdue: number;
  withoutNext: number;
  byCommercial: { name: string; count: number }[];
  citasToday: number;
};

export function buildMando(rows: MotorRecord[], stages: StageConf[]): Mando {
  const today = motorToday();
  const byStage = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    count: rows.filter((row) => row.stage === stage.id).length,
  }));
  const names = new Map<string, number>();
  for (const row of rows) {
    const name = row.assigned.trim() || "Sin asignar";
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  return {
    total: rows.length,
    byStage,
    overdue: rows.filter((row) => row.nextWhat && row.nextAt && row.nextAt < today).length,
    withoutNext: rows.filter((row) => !row.nextWhat.trim()).length,
    byCommercial: [...names.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es")),
    citasToday: rows.reduce((sum, row) => sum + row.citas.filter((cita) => !cita.done && cita.at.slice(0, 10) === today).length, 0),
  };
}
