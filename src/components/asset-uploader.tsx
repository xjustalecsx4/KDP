"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { showFeedback } from "./feedback";
export function AssetUploader({ bookId }: { bookId: string }) {
  const [type, setType] = useState("INTERIOR_PAGE");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function upload(files: FileList | null) {
    if (!files?.length || pending) return;
    showFeedback(null);
    setPending(true);
    setMessage("");
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.set("file", file);
        data.set("type", type);
        const response = await fetch(`/api/books/${bookId}/assets`, {
          method: "POST",
          body: data,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Upload failed.");
        uploaded++;
      }
      setMessage(`${uploaded} asset${uploaded === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      setMessage(
        `${uploaded} uploaded. ${error instanceof Error ? error.message : "Upload failed."}`,
      );
    } finally {
      setPending(false);
      router.refresh();
    }
  }
  return (
    <div
      className="upload-box"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void upload(event.dataTransfer.files);
      }}
    >
      <label>
        Asset type
        <select
          value={type}
          disabled={pending}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="COVER">Cover</option>
          <option value="BACK_COVER">Back cover</option>
          <option value="INTERIOR_PAGE">Interior page</option>
          <option value="MARKETING_IMAGE">Marketing image</option>
          <option value="OTHER">Other image</option>
        </select>
      </label>
      <label className="file-drop">
        {pending ? "Uploading…" : "Drop images here or choose files"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={pending}
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
        <small>
          JPG, PNG or WEBP · Up to 10 MB each · Originals are preserved
        </small>
      </label>
      {message && (
        <p role="status" className="feedback">
          {message}
        </p>
      )}
    </div>
  );
}
