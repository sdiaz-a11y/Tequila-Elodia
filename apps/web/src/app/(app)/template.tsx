/**
 * Re-mounts on every navigation inside the app, so each page enters with the same soft fade and section
 * cascade (see .page-enter in globals.css; off with "reduce motion").
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
