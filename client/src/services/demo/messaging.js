import { ROLES } from "../../constants/roles.js";
import { APPOINTMENT_STATUS } from "../../constants/statuses.js";
import { MESSAGE_MAX_LENGTH } from "../../constants/attachments.js";
import { ApiError } from "../http/httpClient.js";
import { db, findDoctor, invalid, nextId, notFound, reply, requireRole } from "./db.js";

const requireViewer = () => requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN);

/** Threads this viewer may see. Patients only ever see their own. */
function visibleConversations(viewer) {
  const adminThread = db.conversations.find((item) => item.id === "c-admin");
  if (viewer.role === ROLES.DOCTOR) return [adminThread];
  if (viewer.role === ROLES.ADMIN) {
    const doctor = findDoctor("d1");
    return [
      {
        ...adminThread,
        participantId: doctor.id,
        participantRole: ROLES.DOCTOR,
        participantName: doctor.name,
        participantImage: doctor.image,
      },
    ];
  }
  return db.conversations.filter(
    (item) => item.participantRole === ROLES.DOCTOR && item.patientUserId === viewer.id,
  );
}

/** Admin ↔ doctor threads are always open; patient threads need an accepted request. */
function canMessage(conversation, viewer) {
  if (viewer.role !== ROLES.PATIENT) return true;
  return db.appointments.some(
    (item) =>
      item.patientUserId === viewer.id &&
      item.doctorId === conversation.participantId &&
      item.status === APPOINTMENT_STATUS.ACCEPTED,
  );
}

function requireConversation(id, viewer) {
  const conversation = visibleConversations(viewer).find((item) => item.id === id);
  if (!conversation) throw notFound("This conversation");
  return conversation;
}

const notEligible = () =>
  new ApiError("Messaging is available only after the doctor accepts an appointment request.", {
    status: 403,
    code: "MESSAGING_NOT_ELIGIBLE",
  });

export const messagingService = {
  async listConversations() {
    const viewer = requireViewer();
    return reply(
      visibleConversations(viewer).map((conversation) => ({
        ...conversation,
        canMessage: canMessage(conversation, viewer),
      })),
    );
  },

  async listMessages(conversationId) {
    const viewer = requireViewer();
    const conversation = requireConversation(conversationId, viewer);
    if (!canMessage(conversation, viewer)) throw notEligible();
    return reply(
      (db.messages[conversationId] ?? []).map((message) => ({
        ...message,
        isMine: message.sender === viewer.role,
      })),
    );
  },

  async sendMessage(conversationId, body) {
    const viewer = requireViewer();
    const conversation = requireConversation(conversationId, viewer);
    if (!canMessage(conversation, viewer)) throw notEligible();
    const text = body?.trim() ?? "";
    if (!text || text.length > MESSAGE_MAX_LENGTH)
      throw invalid(`Enter a message of 1 to ${MESSAGE_MAX_LENGTH.toLocaleString()} characters.`);
    const message = {
      id: nextId("DEMO-MSG"),
      conversationId,
      sender: viewer.role,
      isMine: true,
      body: text,
      sentAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      simulated: true,
    };
    db.messages[conversationId] = [...(db.messages[conversationId] ?? []), message];
    return reply(message);
  },

  async sendAttachment() {
    requireViewer();
    throw new ApiError("Attachment upload is unavailable in demo mode. No file was sent.", {
      status: 501,
      code: "NOT_IMPLEMENTED",
    });
  },
};
