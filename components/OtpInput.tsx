"use client";

import { useEffect, useRef } from "react";

const LENGTH = 6;

/** Código de 6 dígitos en casillas separadas (_ _ _ _ _ _): avanza solo, acepta pegar y retroceder con borrar. */
export default function OtpInput({
  value,
  onChange,
  disabled,
  autoFocus,
  idPrefix = "otp",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Último valor conocido. Se actualiza al instante (antes del re-render) porque al pasar el foco a la
  // casilla siguiente, su onFocus todavía vería el valor viejo y devolvería el foco atrás.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const update = (next: string) => {
    latest.current = next;
    onChange(next);
  };
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      // se borró la casilla
      update(value.slice(0, i) + value.slice(i + 1));
      return;
    }
    // un dígito normal, o varios (autocompletar del teléfono / pegado dentro de una casilla)
    const next = (value.slice(0, i) + digits + value.slice(i + 1)).slice(0, LENGTH);
    update(next);
    focus(Math.min(i + digits.length, LENGTH - 1));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      update(value.slice(0, i - 1) + value.slice(i));
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    update(pasted);
    focus(pasted.length);
  }

  return (
    <div className="otp" role="group" aria-label="Código de 6 dígitos">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="otp-box"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${i + 1}`}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          // no se puede saltar casillas: siempre se escribe en la primera vacía
          onFocus={(e) => {
            if (i > latest.current.length) focus(latest.current.length);
            else e.target.select();
          }}
        />
      ))}
    </div>
  );
}
