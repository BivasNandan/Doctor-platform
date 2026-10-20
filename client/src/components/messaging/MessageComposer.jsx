import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ATTACHMENT_ACCEPT, MESSAGE_MAX_LENGTH } from "../../constants.js";
import { validateAttachment } from "../../utils/validation.js";

/**
 * Text box, attachment picker and send button.
 * `onSend(text)` / `onSendAttachment(file)` return promises; `onError(message)` reports problems.
 */
export default function MessageComposer({ disabled, onSend, onSendAttachment, onError }) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const run = async (action) => {
    setSending(true);
    onError("");
    try {
      await action();
    } catch (error) {
      onError(error.message || "Message was not sent.");
    } finally {
      setSending(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    run(async () => {
      await onSend(text);
      setDraft("");
    });
  };

  const pick = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = validateAttachment(chosen);
    if (problem) onError(problem);
    else {
      onError("");
      setFile(chosen);
    }
  };

  const sendFile = () =>
    run(async () => {
      await onSendAttachment(file);
      setFile(null);
    });

  return (
    <>
      {file && (
        <div className="attachment-preview" role="status">
          {previewUrl && <img src={previewUrl} alt="Selected attachment preview" />}
          <span>
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </span>
          <button type="button" onClick={() => setFile(null)}>
            Remove
          </button>
          <button type="button" disabled={sending} onClick={sendFile}>
            {sending ? "Uploading…" : "Send attachment"}
          </button>
        </div>
      )}
      <form className="message-compose" onSubmit={submit}>
        <input
          placeholder="Write a message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Message"
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={disabled || sending}
        />
        <label className="icon-button" aria-label="Choose attachment" title="Choose attachment">
          <Plus size={16} />
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={pick}
            disabled={disabled}
            className="sr-only"
          />
        </label>
        <button type="submit" aria-label="Send message" disabled={disabled || sending || !draft.trim()}>
          <ArrowRight size={17} />
        </button>
      </form>
    </>
  );
}
