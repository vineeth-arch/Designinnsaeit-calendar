import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { SatoriOptions } from "satori";
import { z, ZodError } from "zod";

import { getOGImageVersion } from "@calcom/lib/OgImages";
import { WEBAPP_URL } from "@calcom/lib/constants";

export const runtime = "edge";

const BRAND = { mint: "#00FFCF", mintMuted: "#9fdccf", indigo: "#2C0098", ink: "#0D0035", text: "#EDEAFB" };
const eyebrow = {
  fontFamily: "inter",
  fontWeight: 500,
  fontSize: 18,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DURATION_RE = / · (\d+) min$/;

function splitDuration(title: string): { title: string; minutes: number | null } {
  const m = title.match(DURATION_RE);
  return m ? { title: title.replace(DURATION_RE, ""), minutes: Number(m[1]) } : { title, minutes: null };
}

type FrameProps = {
  title: string;
  subtitle: string;
  minutes: number | null;
  logoUrl?: string | null;
  accent?: string | null;
};

function BrandFrame({ title, subtitle, minutes, logoUrl, accent }: FrameProps) {
  const logo = logoUrl && /^https?:\/\//.test(logoUrl) ? logoUrl : `${WEBAPP_URL}/brand/og-logo.png`;
  const mint = accent && HEX_RE.test(accent) ? accent : BRAND.mint;
  return (
    <div style={{ width: 1200, height: 630, display: "flex", background: BRAND.ink, fontFamily: "inter" }}>
      <div
        style={{
          width: 744,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND.indigo,
          padding: "56px 64px",
        }}>
        <img
          src={logo}
          width={380}
          height={90}
          style={{ objectFit: "contain", objectPosition: "left top" }}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...eyebrow, color: mint, marginBottom: 20 }}>
            Brand Strategy & Packaging Design Studio
          </div>
          <div
            style={{
              fontFamily: "bricolage",
              fontWeight: 800,
              fontSize: title.length > 28 ? 64 : 84,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: BRAND.text,
              maxWidth: 616,
            }}>
            {title}
          </div>
        </div>
        <div style={{ color: BRAND.mintMuted, fontSize: 28, fontWeight: 500 }}>{subtitle}</div>
      </div>
      <div
        style={{
          width: 456,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "56px 64px",
        }}>
        {minutes !== null ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "bricolage",
                fontWeight: 800,
                fontSize: 220,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                color: mint,
              }}>
              {String(minutes)}
            </div>
            <div style={{ ...eyebrow, fontSize: 22, color: BRAND.mintMuted, marginTop: 12 }}>minutes</div>
          </div>
        ) : (
          <div style={{ ...eyebrow, fontSize: 22, color: BRAND.mintMuted }}>Design Innsæit</div>
        )}
      </div>
    </div>
  );
}

const meetingSchema = z.object({
  imageType: z.literal("meeting"),
  title: z.string(),
  names: z.string().array(),
  usernames: z.string().array(),
  meetingProfileName: z.string(),
  meetingImage: z.string().nullable().optional(),
});

const appSchema = z.object({
  imageType: z.literal("app"),
  name: z.string(),
  description: z.string(),
  slug: z.string(),
  logoUrl: z.string(),
});

const genericSchema = z.object({
  imageType: z.literal("generic"),
  title: z.string(),
  description: z.string(),
});

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imageType = searchParams.get("type");

  try {
    const fontResults = await Promise.allSettled([
      fetch(new URL("/fonts/BricolageGrotesque-ExtraBold.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
      fetch(new URL("/fonts/Inter-Regular.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
      fetch(new URL("/fonts/Inter-Medium.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
    ]);

    const fonts: SatoriOptions["fonts"] = [];

    if (fontResults[0].status === "fulfilled") {
      fonts.push({ name: "bricolage", data: fontResults[0].value, weight: 800 });
    }

    if (fontResults[1].status === "fulfilled") {
      fonts.push({ name: "inter", data: fontResults[1].value, weight: 400 });
    }

    if (fontResults[2].status === "fulfilled") {
      fonts.push({ name: "inter", data: fontResults[2].value, weight: 500 });
    }

    const ogConfig = {
      width: 1200,
      height: 630,
      fonts,
    };

    switch (imageType) {
      case "meeting": {
        try {
          const { title, meetingProfileName } = meetingSchema.parse({
            names: searchParams.getAll("names"),
            usernames: searchParams.getAll("usernames"),
            title: searchParams.get("title"),
            meetingProfileName: searchParams.get("meetingProfileName"),
            meetingImage: searchParams.get("meetingImage"),
            imageType,
          });

          const etag = await getOGImageVersion("meeting");
          const d = splitDuration(title);
          const img = new ImageResponse(
            <BrandFrame title={d.title} minutes={d.minutes} subtitle={`with ${meetingProfileName}`} />,
            ogConfig
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control":
                "public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=31536000",
              ETag: `"${etag}"`,
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for meeting image",
                message:
                  "Required parameters: title, meetingProfileName. Optional: names, usernames, meetingImage",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }
      case "app": {
        try {
          const { name, description, slug } = appSchema.parse({
            name: searchParams.get("name"),
            description: searchParams.get("description"),
            slug: searchParams.get("slug"),
            logoUrl: searchParams.get("logoUrl"),
            imageType,
          });

          // Get SVG hash for the app
          const svgHashesModule = await import("@calcom/web/public/app-store/svg-hashes.json");
          const SVG_HASHES = svgHashesModule.default ?? {};
          const svgHash = SVG_HASHES[slug] ?? undefined;

          const etag = await getOGImageVersion("app", { svgHash });
          const img = new ImageResponse(
            <BrandFrame title={name} subtitle={description} minutes={null} />,
            ogConfig
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control":
                "public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=31536000",
              ETag: `"${etag}"`,
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for app image",
                message: "Required parameters: name, description, slug",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }

      case "generic": {
        try {
          const { title, description } = genericSchema.parse({
            title: searchParams.get("title"),
            description: searchParams.get("description"),
            imageType,
          });

          const etag = await getOGImageVersion("generic");
          const img = new ImageResponse(
            <BrandFrame title={title} subtitle={description} minutes={null} />,
            ogConfig
          );

          return new Response(img.body, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control":
                "public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=31536000",
              ETag: `"${etag}"`,
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for generic image",
                message: "Required parameters: title, description",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }

      default:
        return new Response("Wrong image type", { status: 404 });
    }
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}

export { handler as GET };
