import { notFound } from "next/navigation";
import { Panel, Topbar } from "@/components/pv";
import { getProfile, getSessionUser } from "@/lib/session";
import MfaPanel from "./MfaPanel";
import PasswordForm from "./PasswordForm";

export default async function AjustesPage() {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user?.email || !profile) notFound();

  return (
    <>
      <Topbar title="Ajustes" sub={`${profile.name} · ${user.email}`} />
      <Panel title="Cambiar contraseña">
        <div className="panel-body">
          <PasswordForm />
        </div>
      </Panel>
      <Panel title="Verificación en dos pasos (2FA)">
        <div className="panel-body">
          <MfaPanel />
        </div>
      </Panel>
    </>
  );
}
