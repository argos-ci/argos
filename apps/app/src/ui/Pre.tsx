export interface PreProps {
  children: React.ReactNode;
}
export const Pre = ({ children }: PreProps) => (
  <pre className="whitespace-pre-wrap rounded bg-slate-900 p-4">{children}</pre>
);
