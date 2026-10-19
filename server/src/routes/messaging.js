import { Router } from "express";
import { z } from "zod";
import { rateLimit, requireRole } from "../auth.js";
import { prisma } from "../config/prisma.js";
import { ATTACHMENT_TYPES, MAX_FILE_BYTES, discardUpload, saveUpload, sendStoredFile } from "../files.js";
import { ApiError, notFound, parse, uuid } from "../http.js";
import { receiveFile } from "../upload.js";

/**
 * Messaging between a patient and the doctor who accepted their request, and between a doctor and
 * the administration. Mounted at the API root. Delivery is by polling (no WebSocket yet).
 */
export const messagingRouter = Router();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const MAX_MESSAGE_LENGTH = 2000;
const ADMIN_NAME = "Carewell administration";

const signedIn = requireRole("patient", "doctor", "admin");
messagingRouter.use(["/conversations", "/attachments"], signedIn);

const conversationInclude = { doctor: { include: { user: true } }, patient: true };

// ── Who may see a conversation, and whether they may write in it ──────────────────────────
function isParticipant(conversation, user) {
  if (user.role === "patient") return conversation.kind === "patient_doctor" && conversation.patientId === user.id;
  if (user.role === "doctor") return conversation.doctorId === user.doctor?.id;
  return conversation.kind === "doctor_admin"; // administrators see the doctor↔administration threads
}

/** The conversation, or 404 (also for someone else's, so ids cannot be probed). */
async function loadConversation(id, user) {
  const conversation = await prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
  if (!conversation || !isParticipant(conversation, user)) throw notFound("This conversation");
  return conversation;
}

/** Patient↔doctor threads need an accepted request between the two; the administration thread is always open. */
const canWrite = async (conversation) =>
  conversation.kind === "doctor_admin" ||
  Boolean(
    await prisma.appointment.findFirst({
      where: { doctorId: conversation.doctorId, patientId: conversation.patientId, status: { in: ["accepted", "completed"] } },
      select: { id: true },
    }),
  );

async function assertCanWrite(conversation) {
  if (!(await canWrite(conversation)))
    throw new ApiError(403, "MESSAGING_NOT_ELIGIBLE", "Messaging is available only after the doctor accepts an appointment request.");
}

/** Messages that are "from the other side" for this viewer, still unread. */
const unreadWhere = (user) => ({
  readAt: null,
  ...(user.role === "admin" ? { sender: { role: { not: "admin" } } } : { senderId: { not: user.id } }),
});

// ── Shapes ────────────────────────────────────────────────────────────────────────────────
function participantFor(conversation, user) {
  if (user.role === "patient" || user.role === "admin")
    return {
      participantId: conversation.doctor.id,
      participantRole: "doctor",
      participantName: conversation.doctor.user.name,
      participantImage: conversation.doctor.image ?? "",
    };
  if (conversation.kind === "doctor_admin")
    return { participantId: "administration", participantRole: "admin", participantName: ADMIN_NAME, participantImage: "" };
  return {
    participantId: conversation.patient.id,
    participantRole: "patient",
    participantName: conversation.patient.name,
    participantImage: "",
  };
}

const attachmentUrl = (id) => `/api/v1/attachments/${id}`;

function toMessage(message, user) {
  const [file] = message.attachments ?? [];
  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: message.sender.role,
    isMine: user.role === "admin" ? message.sender.role === "admin" : message.senderId === user.id,
    body: message.body,
    sentAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString(),
    ...(file ? { attachmentUrl: attachmentUrl(file.id), attachmentName: file.fileName } : {}),
  };
}

const messageInclude = { sender: { select: { role: true } }, attachments: true };

/** Finds the doctor↔administration thread, creating it the first time. */
async function ensureAdminThread(doctorId) {
  const find = () => prisma.conversation.findFirst({ where: { kind: "doctor_admin", doctorId }, include: conversationInclude });
  const existing = await find();
  if (existing) return existing;
  try {
    return await prisma.conversation.create({ data: { kind: "doctor_admin", doctorId }, include: conversationInclude });
  } catch (error) {
    if (error?.code === "P2002") return find(); // another request created it first
    throw error;
  }
}

