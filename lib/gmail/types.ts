export interface EmailAddress {
  name?: string;
  email: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  snippet: string;
  body: { text?: string; html?: string };
  isRead: boolean;
  labels: string[];
}

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
  subject: string;
  snippet: string;
  lastMessageDate: Date;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
}

export interface ListOptions {
  query?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

export interface ListResult {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailProvider {
  listMessages(options: ListOptions): Promise<ListResult>;
  getMessage(messageId: string): Promise<GmailMessage>;
  getThread(threadId: string): Promise<GmailThread>;
  sendMessage(params: SendEmailParams): Promise<GmailMessage>;
  getProfile(): Promise<{ emailAddress: string; messagesTotal: number }>;
}
