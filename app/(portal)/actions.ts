"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marca como hecha la próxima acción de un seguimiento; deja de aparecer en el Panel. */
export async function markFollowUpDoneAction(id: string) {
  const supabase = await createClient();
  await supabase.from("follow_ups").update({ next_action_done: true }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/clientes", "layout");
}
