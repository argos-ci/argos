export function MetadataRow(props: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-2.5 text-xs">
      {props.children}
    </div>
  );
}
