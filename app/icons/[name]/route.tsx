import { ImageResponse } from "next/og";

// App icons for the manifest, iOS home screen and notifications, drawn at
// build time (static PNGs at /icons/<name>).

type Icon = { size: number; style: "rounded" | "full" | "badge" };

const ICONS: Record<string, Icon> = {
  "icon-192.png": { size: 192, style: "rounded" },
  "icon-512.png": { size: 512, style: "rounded" },
  // Android crops maskable icons to its own shape: keep the mark inside the middle 80%.
  "maskable-512.png": { size: 512, style: "full" },
  "apple-180.png": { size: 180, style: "full" },
  // Status-bar badge: Android uses only the alpha channel.
  "badge-96.png": { size: 96, style: "badge" },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, style } = icon;
  const badge = style === "badge";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: badge ? "transparent" : "#FFD217",
          borderRadius: style === "rounded" ? size * 0.22 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: size * (style === "full" ? 0.5 : badge ? 0.8 : 0.62),
            fontWeight: 900,
            color: badge ? "#FFFFFF" : "#1A1A1A",
            lineHeight: 1,
            marginTop: -size * 0.06,
          }}
        >
          e
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
