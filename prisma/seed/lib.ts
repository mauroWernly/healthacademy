import { fakerES_MX as faker } from "@faker-js/faker";

// Datos determinísticos: misma semilla siempre genera el mismo dataset (sección 55).
faker.seed(20260812);

export { faker };

let dniCounter = 30000000;
export function nextDni(): string {
  dniCounter += 1;
  return String(dniCounter);
}

let fileNumberCounter = 100;
export function nextFileNumber(): string {
  fileNumberCounter += 1;
  return String(fileNumberCounter).padStart(6, "0");
}

const emailSlugsUsed = new Set<string>();
export function emailFor(firstName: string, lastName: string): string {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z.]/g, "");
  let slug = base;
  let n = 1;
  while (emailSlugsUsed.has(slug)) {
    n += 1;
    slug = `${base}${n}`;
  }
  emailSlugsUsed.add(slug);
  return `${slug}@alumnas.demo-cosmetologia.edu.ar`;
}

export function fakePhone(): string {
  return `11-${faker.number.int({ min: 4000, max: 7999 })}-${faker.number.int({ min: 1000, max: 9999 })}`;
}

export function dueDate(year: number, month1to12: number, day: number): Date {
  return new Date(year, month1to12 - 1, day);
}

export function daysBefore(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export function daysAfter(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
