export function Loading() {
  return <div className="state-block">Loading…</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state-block">
      <strong>{title}</strong>
      {hint && <p className="muted">{hint}</p>}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="state-block error">
      <strong>Something went wrong</strong>
      <p>{message}</p>
    </div>
  );
}
