type SeatingLayoutProps = {
  children: React.ReactNode;
};

export default function SeatingLayout({ children }: SeatingLayoutProps) {
  return <div className="seating-full-bleed flex min-h-0 flex-1 flex-col">{children}</div>;
}
