/**
 * Dekoracyjne, powoli dryfujące plamy gradientu w tle.
 * Czysto wizualne (aria-hidden); ruch wyłączany przy prefers-reduced-motion (globals.css).
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="jh-blob jh-blob-a h-[34rem] w-[34rem] bg-[#d4a843]/20 blur-[130px]" />
      <div className="jh-blob jh-blob-b h-[34rem] w-[34rem] bg-[#5865F2]/20 blur-[130px]" />
      <div className="jh-blob jh-blob-c h-[26rem] w-[26rem] bg-[#22c55e]/10 blur-[130px]" />
    </div>
  );
}
