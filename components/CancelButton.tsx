"use client";

import Link from "next/link";
import { btn } from "@/components/pv";
import { useDrawerClose } from "@/components/DrawerShell";

/** En el panel lateral cierra el panel; en su página propia vuelve a `href`. */
export default function CancelButton({ href }: { href: string }) {
  const close = useDrawerClose();
  if (close) {
    return <button type="button" className={btn()} onClick={close}>Cancelar</button>;
  }
  return <Link href={href} className={btn()}>Cancelar</Link>;
}
