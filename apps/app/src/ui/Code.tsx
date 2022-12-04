export interface CodeProps {
  children: React.ReactNode;
}
export const Code = ({ children }: CodeProps) => (
  <code className="rounded bg-code-bg px-1 py-0.5 text-center font-mono text-[0.8em] text-code-on">
    {children}
  </code>
);