/** Conversations as the contract describes them, newest activity first, with unread counts. */
async function describeConversations(conversations, user) {
  const ids = conversations.map((item) => item.id);
  const [latest, unread, writable] = await Promise.all([
    ids.length
      ? prisma.message.findMany({ where: { conversationId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["conversationId"], select: { conversationId: true, createdAt: true } })
      : [],
    ids.length
      ? prisma.message.groupBy({ by: ["conversationId"], where: { conversationId: { in: ids }, ...unreadWhere(user) }, _count: { _all: true } })
      : [],
    Promise.all(conversations.map(canWrite)),
  ]);
  const lastAt = new Map(latest.map((row) => [row.conversationId, row.createdAt]));
  const unreadBy = new Map(unread.map((row) => [row.conversationId, row._count._all]));

  return conversations
    .map((conversation, index) => ({
      id: conversation.id,
      ...participantFor(conversation, user),
      updatedAt: (lastAt.get(conversation.id) ?? conversation.createdAt).toISOString(),
      unread: unreadBy.get(conversation.id) ?? 0,
      canMessage: writable[index],
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ── Conversations ─────────────────────────────────────────────────────────────────────────
messagingRouter.get("/conversations", async (request, response) => {
  const user = request.user;
  let where;
  if (user.role === "patient") where = { kind: "patient_doctor", patientId: user.id };
  else if (user.role === "doctor") {
    if (!user.doctor?.id) throw notFound("Your doctor profile");
    await ensureAdminThread(user.doctor.id);
    where = { doctorId: user.doctor.id };
  } else where = { kind: "doctor_admin" };

  const conversations = await prisma.conversation.findMany({ where, include: conversationInclude });
  response.json(await describeConversations(conversations, user));
});

/** GET /conversations/unread-count: the number for the navigation badge. */
messagingRouter.get("/conversations/unread-count", async (request, response) => {
  const user = request.user;
  const conversations = await prisma.conversation.findMany({
    where:
      user.role === "patient"
        ? { kind: "patient_doctor", patientId: user.id }
        : user.role === "doctor"
          ? { doctorId: user.doctor?.id ?? "" }
          : { kind: "doctor_admin" },
    select: { id: true },
  });
  const count = await prisma.message.count({ where: { conversationId: { in: conversations.map((item) => item.id) }, ...unreadWhere(user) } });
  response.json({ count });
});

/** POST /conversations { doctorId } (administrators): opens the thread with a doctor if there is none yet. */
messagingRouter.post("/conversations", requireRole("admin"), async (request, response) => {
  const { doctorId } = parse(z.object({ doctorId: z.string().uuid("Choose a doctor.") }), request.body);
  if (!(await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } }))) throw notFound("This doctor profile");
  const thread = await ensureAdminThread(doctorId);
  const [described] = await describeConversations([thread], request.user);
  response.status(201).json(described);
});

// ── Messages ──────────────────────────────────────────────────────────────────────────────
/** GET /conversations/:id/messages: the latest 200, oldest first. Reading marks the other side's messages as read. */
messagingRouter.get("/conversations/:id/messages", async (request, response) => {
  const conversation = await loadConversation(uuid(request.params.id, "This conversation"), request.user);
  await assertCanWrite(conversation);

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: messageInclude,
  });
  const result = messages.reverse().map((message) => toMessage(message, request.user));
  await prisma.message.updateMany({ where: { conversationId: conversation.id, ...unreadWhere(request.user) }, data: { readAt: new Date() } });
  response.json(result);
});

const messageSchema = z.object({
  body: z.string().trim().min(1, "Enter a message.").max(MAX_MESSAGE_LENGTH, `Messages can have at most ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`),
});

messagingRouter.post("/conversations/:id/messages", async (request, response) => {
  const conversation = await loadConversation(uuid(request.params.id, "This conversation"), request.user);
  await assertCanWrite(conversation);
  rateLimit(`message:${request.user.id}`, 60, MINUTE, "You are sending messages too quickly. Please wait a moment.");
  const { body } = parse(messageSchema, request.body);

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: request.user.id, body },
    include: messageInclude,
  });
  response.status(201).json(toMessage(message, request.user));
});

/** POST /conversations/:id/attachments (multipart field `file`): a PDF or image up to 10 MB, sent as a message. */
messagingRouter.post(
  "/conversations/:id/attachments",
  receiveFile({ maxBytes: MAX_FILE_BYTES, types: ATTACHMENT_TYPES }),
  async (request, response) => {
    const conversation = await loadConversation(uuid(request.params.id, "This conversation"), request.user);
    await assertCanWrite(conversation);
    rateLimit(`attachment:${request.user.id}`, 20, HOUR, "You have uploaded many files. Please try again later.");

    const stored = await saveUpload(`attachments/${conversation.id}`, request.file);
    try {
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: request.user.id,
          body: "",
          attachments: { create: { storageKey: stored.storageKey, fileName: stored.fileName, fileType: stored.fileType, fileSize: stored.fileSize } },
        },
        include: messageInclude,
      });
      response.status(201).json(toMessage(message, request.user));
    } catch (error) {
      await discardUpload(stored.storageKey);
      throw error;
    }
  },
);

/** GET /attachments/:id: only the people in that conversation can open the file. */
messagingRouter.get("/attachments/:id", async (request, response) => {
  const attachment = await prisma.messageAttachment.findUnique({
    where: { id: uuid(request.params.id, "This file") },
    include: { message: { include: { conversation: true } } },
  });
  if (!attachment || !isParticipant(attachment.message.conversation, request.user)) throw notFound("This file");
  await sendStoredFile(response, attachment, { inline: true });
});
