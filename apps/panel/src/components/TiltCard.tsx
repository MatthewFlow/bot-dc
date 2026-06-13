import type { ReactNode } from "react";

/**
 * Karta z efektem spotlight + tilt 3D. Sam znacznik `.jh-tilt` — ruchem steruje globalny
 * `TiltProvider` (delegacja). Dla nieinteraktywnych kart-div; elementy klikalne mogą
 * po prostu dostać klasę `jh-tilt` bezpośrednio.
 */
export function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`jh-tilt ${className}`}>{children}</div>;
}
