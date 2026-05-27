import { apiFetch } from "./api";

export type ConversationUser = {
  id: string;
  verificationLevel: number;
  trustTier: string | null;
  isBusiness: boolean;
};

export type ConversationListing = {
  id: string;
  title: string;
  price: number;
  status: string;
} | null;

export type ConversationMessagePreview = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
};

export type Conversation = {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string | null;
  organizationId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  listing: ConversationListing;
  buyer: ConversationUser;
  seller: ConversationUser;
  messages: ConversationMessagePreview[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export async function getConversations(accessToken: string): Promise<Conversation[]> {
  const result = await apiFetch<{ conversations: Conversation[] }>("/conversations", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return result.conversations;
}

export async function getConversationMessages(
  accessToken: string,
  conversationId: string
): Promise<Message[]> {
  const result = await apiFetch<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return result.messages;
}

export async function sendMessage(
  accessToken: string,
  conversationId: string,
  body: string
): Promise<Message> {
  const result = await apiFetch<{ message: Message }>("/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      conversationId,
      body
    })
  });

  return result.message;
}
