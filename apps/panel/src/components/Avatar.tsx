interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  lg: { box: "h-12 w-12", text: "text-lg" },
};

export function Avatar({ src, name, size = "sm", className = "" }: AvatarProps) {
  const s = SIZES[size];
  if (src) {
    return <img src={src} alt={name} className={`${s.box} rounded-full ${className}`} />;
  }
  return (
    <div
      className={`flex ${s.box} items-center justify-center rounded-full bg-elevated ${s.text} font-bold text-gray-300 ${className}`}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
