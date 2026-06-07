/**
 * Dekoracyjne, powoli dryfujące plamy gradientu w tle.
 * Czysto wizualne (aria-hidden); ruch wyłączany przy prefers-reduced-motion (globals.css).
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="jh-blob jh-blob-a h-[34rem] w-[34rem] bg-primary/20 blur-[130px]" />
      <div className="jh-blob jh-blob-b h-[34rem] w-[34rem] bg-discord/20 blur-[130px]" />
      <div className="jh-blob jh-blob-c h-[26rem] w-[26rem] bg-success/10 blur-[130px]" />
    </div>
  );
}
