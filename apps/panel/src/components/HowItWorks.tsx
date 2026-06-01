interface HowItWorksProps {
  steps: string[];
  title?: string;
}

export function HowItWorks({ steps, title = "Jak to działa?" }: HowItWorksProps) {
  return (
    <div className="rounded-xl bg-[#1a1f2e] p-6">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <div className="flex flex-col gap-3 text-sm text-gray-400">
        {steps.map((text, i) => (
          <div key={i} className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-[#d4a843]">{i + 1}.</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
