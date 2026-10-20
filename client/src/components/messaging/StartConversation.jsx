import { useState } from "react";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";

/** Administrators pick any doctor to start (or reopen) a conversation. */
export default function StartConversation({ onStart }) {
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [doctorId, setDoctorId] = useState("");
  const list = doctors.data ?? [];

  return (
    <div className="chat-new">
      <label htmlFor="chat-new-doctor">
        <small>Message a doctor</small>
      </label>
      <select id="chat-new-doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
        <option value="">Choose a doctor…</option>
        {list.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="button button-outline"
        disabled={!doctorId}
        onClick={() => {
          onStart(doctorId);
          setDoctorId("");
        }}
      >
        Open conversation
      </button>
    </div>
  );
}
