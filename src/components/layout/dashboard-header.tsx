type DashboardHeaderProps = {
  title: string;
  description?: string;
};

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl animate-fade-in-down">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-muted-foreground animate-fade-in" style={{ animationDelay: "100ms" }}>{description}</p>
      ) : null}
    </header>
  );
}
