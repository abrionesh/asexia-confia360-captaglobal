export type MotorEvent = {
  id: string;
  at: string;
  kind: "alta" | "estado" | "nota" | "cita" | "alarma";
  text: string;
};

export type MotorChannel = "llamada" | "whatsapp" | "visita" | "email";

export type MotorCita = {
  id: string;
  at: string;
  title: string;
  done: boolean;
};

export type MotorRecord = {
  id: string;
  clienteId: string;
  stage: string;
  stageAt: string;
  assigned: string;
  nextAt: string;
  nextWhat: string;
  channel: MotorChannel;
  citas: MotorCita[];
  events: MotorEvent[];
};

export function motorToday() {
  return new Date().toISOString().slice(0, 10);
}

export function motorUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function moveRecord<T extends MotorRecord>(rows: T[], id: string, stage: string, label: string): T[] {
  const at = new Date().toISOString();
  return rows.map((row) =>
    row.id === id && row.stage !== stage
      ? {
          ...row,
          stage,
          stageAt: at.slice(0, 10),
          events: [{ id: motorUid(), at, kind: "estado" as const, text: `Estado: ${label}` }, ...row.events],
        }
      : row,
  );
}

export function addRecordNote<T extends MotorRecord>(rows: T[], id: string, text: string): T[] {
  const clean = text.trim();
  if (!clean) return rows;
  const at = new Date().toISOString();
  return rows.map((row) =>
    row.id === id ? { ...row, events: [{ id: motorUid(), at, kind: "nota" as const, text: clean.slice(0, 500) }, ...row.events] } : row,
  );
}

export function closeRecordAlarm<T extends MotorRecord>(rows: T[], id: string): T[] {
  const row = rows.find((item) => item.id === id);
  if (!row?.nextWhat) return rows;
  const at = new Date().toISOString();
  return rows.map((item) =>
    item.id === id
      ? {
          ...item,
          nextAt: "",
          nextWhat: "",
          events: [{ id: motorUid(), at, kind: "alarma" as const, text: `Hecho: ${row.nextWhat}` }, ...item.events],
        }
      : item,
  );
}

export function scheduleCita<T extends MotorRecord>(rows: T[], id: string, at: string, title: string): T[] {
  const clean = title.trim();
  if (!clean || !at) return rows;
  const now = new Date().toISOString();
  const cita: MotorCita = { id: motorUid(), at, title: clean.slice(0, 160), done: false };
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          citas: [...row.citas, cita].sort((a, b) => a.at.localeCompare(b.at)),
          events: [{ id: motorUid(), at: now, kind: "cita" as const, text: `Cita: ${clean}` }, ...row.events],
        }
      : row,
  );
}

export function toggleRecordCita<T extends MotorRecord>(rows: T[], id: string, citaId: string): T[] {
  return rows.map((row) =>
    row.id === id ? { ...row, citas: row.citas.map((cita) => (cita.id === citaId ? { ...cita, done: !cita.done } : cita)) } : row,
  );
}
