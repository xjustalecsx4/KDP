"use client";
import { useEffect, useState } from "react";
type Message = { ok: boolean; message: string } | null;
export function showFeedback(message: Message) { window.dispatchEvent(new CustomEvent("kdp-feedback", { detail: message })); }
export function Feedback() {
  const [message, setMessage] = useState<Message>(null);
  useEffect(() => { const receive = (event: Event) => setMessage((event as CustomEvent<Message>).detail); window.addEventListener("kdp-feedback", receive); return () => window.removeEventListener("kdp-feedback", receive); }, []);
  return message ? <div role={message.ok ? "status" : "alert"} className={`global-feedback ${message.ok ? "success" : "error"}`}><span>{message.message}</span><button aria-label="Dismiss notification" onClick={() => setMessage(null)}>×</button></div> : null;
}
