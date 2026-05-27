type DashboardHeaderProps = {
  title: string;
  description?: string;
};

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header className="mb-8 pb-4 relative dashboard-header">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1A0E14] md:text-4xl animate-fade-in-down">{title}</h1>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-[13px] text-text-secondary animate-fade-in" style={{ animationDelay: "100ms" }}>{description}</p>
      ) : null}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] divider-gradient" />
    </header>
  );
}
