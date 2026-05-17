import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useRouter } from "next/router";
import Link from "next/link";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

// 錯誤回退組件
function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">發生錯誤</h1>
        <p className="mb-6">很抱歉，應用程序發生了錯誤</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded"
        >
          重試
        </button>
        <Link href="/" className="block mt-4 underline">
          返回首頁
        </Link>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${spaceGrotesk.style.fontFamily};
        }
      `}</style>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          // 重置應用狀態
          router.reload();
        }}
      >
        <Component {...pageProps} />
      </ErrorBoundary>
      <Analytics />
    </>
  );
}
