import { useState, useMemo, useEffect } from "react";
import { DateTime } from "luxon";

interface CreateProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string, url: string) => void;
}

export default function CreateProgressModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProgressModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [startSecond, setStartSecond] = useState("00");
  
  const [endDate, setEndDate] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [endSecond, setEndSecond] = useState("");
  
  // 計算組合的時間字串
  const startTime = useMemo(() => {
    if (!startHour || !startMinute) return "";
    return `${startHour}:${startMinute}:${startSecond}`;
  }, [startHour, startMinute, startSecond]);
  
  const endTime = useMemo(() => {
    if (!endHour || !endMinute || !endSecond) return "";
    return `${endHour}:${endMinute}:${endSecond}`;
  }, [endHour, endMinute, endSecond]);
  
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 生成小時選項
  const hourOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      options.push(
        <option key={hourStr} value={hourStr}>
          {hourStr}
        </option>
      );
    }
    return options;
  }, []);
  
  // 生成分鐘選項
  const minuteOptions = useMemo(() => {
    const options = [];
    for (let minute = 0; minute < 60; minute++) {
      const minuteStr = minute.toString().padStart(2, '0');
      options.push(
        <option key={minuteStr} value={minuteStr}>
          {minuteStr}
        </option>
      );
    }
    return options;
  }, []);
  
  // 生成秒鐘選項（每10秒一個選項）
  const secondOptions = useMemo(() => {
    const options = [];
    for (let second = 0; second < 60; second += 10) {
      const secondStr = second.toString().padStart(2, '0');
      options.push(
        <option key={secondStr} value={secondStr}>
          {secondStr}
        </option>
      );
    }
    return options;
  }, []);

  useEffect(() => {
    if (isOpen && !startDate && !endDate) {
      const now = DateTime.local();
      const tomorrow = now.plus({ days: 1 });

      setStartDate(now.toFormat("yyyy-MM-dd"));
      setStartHour(now.toFormat("HH"));
      setStartMinute(now.toFormat("mm"));
      setStartSecond("00");
      setEndDate(tomorrow.toFormat("yyyy-MM-dd"));
      setEndHour("00");
      setEndMinute("00");
      setEndSecond("00");
    }
  }, [isOpen, startDate, endDate]);

  // 處理關閉模態框
  const handleClose = () => {
    // 重設所有表單字段
    setName("");
    setStartDate("");
    setStartHour("");
    setStartMinute("");
    setStartSecond("00");
    setEndDate("");
    setEndHour("");
    setEndMinute("");
    setEndSecond("");
    setUseCurrentTime(true);
    setError("");
    // 確保調用外部的onClose函數
    onClose();
  };

  // 處理提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 檢查表單數據
    if (!name.trim()) {
      setError("請輸入進度條名稱");
      return;
    }

    if (!endDate || !endTime) {
      setError("請選擇結束日期和時間");
      return;
    }
    
    if (!useCurrentTime && (!startDate || !startTime)) {
      setError("請選擇開始日期和時間");
      return;
    }

    try {
      setLoading(true);
      
      // 組合日期和時間
      const endTimeString = `${endDate}T${endTime}`;
      const endTimeObj = new Date(endTimeString);
      
      // 設定開始時間
      let startTimeObj;
      if (useCurrentTime) {
        startTimeObj = new Date(); // 使用當前時間
      } else {
        const startTimeString = `${startDate}T${startTime}`;
        startTimeObj = new Date(startTimeString);
      }

      // 確保結束時間在未來
      if (endTimeObj <= new Date()) {
        setError("結束時間必須設定在未來");
        setLoading(false);
        return;
      }
      
      // 確保開始時間早於結束時間
      if (startTimeObj >= endTimeObj) {
        setError("開始時間必須早於結束時間");
        setLoading(false);
        return;
      }

      // 發送請求創建自訂進度條
      const response = await fetch("/api/custom-progress/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          startTime: useCurrentTime ? undefined : startTimeObj.toISOString(),
          endTime: endTimeObj.toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 創建成功，調用成功回調
        onSuccess(data.id, data.url);
        handleClose();
      } else {
        // 創建失敗，顯示錯誤訊息
        setError(data.error || "創建進度條時發生錯誤");
      }
    } catch (err) {
      console.error("創建進度條時發生錯誤:", err);
      setError("創建進度條時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-indigo-600">創建自訂進度條</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              進度條名稱
            </label>
            <input
              id="name"
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：專案完成倒數"
              required
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                id="useCurrentTime"
                type="checkbox"
                className="mr-2"
                checked={useCurrentTime}
                onChange={(e) => setUseCurrentTime(e.target.checked)}
              />
              <label className="text-gray-700 text-sm font-bold" htmlFor="useCurrentTime">
                使用當前時間作為開始時間
              </label>
            </div>
          </div>
          
          {!useCurrentTime && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
                  開始日期
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required={!useCurrentTime}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  開始時間
                </label>
                <div className="flex space-x-2">
                  <div className="w-1/3">
                    <label className="block text-gray-700 text-xs mb-1" htmlFor="startHour">
                      時
                    </label>
                    <select
                      id="startHour"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      required={!useCurrentTime}
                    >
                      {hourOptions}
                    </select>
                  </div>
                  <div className="w-1/3">
                    <label className="block text-gray-700 text-xs mb-1" htmlFor="startMinute">
                      分
                    </label>
                    <select
                      id="startMinute"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      required={!useCurrentTime}
                    >
                      {minuteOptions}
                    </select>
                  </div>
                  <div className="w-1/3">
                    <label className="block text-gray-700 text-xs mb-1" htmlFor="startSecond">
                      秒
                    </label>
                    <select
                      id="startSecond"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={startSecond}
                      onChange={(e) => setStartSecond(e.target.value)}
                    >
                      {secondOptions}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">
              結束日期
            </label>
            <input
              id="endDate"
              type="date"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              結束時間
            </label>
            <div className="flex space-x-2">
              <div className="w-1/3">
                <label className="block text-gray-700 text-xs mb-1" htmlFor="endHour">
                  時
                </label>
                <select
                  id="endHour"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  required
                >
                  {hourOptions}
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-gray-700 text-xs mb-1" htmlFor="endMinute">
                  分
                </label>
                <select
                  id="endMinute"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  required
                >
                  {minuteOptions}
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-gray-700 text-xs mb-1" htmlFor="endSecond">
                  秒
                </label>
                <select
                  id="endSecond"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={endSecond}
                  onChange={(e) => setEndSecond(e.target.value)}
                  required
                >
                  {secondOptions}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? "創建中..." : "創建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
