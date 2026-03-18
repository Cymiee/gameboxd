interface Props {
  size?: number;
  thickness?: number;
}

export default function Spinner({ size = 36, thickness = 3 }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${thickness}px solid var(--border)`,
        borderTopColor: "var(--accent)",
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

/** Full-viewport-height centered spinner — use as a page loading state. */
export function PageSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <Spinner size={40} />
    </div>
  );
}
