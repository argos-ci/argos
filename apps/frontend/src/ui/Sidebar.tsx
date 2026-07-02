export function Sidebar(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <div className="flex min-h-0 max-w-80 flex-1 flex-col">{children}</div>
  );
}
