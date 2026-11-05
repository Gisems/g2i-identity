"use client"

import { initials } from "@/lib/format"

// Cómo se pinta cada color de avatar; uno desconocido cae al de marca.
const TONES: Record<string, string> = {
  primary: "bg-[image:var(--gradient-primary)] text-white",
  accent: "bg-[image:var(--gradient-accent)] text-white",
  secondary: "bg-[image:var(--gradient-secondary)] text-secondary-foreground",
  "primary-light": "bg-primary-light text-white",
  "accent-light": "bg-accent-light text-foreground",
}

export function avatarToneClass(tone: string) {
  return TONES[tone] ?? TONES.primary
}

interface UserAvatarProps {
  name: string
  tone: string
  /** El tamaño y el cuerpo del texto los da quien lo usa. */
  className?: string
}

/** El círculo con las iniciales de la persona, en el color que eligió. */
export default function UserAvatar({ name, tone, className = "size-10 text-sm" }: Readonly<UserAvatarProps>) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${avatarToneClass(tone)} ${className}`}
    >
      {initials(name) || "··"}
    </span>
  )
}
