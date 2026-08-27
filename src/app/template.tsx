export default function PageTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="page-flip">{children}</div>;
}
