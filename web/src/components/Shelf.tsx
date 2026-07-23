import { color, font, space } from "../theme";

interface ShelfProps {
  /** Shelf name — rendered in the display face, e.g. "Playing", "Trending". */
  title: string;
  /** Item count shown beside the title. Omit to hide. */
  count?: number | undefined;
  /** Optional accent hue for the rule + count (status shelves pass their color). */
  accent?: string | undefined;
  /** Right-aligned slot for a link or control. */
  action?: React.ReactNode;
  /** "row" = horizontally scrollable; "grid" = wrapping grid. */
  layout?: "row" | "grid";
  /** Fixed track width for row items; grid uses this as its min column width. */
  itemWidth?: number;
  children: React.ReactNode;
}

/**
 * A "shelf": typographic header (label + count + rule) above a row of covers.
 * The library feeling comes from type and structure — there are deliberately
 * no shelf graphics, wood, or faux-3D depth anywhere in here.
 */
export default function Shelf({
  title,
  count,
  accent,
  action,
  layout = "row",
  itemWidth = 150,
  children,
}: ShelfProps) {
  return (
    <section style={{ marginBottom: space[7] }}>
      <ShelfHeader title={title} {...(count !== undefined ? { count } : {})} {...(accent ? { accent } : {})} action={action} />
      {layout === "row" ? (
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: space[4],
            overflowX: "auto",
            paddingBottom: space[2],
            scrollSnapType: "x proximity",
          }}
        >
          {Array.isArray(children)
            ? children.map((child, i) => (
                <div
                  key={i}
                  style={{
                    flex: `0 0 ${itemWidth}px`,
                    // Without this, a flex item's automatic minimum size is its
                    // min-content width — a long nowrap game title then overrides
                    // flex-basis and that one card renders wider than its siblings.
                    minWidth: 0,
                    scrollSnapAlign: "start",
                  }}
                >
                  {child}
                </div>
              ))
            : children}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${itemWidth}px), 1fr))`,
            gap: space[4],
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

/** The shelf label — reusable on its own for sections that aren't cover rows. */
export function ShelfHeader({
  title,
  count,
  accent,
  action,
}: {
  title: string;
  count?: number | undefined;
  accent?: string | undefined;
  action?: React.ReactNode;
}) {
  const hue = accent ?? color.accent;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: space[3],
        marginBottom: space[4],
      }}
    >
      <h2
        style={{
          fontFamily: font.display,
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: color.text,
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>

      {count !== undefined && (
        <span
          style={{
            fontFamily: font.body,
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: hue,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}

      {/* Hairline rule carries the eye across — the only "shelf" line in the UI */}
      <span
        aria-hidden
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(to right, ${color.border}, transparent)`,
          minWidth: space[4],
        }}
      />

      {action}
    </div>
  );
}
