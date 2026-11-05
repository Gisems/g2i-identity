import Link from "next/link";

/** Pestañas de Finanzas. Sueldos y Cuenta solo aparecen para admins. */
export default function FinanceNav({ current, admin }: { current: "resumen" | "sueldos" | "cuenta"; admin: boolean }) {
  const tabs: [string, string, string][] = [["resumen", "Resumen", "/finanzas"]];
  if (admin) tabs.push(["sueldos", "Sueldos", "/finanzas/sueldos"], ["cuenta", "Cuenta", "/finanzas/cuenta"]);
  return (
    <div className="agenda-bar">
      <div className="seg" role="group" aria-label="Sección de finanzas">
        {tabs.map(([k, l, href]) => (
          <Link key={k} href={href} aria-pressed={current === k}>{l}</Link>
        ))}
      </div>
    </div>
  );
}
