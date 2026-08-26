export function OptionDistributionBar({ option1, option2, option3 }: { option1: number; option2: number; option3: number }) {
  const total = option1 + option2 + option3;
  if (total === 0) return <span className="text-xs text-text-muted">bez odpovědí</span>;

  const segments = [
    { count: option1, color: "#004289", label: "1" },
    { count: option2, color: "#95C11F", label: "2" },
    { count: option3, color: "#2DB194", label: "3" },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-3 w-24 overflow-hidden rounded-full bg-border">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} title={`Volba ${s.label}: ${s.count}`} />
        ))}
      </div>
      <span className="whitespace-nowrap text-xs text-text-muted">
        {option1}/{option2}/{option3}
      </span>
    </div>
  );
}
