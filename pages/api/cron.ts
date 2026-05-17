import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "crypto";
import moment from "moment-timezone";
import TwitterApi from "twitter-api-v2";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FB_ACCESS_TOKEN: string;
      TWITTER_APP_KEY: string;
      TWITTER_APP_SECRET: string;
      TWITTER_ACCESS_TOKEN: string;
      TWITTER_ACCESS_SECRET: string;
      CRON_SECRET?: string;
      FB_PAGE_ID?: string;
    }
  }
}

const timeZone = `Pacific/Auckland`;
const DEFAULT_FB_PAGE_ID = "108123055076949";

const postToFacebook = async (message: string, url: string) => {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  if (!accessToken) {
    return "skipped";
  }

  const pageId = process.env.FB_PAGE_ID || DEFAULT_FB_PAGE_ID;
  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(pageId)}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      message,
      link: url,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    console.error("Facebook post failed", { status: response.status });
    throw new Error("facebook post failed");
  }

  return "success";
};

const postToTwitter = async (message: string) => {
  if (
    !process.env.TWITTER_APP_KEY ||
    !process.env.TWITTER_APP_SECRET ||
    !process.env.TWITTER_ACCESS_TOKEN ||
    !process.env.TWITTER_ACCESS_SECRET
  ) {
    return "skipped";
  }

  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  return twitterClient.v2.tweet(message);
};

const calculateEndOfTheYearTimeLeft = (startDate: any) => {
  const endOfYear = moment.tz(timeZone).endOf("year");
  return endOfYear.diff(startDate, "seconds");
};

const calculatePercentPassed = (startDate: any) => {
  const secondsInYear = moment.duration(1, "year").asSeconds();

  return Math.floor(
    ((secondsInYear - calculateEndOfTheYearTimeLeft(startDate)) * 100) /
      secondsInYear
  );
};

const SocialMediaRobot = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "方法不允許" });
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(process.env.CRON_SECRET ? 403 : 503).json({ error: "cron 未啟用" });
  }

  res.setHeader("Cache-Control", "private, no-store");
  console.log("Running YearProgress robot.");

  const now = moment.tz(timeZone);
  const todayPercentPassed = calculatePercentPassed(now);
  const yesterday = moment.tz(timeZone).subtract(1, "days");
  const yesterdayPercentPassed = calculatePercentPassed(yesterday);
  const url = `https://www.getyearprogress.com?ogPercent=${todayPercentPassed}&ogYear=${now.year()}`;
  const message = `🤖 ⏳ #yearprogress ${url}`;

  console.log(`Yesterday: ${yesterdayPercentPassed}%`);
  console.log(`Today: ${todayPercentPassed}%`);

  let result = { fb: "", twitter: "" };
  if (todayPercentPassed > yesterdayPercentPassed) {
  try {
    result.fb = await postToFacebook(message, url);
    if (result.fb === "success") {
      console.log("Posted to Facebook.");
    }
  } catch {
    result.fb = "error";
  }

  try {
    const twitterResult = await postToTwitter(message);
    result.twitter = twitterResult === "skipped" ? "skipped" : "success";
    if (result.twitter === "success") {
      console.log("Posted to Twitter.");
    }
  } catch {
    result.twitter = "error";
  }
  } else {
    console.log("No need to post.");
  }

  res.status(200).json({ result });
};

function isAuthorizedCronRequest(req: NextApiRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const providedSecret = getProvidedCronSecret(req);
  if (!providedSecret) {
    return false;
  }

  const configuredBuffer = Buffer.from(configuredSecret);
  const providedBuffer = Buffer.from(providedSecret);

  return (
    configuredBuffer.length === providedBuffer.length &&
    timingSafeEqual(configuredBuffer, providedBuffer)
  );
}

function getProvidedCronSecret(req: NextApiRequest) {
  const headerValue = req.headers["x-cron-secret"];
  if (typeof headerValue === "string") {
    return headerValue;
  }

  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return undefined;
}

export default SocialMediaRobot;
