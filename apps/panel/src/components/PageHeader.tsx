interface PageHeaderProps {
  category: string;
  title: React.ReactNode;
  description: string;
  className?: string;
}

export function PageHeader({
  category,
  title,
  description,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {category}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-sm text-gray-300">{description}</p>
    </div>
  );
}
