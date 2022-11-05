export interface KbdProps {
  children: React.ReactNode;
}
export const Kbd = ({ children }: KbdProps) => (
  <kbd className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-xxs text-slate-700">
    {children}
  </kbd>
);
