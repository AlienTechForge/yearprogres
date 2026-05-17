import { GetServerSideProps, NextPage } from "next";
import { DateTime, Duration } from "luxon";
import { useEffect, useState } from "react";
import { showFireworks } from "../lib/fireworks/showFireworks";
import { calculateYearProgress, calculateYearTimeLeft } from "../lib/utils";
import { NextSeo } from "next-seo";
import Icon from "@mdi/react";
import { mdiInstagram, mdiGithub, mdiPlus } from "@mdi/js";
import CreateProgressModal from "../components/CreateProgressModal";
import ShareProgressModal from "../components/ShareProgressModal";
import { initDb } from "../lib/db";

const TIMER_INTERVAL_MS = 1000; // 1s
const IS_CLOSE_THRESHOLD = 30;

interface Props {
  timeLeftInSeconds: number;
  ogYear: number;
  ogPercentPassed: number;
}

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const YearProgress: NextPage<Props> = ({
  timeLeftInSeconds,
  ogYear,
  ogPercentPassed,
}) => {
  const [timeLeftDuration, setTimeLeftDuration] = useState<Duration>();
  // 確保初始狀態為關閉，並且強制設置為false
  // 確保模態框初始狀態為關閉
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [customProgressUrl, setCustomProgressUrl] = useState("");
  
  // 處理自訂進度條創建成功
  const handleCreateSuccess = (id: string, url: string) => {
    setCustomProgressUrl(url);
    setIsShareModalOpen(true);
  };
  
  const currentYear = DateTime.local().year;
  const currentTimeLeftInSeconds = timeLeftDuration
    ? Math.floor(timeLeftDuration.as("seconds"))
    : timeLeftInSeconds;

  const yearProgressPercent = calculateYearProgress(currentTimeLeftInSeconds);
  const messageToDisplay =
    currentTimeLeftInSeconds === 0
      ? "新年快樂!"
      : currentTimeLeftInSeconds;
  const isCloseToEnd = currentTimeLeftInSeconds <= IS_CLOSE_THRESHOLD;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeftDuration(calculateYearTimeLeft(userTimeZone));
    }, TIMER_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (currentTimeLeftInSeconds === 0) {
      showFireworks();
    }
  }, [currentTimeLeftInSeconds]);

  const url = "https://yearprogres.azndev.com";
  const siteName = "年進度條";
  const title = `${ogYear} 年進度條`;
  const description = `${ogPercentPassed}%`;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://yearprogres.azndev.com";
  const imageUrl = `${baseUrl}/api/og?currentYear=${encodeURIComponent(
    String(ogYear)
  )}&percentPassed=${encodeURIComponent(String(ogPercentPassed))}`;

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
          images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
          site_name: siteName,
        }}
        twitter={{
          handle: "@r6alien",
          cardType: "summary_large_image",
        }}
      />

      <main className="h-screen w-screen flex relative">
        {/* 左下角的 + 按鈕 */}
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="absolute bottom-8 left-8 bg-indigo-500 hover:bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10 transition-colors duration-300"
          aria-label="創建自訂進度條"
        >
          <Icon path={mdiPlus} size={1.5} />
        </button>
        
        {/* 創建自訂進度條模態框 */}
        <CreateProgressModal 
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            console.log('关闭模態框');
          }}
          onSuccess={handleCreateSuccess}
        />
        
        {/* 分享自訂進度條模態框 */}
        <ShareProgressModal 
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          url={customProgressUrl}
        />
        {isCloseToEnd ? (
          <section className="m-auto flex items-center justify-center w-full p-4">
            <h1 className="font-black text-8xl text-center">
              {messageToDisplay}
            </h1>
          </section>
        ) : (
          <section className="m-auto flex flex-col items-center gap-8 w-full h-full max-w-2xl p-4 min-h-0">
            <h1 className="mt-auto font-black text-6xl">{currentYear}</h1>
            <div className="h-8 w-full border flex-shrink-0">
              <div
                className="bg-gray-300 h-full"
                style={{ width: `${yearProgressPercent}%` }}
              />
            </div>
            <h2 className="font-extrabold text-4xl">{`${yearProgressPercent}%`}</h2>
            <div className="mt-auto font-mono min-h-[32px] text-xs">
              {timeLeftDuration && (
                <span>
                  剩下&nbsp;
                  {timeLeftDuration.months > 0 &&
                    `${timeLeftDuration.months} 個月, `}
                  {timeLeftDuration.days > 0 &&
                    `${timeLeftDuration.days} 天, `}
                  {timeLeftDuration.hours} 小時, {timeLeftDuration.minutes}{" "}
                  分鐘, {Math.floor(timeLeftDuration.seconds)} 秒鐘
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


          </section>
        )}
      </main>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query,
  req,
}) => {
  // 初始化資料庫
  await initDb();
  const timeZone = (req.headers["x-vercel-ip-timezone"] as string) || "UTC";
  const timeLeftDuration = calculateYearTimeLeft(timeZone);
  const timeLeftinSeconds = Math.floor(timeLeftDuration.as("seconds"));
  const calculatedProgress = calculateYearProgress(timeLeftinSeconds);
  const currentYear = DateTime.local({ zone: timeZone }).year;

  // 處理資料庫初始化
  
  return {
    props: {
      timeLeftInSeconds: timeLeftinSeconds,
      ogPercentPassed: parseOgPercent(query.ogPercent, calculatedProgress),
      ogYear: parseOgYear(query.ogYear, currentYear),
    },
  };
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOgPercent(value: string | string[] | undefined, fallback: number) {
  const percent = Number(firstQueryValue(value));

  if (!Number.isFinite(percent)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.floor(percent)));
}

function parseOgYear(value: string | string[] | undefined, fallback: number) {
  const year = Number(firstQueryValue(value));

  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    return fallback;
  }

  return year;
}

export default YearProgress;
