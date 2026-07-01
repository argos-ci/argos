import { Kbd } from "@/ui/Kbd";

export function ShortcutHint(props: {
  keys: string[];
  children: React.ReactNode;
}) {
  const { keys, children } = props;
  return (
    <div className="text-low flex items-center gap-1">
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
      <span>{children}</span>
    </div>
  );
}
