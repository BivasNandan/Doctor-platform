import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Avatar, Button, Notice } from "../ui/index.js";

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_TYPES = PHOTO_ACCEPT.split(",");
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Lets the signed-in person add, replace or remove their profile photo (JPEG, PNG or WebP, up to 2 MB).
 * @param {{onChanged?: (user: object) => void}} props  Called with the updated user after a change.
 */
export default function ProfilePhotoEditor({ onChanged }) {
  const { user, changePhoto } = useAuth();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const run = async (file, done) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      // Awaited first: an optional call would skip evaluating its argument when `onChanged` is absent.
      const updated = await changePhoto(file);
      onChanged?.(updated);
      setMessage(done);
    } catch (failure) {
      setError(failure.message || "Your photo could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // the same file can be chosen again after an error
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP picture.");
      setMessage("");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError("That picture is larger than 2 MB. Choose a smaller one.");
      setMessage("");
      return;
    }
    run(file, "Your photo was updated.");
  };

  return (
    <div className="photo-editor">
      <Avatar src={user.photoUrl} name={user.name} alt="Your profile photo" />
      <div>
        <strong>Profile photo</strong>
        <small>JPEG, PNG or WebP, up to 2 MB. Shown next to your name.</small>
        <div className="photo-actions">
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            hidden
            onChange={choose}
            aria-label="Choose a profile photo"
          />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera size={15} /> {busy ? "Saving…" : user.photoUrl ? "Change photo" : "Add photo"}
          </Button>
          {user.photoUrl && (
            <Button variant="outline" disabled={busy} onClick={() => run(null, "Your photo was removed.")}>
              <Trash2 size={15} /> Remove
            </Button>
          )}
        </div>
        <Notice error>{error}</Notice>
        <Notice>{message}</Notice>
      </div>
    </div>
  );
}
