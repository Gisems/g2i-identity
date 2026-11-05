import { addMonths } from "./format";

export type Modality = "contado" | "adelanto_saldo" | "cuotas" | "recurrente";

export type InstallmentDraft = { number: number; concept: string; amount: number; due_date: string };

const toMoney = (cents: number) => cents / 100;

/**
 * Cuotas de un plan de pago. Trabaja en céntimos para no arrastrar redondeo de decimales.
 * - contado: 1 cuota.
 * - adelanto_saldo: 50 % y 50 %, el saldo un mes después.
 * - cuotas: N iguales y mensuales; la última absorbe el redondeo.
 * - recurrente: N meses con el mismo monto; `amount` es el monto de cada mes.
 */
export function genInstallments(modality: Modality, amount: number, count: number, firstDue: string): InstallmentDraft[] {
  const cents = Math.round(amount * 100);

  if (modality === "contado") return [{ number: 1, concept: "Pago único", amount: toMoney(cents), due_date: firstDue }];

  if (modality === "adelanto_saldo") {
    const advance = Math.round(cents / 2);
    return [
      { number: 1, concept: "Adelanto 50%", amount: toMoney(advance), due_date: firstDue },
      { number: 2, concept: "Saldo 50%", amount: toMoney(cents - advance), due_date: addMonths(firstDue, 1) },
    ];
  }

  const n = Math.max(1, Math.floor(count));

  if (modality === "recurrente") {
    return Array.from({ length: n }, (_, i) => ({
      number: i + 1,
      concept: `Mes ${i + 1}`,
      amount: toMoney(cents),
      due_date: addMonths(firstDue, i),
    }));
  }

  const base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    concept: `Cuota ${i + 1}`,
    amount: toMoney(i === n - 1 ? cents - base * (n - 1) : base),
    due_date: addMonths(firstDue, i),
  }));
}
