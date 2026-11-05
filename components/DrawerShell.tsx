"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DrawerContext = createContext<(() => void) | null>(null);

/** Devuelve la función que cierra el panel lateral, o null si el formulario está en su página propia. */
export const useDrawerClose = () => useContext(DrawerContext);

/**
 * Panel lateral del portal: el formulario se abre sobre la vista actual (la lista queda detrás)
 * en lugar de cambiar de página. Cerrarlo vuelve a la ruta anterior.
 */
export default function DrawerShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  return (
    <DrawerContext.Provider value={close}>
      <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
        <SheetContent
          side="right"
          className="pv pv-drawer gap-0 p-0"
          style={{ width: "100%", maxWidth: 540 }}
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="pr-8 font-display text-xl font-bold">{title}</SheetTitle>
            <SheetDescription className="sr-only">{title}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </SheetContent>
      </Sheet>
    </DrawerContext.Provider>
  );
}
