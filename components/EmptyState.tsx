import { Empty } from "@/components/pv";

/** Lo que se ve cuando una vista todavía no tiene información. */
export default function EmptyState(props: { title: string; text?: string; href?: string; action?: string }) {
  return (
    <div className="panel">
      <Empty {...props} />
    </div>
  );
}
