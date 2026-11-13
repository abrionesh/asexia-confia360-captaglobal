export type PitchInput = {
  name: string;
  city: string;
  sectorId: string;
  angle: string;
  chain: boolean;
};

export type Scripts = {
  visita: string;
  whatsapp: string;
  email: string;
  seguimiento: string;
};

const CLINIC = new Set(["clinica", "estetica", "vet"]);
const TABLE = new Set(["hosteleria", "hotel"]);

function concrete(angle: string) {
  const text = angle.trim();
  if (!text) return "";
  if (/sin auditar|sin hueco|sin teléfono|pendiente|no es un prospecto|lista importada/i.test(text)) return "";
  return text.replace(/\.$/, "");
}

function joinAnd(parts: string) {
  return parts.replace(/, ([^,]*)$/, " y $1");
}

export function draftScripts(input: PitchInput): Scripts {
  const name = input.name.trim() || "el negocio";
  const city = input.city.trim() || "la zona";
  const gap = concrete(input.angle);
  const seen = gap
    ? `Al revisar ${name} he visto esto: ${joinAnd(gap)}. `
    : `Estuve revisando ${name}, en ${city}. `;
  const chain = input.chain ? " Si es cadena, confirma que quien te atiende puede decidir en el local." : "";
  const clinic = CLINIC.has(input.sectorId);
  const table = TABLE.has(input.sectorId);
  const visita = table
    ? `1. Llegada en horario valle, sin prisa. Pide un café o una mesa y observa carta, reservas y wifi.
2. Mira si la carta es QR o papel, cómo reservan y si la web se ve en el móvil.
3. Apertura: «Soy Angel, de AsExIA. Ayudo a negocios de ${city} con cosas concretas y precio cerrado. ¿Hablo con quien lleva el local?»
4. Una sola idea, la que hayas visto. No hables de precios.${gap ? `\n   Idea de partida, solo si la confirmas en el local: ${gap}.` : ""}
5. Cierre: pide el teléfono o el correo de quien decide y fija 15 minutos. Deja tarjeta.
6. Al salir: registra la visita en esta ficha y marca la próxima acción.${chain}`
    : `1. Llegada en horario valle. Entra como visitante, sin pedir cita ni datos de ningún cliente${clinic ? " (los datos de salud son confidenciales)" : ""}.
2. Observa cómo piden cita o reserva, si hay servicios y precios visibles y si la web se ve en el móvil.
3. Apertura: «Soy Angel, de AsExIA. Ayudo a negocios de ${city} a captar y organizar clientes. ¿Hablo con quien gestiona esto?»
4. Una sola idea, la que hayas visto. No hables de precios.${gap ? `\n   Idea de partida, solo si la confirmas: ${gap}.` : ""}
5. Cierre: pide el teléfono o el correo de quien decide y fija 15 minutos. Deja tarjeta.
6. Al salir: registra la visita en esta ficha y marca la próxima acción.${chain}${clinic ? "\nNo trates datos de pacientes. Si más adelante se automatiza algo con datos de salud, hace falta contrato de encargado y un sitio adecuado." : ""}`;

  return {
    visita,
    whatsapp: `Hola, soy Angel, de AsExIA. ${seen}Ayudo a negocios de ${city} con soluciones sencillas y precio cerrado. ¿Te cuento en 10 minutos qué haría en tu caso, sin compromiso?`,
    email: `Asunto: Una idea para ${name}\n\nHola,\n\nSoy Angel, de AsExIA. ${seen}Ayudo a negocios de ${city} con soluciones sencillas y precio cerrado.\n\n¿Te parece si te enseño en 15 minutos qué haría en tu caso? Puedo pasarme cuando mejor te venga.\n\nUn saludo,\nAngel · AsExIA`,
    seguimiento: `Hola, soy Angel, de AsExIA. Te escribí hace unos días sobre ${name}. No quiero molestarte: ¿te encaja que nos veamos 15 minutos esta semana? Si no es buen momento, dímelo y no insisto.`,
  };
}

export function waHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return "";
  const full = digits.length === 9 ? `34${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function mailHref(email: string, name: string, body: string) {
  if (!email.includes("@")) return "";
  const subject = `Una idea para ${name}`;
  const text = body.replace(/^Asunto:.*\n+/i, "");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
