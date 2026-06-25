import { useState, type PropsWithChildren, type ReactNode } from "react";

interface NavItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  children?: NavItem[];
}

interface Props {
  brand?: ReactNode;
  convenioSlot?: ReactNode;
  topbarSlot?: ReactNode;
  nav: NavItem[];
  activeKey?: string;
  onNavigate?: (item: NavItem) => void;
}

export function AppShellAdmin({
  brand,
  convenioSlot,
  topbarSlot,
  nav,
  activeKey,
  onNavigate,
  children,
}: PropsWithChildren<Props>) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gridTemplateRows: "64px 1fr",
        gridTemplateAreas: `"sidebar topbar" "sidebar main"`,
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <aside
        style={{
          gridArea: "sidebar",
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--border)",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {brand}
        {convenioSlot}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((item) => (
            <NavLeaf key={item.key} item={item} activeKey={activeKey} onNavigate={onNavigate} />
          ))}
        </nav>
      </aside>
      <header
        style={{
          gridArea: "topbar",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        {topbarSlot}
      </header>
      <main style={{ gridArea: "main", padding: 24, overflowY: "auto" }}>{children}</main>
    </div>
  );
}

function NavLeaf({
  item,
  activeKey,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  activeKey?: string;
  onNavigate?: (item: NavItem) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState<boolean>(item.children?.some((c) => c.key === activeKey) ?? false);
  const isActive = activeKey === item.key;
  const hasChildren = !!item.children?.length;

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: `10px ${12 + depth * 12}px`,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? "var(--accent)" : "var(--text-muted)",
    background: isActive ? "var(--bg-elev-2)" : "transparent",
    cursor: "pointer",
    border: "none",
    width: "100%",
    textAlign: "left",
    transition: "background .15s, color .15s",
  };

  return (
    <>
      <button
        type="button"
        style={baseStyle}
        onClick={() => {
          if (hasChildren) {
            setOpen((o) => !o);
            return;
          }
          onNavigate?.(item);
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "var(--bg-elev-2)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {item.icon ? <span style={{ width: 18, display: "inline-flex" }}>{item.icon}</span> : null}
        <span style={{ flex: 1 }}>{item.label}</span>
        {hasChildren ? <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▾" : "▸"}</span> : null}
      </button>
      {hasChildren && open
        ? item.children!.map((child) => (
            <NavLeaf key={child.key} item={child} activeKey={activeKey} onNavigate={onNavigate} depth={depth + 1} />
          ))
        : null}
    </>
  );
}
