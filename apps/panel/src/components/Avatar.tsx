import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "h-8 w-8", text: "text-xs", px: 32 },
  lg: { box: "h-12 w-12", text: "text-lg", px: 48 },
};

export function Avatar({ src, name, size = "sm", className = "" }: AvatarProps) {
  const s = SIZES[size];
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={s.px}
        height={s.px}
        className={`${s.box} rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex ${s.box} items-center justify-center rounded-full bg-elevated ${s.text} font-bold text-gray-300 ${className}`}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
