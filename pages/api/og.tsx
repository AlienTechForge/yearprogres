import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

const generateOpenGraphImageHandler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const percentPassed = clampPercent(searchParams.get("percentPassed"));
  const title = sanitizeTitle(
    searchParams.get("title") || searchParams.get("currentYear") || ""
  );
  const percentLabel = formatPercent(percentPassed);

  const font = await fetch(
    new URL("../../assets/SpaceGrotesk-Bold.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        tw="h-screen w-screen flex bg-[#1f1f1f] text-[#e3e3e3]"
        style={{ fontFamily: "'Space Grotesk'" }}
      >
        <div tw="m-auto flex flex-col items-center justify-center space-y-8 w-full max-w-2xl p-4">
          <h1 tw="font-black text-6xl">{title}</h1>
          <div tw="flex h-8 w-full border border-[#e3e3e3]">
            <div
              tw="bg-gray-300 h-full"
              style={{ width: `${percentPassed}%` }}
            />
          </div>
          <h2 tw="font-extrabold text-4xl">{`${percentLabel}%`}</h2>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Space Grotesk",
          data: font,
          style: "normal",
        },
      ],
    }
  );
};

function clampPercent(value: string | null) {
  const percent = Number(value);

  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.min(100, Math.max(0, percent));
}

function formatPercent(value: number) {
  if (value <= 0) {
    return "0";
  }

  if (value >= 100) {
    return "100";
  }

  if (value < 1) {
    return value.toFixed(2);
  }

  if (value < 10) {
    return value.toFixed(1);
  }

  return Math.floor(value).toString();
}

function sanitizeTitle(value: string) {
  const title = value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 80);
  return title || String(new Date().getUTCFullYear());
}

export default generateOpenGraphImageHandler;
