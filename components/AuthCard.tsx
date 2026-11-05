import BrandLogo from "@/components/BrandLogo";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[image:var(--gradient-hero)] p-5">
      <div className="flex w-full max-w-100 flex-col gap-5 rounded-lg bg-card p-8 shadow-[var(--shadow-hero)]">
        <BrandLogo />
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
