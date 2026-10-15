import { http, segment } from "../http/httpClient.js";

export const messagingService = {
  listConversations: () => http.get("/conversations"),
  listMessages: (conversationId) => http.get(`/conversations/${segment(conversationId)}/messages`),
  sendMessage: (conversationId, body) =>
    http.post(`/conversations/${segment(conversationId)}/messages`, { body }),
  sendAttachment(conversationId, file) {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/conversations/${segment(conversationId)}/attachments`, form);
  },
};
