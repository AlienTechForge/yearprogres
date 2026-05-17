import { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import { DateTime, Duration } from "luxon";
import { useEffect, useState } from "react";
import { showFireworks } from "../../lib/fireworks/showFireworks";
import { NextSeo } from "next-seo";
import Icon from "@mdi/react";
import { mdiInstagram, mdiGithub } from "@mdi/js";
import { getCustomProgressBar } from "../../lib/db";
import { normalizeTimeZone, readUtcDateTime } from "../../lib/customProgressTime";

const TIMER_INTERVAL_MS = 1000; // 1s
const IS_CLOSE_THRESHOLD = 10; // 調整為只在最後10秒顯示倒數

interface Props {
  timeLeftInSeconds: number;
  totalTimeInSeconds: number;
  progressName: string;
  id: string;
  timeZone: string;
  startTimeStr: string;
  endTimeStr: string;
  error?: string;
}

const CustomProgress: NextPage<Props> = ({
  timeLeftInSeconds,
  totalTimeInSeconds,
  progressName,
  id,
  timeZone,
  startTimeStr,
  error,
  endTimeStr,
}) => {
  const [timeLeftDuration, setTimeLeftDuration] = useState<Duration>(() =>
    durationFromSeconds(timeLeftInSeconds)
  );
  const currentTimeLeftInSeconds = Math.floor(timeLeftDuration.as("seconds"));

  const progressPercent = calculateProgressPercent(currentTimeLeftInSeconds, totalTimeInSeconds);
  const progressPercentLabel = formatProgressPercent(progressPercent);
  const startTimeDisplay = formatDateTimeInZone(startTimeStr, timeZone);
  const endTimeDisplay = formatDateTimeInZone(endTimeStr, timeZone);
  // 倒計時結束時顯示完成了！
  const messageToDisplay = currentTimeLeftInSeconds <= 0 ? "完成了！" : currentTimeLeftInSeconds;
  // 只在最後10秒內觸發特殊顯示
  const isCloseToEnd = currentTimeLeftInSeconds > 0 && currentTimeLeftInSeconds <= IS_CLOSE_THRESHOLD;

  useEffect(() => {
    const endTime = DateTime.fromISO(endTimeStr, { zone: "utc" }).setZone(timeZone);
    
    // 設定更新剩餘時間的函數
    const updateTimeLeft = () => {
      const now = DateTime.now().setZone(timeZone);
      
      // 計算精確的剩餘時間，包含毫秒
      const remainingDuration = endTime.diff(now, [
        "months",
        "days",
        "hours",
        "minutes",
        "seconds",
        "milliseconds"
      ]);
      
      // 確保剩餘時間沒有負值
      if (remainingDuration.as('milliseconds') <= 0) {
        // 如果時間已經結束，將所有值設為0
        setTimeLeftDuration(zeroDuration());
        
        // 從定時器中清除不必要的頻繁更新
        if (intervalIdRef) {
          clearInterval(intervalIdRef);
          intervalIdRef = null;
        }
      } else {
        // 確保時間精確到秒
        setTimeLeftDuration(remainingDuration);
      }
    };
    
    // 使用React的useRef管理定時器ID
    // 為了解決類型問題，我們使用簡單的變量
    let intervalIdRef: number | null = null;
    
    // 立即更新一次
    updateTimeLeft();
    
    // 設定定時器每秒更新
    intervalIdRef = window.setInterval(updateTimeLeft, TIMER_INTERVAL_MS) as unknown as number;

    return () => {
      if (intervalIdRef) {
        clearInterval(intervalIdRef);
      }
    };
  }, [endTimeStr, timeZone]);  // 當結束時間或建立時區變化時重新計算

  // 追蹤是否已顯示煙火
  const [fireworksShown, setFireworksShown] = useState(false);
  
  useEffect(() => {
    // 在倒數結束時顯示煙火，且只顯示一次
    if (currentTimeLeftInSeconds <= 0 && !fireworksShown) {
      showFireworks();
      setFireworksShown(true);
    }
  }, [currentTimeLeftInSeconds, fireworksShown]);

  // 如果有錯誤，顯示錯誤訊息
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">找不到進度條</h1>
          <p className="mb-6">{error}</p>
          <Link href="/" className="underline">返回年進度條</Link>
        </div>
      </div>
    );
  }

  const url = `${process.env.NEXT_PUBLIC_URL || 'https://yearprogres.azndev.com'}/custom/${id}`;
  const siteName = "自訂進度條";
  const title = `${progressName}`;
  const description = `${progressPercentLabel}%`;

  return (
    <div>
      <NextSeo
        title={title}
        description={description}
        canonical={url}
        openGraph={{
          url,
          title,
          description,
          images: [
            { 
              url: `${process.env.NEXT_PUBLIC_URL || 'https://yearprogres.azndev.com'}/api/og?title=${encodeURIComponent(progressName)}&percentPassed=${progressPercentLabel}`,
              width: 1200, 
              height: 630, 
              alt: title 
            }
          ],
          site_name: siteName,
        }}
        twitter={{
          handle: "@r6alien",
          cardType: "summary_large_image",
        }}
      />

      <main className="h-screen w-screen flex">
        {isCloseToEnd ? (
          <section className="m-auto flex items-center justify-center w-full p-4">
            <h1 className="font-black text-8xl text-center">
              {messageToDisplay}
            </h1>
          </section>
        ) : (
          <section className="m-auto flex flex-col items-center gap-8 w-full h-full max-w-2xl p-4 min-h-0">
            <h1 className="mt-auto font-black text-6xl break-words text-center">{progressName}</h1>
            <div className="h-8 w-full border flex-shrink-0">
              <div
                className="bg-gray-300 h-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <h2 className="font-extrabold text-4xl">{`${progressPercentLabel}%`}</h2>
            <div className="text-center text-sm leading-6 text-gray-600">
              <div>開始：{startTimeDisplay}</div>
              <div>結束：{endTimeDisplay}</div>
              <div>時區：{timeZone}</div>
            </div>
            <div className="mt-auto font-mono min-h-[40px] text-base sm:text-lg text-center">
              {timeLeftDuration && (
                <span>
                  {currentTimeLeftInSeconds <= 0 ? (
                    <span className="text-green-600 font-bold">已完成</span>
                  ) : (
                    <>
                      剩下&nbsp;
                      {timeLeftDuration.months > 0 &&
                        `${timeLeftDuration.months} 個月, `}
                      {timeLeftDuration.days > 0 &&
                        `${timeLeftDuration.days} 天, `}
                      {timeLeftDuration.hours} 小時, {timeLeftDuration.minutes}{" "}
                      分鐘, {Math.floor(timeLeftDuration.seconds)} 秒鐘
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="text-sm inline-flex gap-4 items-center justify-center p-4">
              <a href="https://www.instagram.com/r6alien">
                <Icon
                  path={mdiInstagram}
                  title="關注我的Instagram"
                  size={0.8}
                />
              </a>
              <a href="https://github.com/Alien7666">
                <Icon
                  path={mdiGithub}
                  title="關注我的GitHub"
                  size={0.8}
                />
              </a>
            </div>

            <div>
              <Link href="/" className="underline text-sm">返回年進度條</Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 計算進度條百分比
function calculateProgressPercent(currentTimeLeftInSeconds: number, totalTimeInSeconds: number) {
  if (totalTimeInSeconds <= 0) {
    return currentTimeLeftInSeconds <= 0 ? 100 : 0;
  }

  const elapsedTime = totalTimeInSeconds - Math.max(0, currentTimeLeftInSeconds);
  const percent = (elapsedTime / totalTimeInSeconds) * 100;

  return Math.min(100, Math.max(0, percent));
}

function formatProgressPercent(percent: number) {
  if (!Number.isFinite(percent) || percent <= 0) {
    return "0";
  }

  if (percent >= 100) {
    return "100";
  }

  if (percent < 1) {
    return percent.toFixed(2);
  }

  if (percent < 10) {
    return percent.toFixed(1);
  }

  return Math.floor(percent).toString();
}

function durationFromSeconds(seconds: number) {
  return Duration.fromObject({ seconds: Math.max(0, seconds) }).shiftTo(
    "months",
    "days",
    "hours",
    "minutes",
    "seconds",
  );
}

function zeroDuration() {
  return Duration.fromObject({
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });
}

function formatDateTimeInZone(value: string, timeZone: string) {
  const dateTime = DateTime.fromISO(value, { zone: "utc" }).setZone(timeZone);

  if (!dateTime.isValid) {
    return "";
  }

  return dateTime.toFormat("yyyy-MM-dd HH:mm:ss");
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
}) => {
  try {
    const id = params?.id as string;

    // 從資料庫獲取自訂進度條資訊
    const result = await getCustomProgressBar(id);

    if (!result.success) {
      return {
        props: {
          timeLeftInSeconds: 0,
          totalTimeInSeconds: 100, // 預設值，不會實際使用
          progressName: "",
          id: id,
          timeZone: normalizeTimeZone(undefined),
          startTimeStr: "",
          endTimeStr: "",
          error: "找不到指定的進度條",
        },
      };
    }

    const data = result.data as any;
    const timeZone = normalizeTimeZone(data.time_zone);
    const startTime = readUtcDateTime(data.start_time);
    const endTime = readUtcDateTime(data.end_time);

    if (!startTime.isValid || !endTime.isValid) {
      return {
        props: {
          timeLeftInSeconds: 0,
          totalTimeInSeconds: 100,
          progressName: "",
          id: id,
          timeZone,
          startTimeStr: "",
          endTimeStr: "",
          error: "進度條時間資料無效",
        },
      };
    }

    const now = DateTime.utc();
    
    // 計算剩餘時間（秒）
    const timeLeftInSeconds = Math.max(0, Math.floor(endTime.diff(now, "seconds").seconds));
    
    // 計算總時間（秒） = 結束時間 - 開始時間
    const totalTimeInSeconds = Math.max(1, Math.floor(endTime.diff(startTime, "seconds").seconds));

    return {
      props: {
        timeLeftInSeconds,
        totalTimeInSeconds,
        progressName: data.name,
        id: id,
        timeZone,
        startTimeStr: startTime.toUTC().toISO() || "",
        endTimeStr: endTime.toUTC().toISO() || "",
      },
    };
  } catch (error) {
    console.error("獲取自訂進度條時發生錯誤:", error);
    return {
      props: {
        timeLeftInSeconds: 0,
        totalTimeInSeconds: 100, // 預設值，不會實際使用
        progressName: "",
        id: params?.id as string || "",
        timeZone: normalizeTimeZone(undefined),
        startTimeStr: "",
        endTimeStr: "",
        error: "獲取進度條資訊時發生錯誤",
      },
    };
  }
};

export default CustomProgress;
