import { useState } from "react";
import DoctorPicker from "./DoctorPicker.jsx";
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
      <DoctorPicker doctors={list} value={doctorId} onChange={setDoctorId} />
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
