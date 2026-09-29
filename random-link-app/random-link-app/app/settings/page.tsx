"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "randomLinkOpenBrowser";

const browserOptions = [
  { value: "default", label: "端末の標準設定" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "edge", label: "Edge" },
  { value: "brave", label: "Brave" },
  { value: "vivaldi", label: "Vivaldi" },
  { value: "opera", label: "Opera" },
];

export default function SettingsPage() {
  const [browser, setBrowser] = useState("default");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (
      saved &&
      browserOptions.some(
        (option) => option.value === saved,
      )
    ) {
      setBrowser(saved);
    }

    setLoaded(true);
  }, []);

  function changeBrowser(value: string) {
    setBrowser(value);
    localStorage.setItem(STORAGE_KEY, value);
  }

  return (
    <main className="container">
      <h1>設定</h1>

      <section className="panel form">
        <label>
          リンクを開くブラウザ

          <select
            value={browser}
            onChange={(e) =>
              changeBrowser(e.target.value)
            }
            style={{
              visibility: loaded ? "visible" : "hidden",
            }}
          >
  
            {browserOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="small">
          登録したカードを開くときに使用します。
        </div>
      </section>
    </main>
  );
}