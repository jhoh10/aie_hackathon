import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/", label: "Harness" },
  { to: "/session", label: "Run a session" },
  { to: "/review", label: "Claims review" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="font-display text-lg font-semibold">
          Trust Issues
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              activeProps={{ className: "bg-ink text-ink-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
