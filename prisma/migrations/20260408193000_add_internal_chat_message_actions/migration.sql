-- Add reply/forward/delete metadata to internal chat messages
ALTER TABLE "internal_chat_messages" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "internal_chat_messages" ADD COLUMN "forwardedFromId" TEXT;
ALTER TABLE "internal_chat_messages" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "internal_chat_messages" ADD COLUMN "deletedById" TEXT;

-- Reactions table (1 reaction per user per message, emoji can be changed)
CREATE TABLE "internal_chat_message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_chat_message_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "internal_chat_message_reactions_messageId_userId_key"
ON "internal_chat_message_reactions"("messageId", "userId");

CREATE INDEX "internal_chat_message_reactions_messageId_idx"
ON "internal_chat_message_reactions"("messageId");

ALTER TABLE "internal_chat_messages"
ADD CONSTRAINT "internal_chat_messages_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "internal_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "internal_chat_messages"
ADD CONSTRAINT "internal_chat_messages_forwardedFromId_fkey"
FOREIGN KEY ("forwardedFromId") REFERENCES "internal_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "internal_chat_messages"
ADD CONSTRAINT "internal_chat_messages_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "internal_chat_message_reactions"
ADD CONSTRAINT "internal_chat_message_reactions_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "internal_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_chat_message_reactions"
ADD CONSTRAINT "internal_chat_message_reactions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

