/**
 * CustomerSupportService
 * カスタマーサポート・問い合わせ・FAQ管理
 */

export interface SupportTicket {
  ticketId: string;
  userId: string;
  timestamp: number;
  subject: string;
  description: string;
  category: 'bug' | 'feature' | 'support' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  resolvedAt?: number;
  resolution?: string;
}

export interface FAQItem {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpful: number;
  unhelpful: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserFeedback {
  feedbackId: string;
  userId: string;
  timestamp: number;
  type: 'bug' | 'feature_request' | 'improvement' | 'general';
  content: string;
  rating: number;
  status: 'new' | 'reviewed' | 'implemented' | 'closed';
}

export class CustomerSupportService {
  private tickets: Map<string, SupportTicket> = new Map();
  private faqs: Map<string, FAQItem> = new Map();
  private feedback: Map<string, UserFeedback> = new Map();
  private ticketsByStatus: Map<string, string[]> = new Map();
  private faqsByCategory: Map<string, string[]> = new Map();
  private feedbackByType: Map<string, string[]> = new Map();

  /**
   * サポートチケットを作成
   */
  createTicket(
    userId: string,
    subject: string,
    description: string,
    category: 'bug' | 'feature' | 'support' | 'billing' | 'other',
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): SupportTicket {
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const ticket: SupportTicket = {
      ticketId,
      userId,
      timestamp: Date.now(),
      subject,
      description,
      category,
      priority,
      status: 'open',
    };

    this.tickets.set(ticketId, ticket);

    if (!this.ticketsByStatus.has('open')) {
      this.ticketsByStatus.set('open', []);
    }
    this.ticketsByStatus.get('open')!.push(ticketId);

    return ticket;
  }

  /**
   * チケットを取得
   */
  getTicket(ticketId: string): SupportTicket | undefined {
    return this.tickets.get(ticketId);
  }

  /**
   * ステータス別チケットを取得
   */
  getTicketsByStatus(status: 'open' | 'in_progress' | 'resolved' | 'closed'): SupportTicket[] {
    const ids = this.ticketsByStatus.get(status) || [];
    return ids
      .map(id => this.tickets.get(id))
      .filter((t): t is SupportTicket => t !== undefined);
  }

  /**
   * チケットを割り当て
   */
  assignTicket(ticketId: string, assignedTo: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    ticket.assignedTo = assignedTo;
    ticket.status = 'in_progress';

    const openIds = this.ticketsByStatus.get('open') || [];
    const index = openIds.indexOf(ticketId);
    if (index > -1) {
      openIds.splice(index, 1);
    }

    if (!this.ticketsByStatus.has('in_progress')) {
      this.ticketsByStatus.set('in_progress', []);
    }
    this.ticketsByStatus.get('in_progress')!.push(ticketId);

    return true;
  }

  /**
   * チケットを解決
   */
  resolveTicket(ticketId: string, resolution: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    const inProgressIds = this.ticketsByStatus.get('in_progress') || [];
    const index = inProgressIds.indexOf(ticketId);
    if (index > -1) {
      inProgressIds.splice(index, 1);
    }

    ticket.status = 'resolved';
    ticket.resolution = resolution;
    ticket.resolvedAt = Date.now();

    if (!this.ticketsByStatus.has('resolved')) {
      this.ticketsByStatus.set('resolved', []);
    }
    this.ticketsByStatus.get('resolved')!.push(ticketId);

    return true;
  }

  /**
   * FAQを作成
   */
  createFAQ(question: string, answer: string, category: string): FAQItem {
    const faqId = `FAQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const faq: FAQItem = {
      faqId,
      question,
      answer,
      category,
      views: 0,
      helpful: 0,
      unhelpful: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.faqs.set(faqId, faq);

    if (!this.faqsByCategory.has(category)) {
      this.faqsByCategory.set(category, []);
    }
    this.faqsByCategory.get(category)!.push(faqId);

    return faq;
  }

  /**
   * FAQを取得
   */
  getFAQ(faqId: string): FAQItem | undefined {
    return this.faqs.get(faqId);
  }

  /**
   * カテゴリ別FAQを取得
   */
  getFAQsByCategory(category: string): FAQItem[] {
    const ids = this.faqsByCategory.get(category) || [];
    return ids
      .map(id => this.faqs.get(id))
      .filter((f): f is FAQItem => f !== undefined);
  }

  /**
   * FAQを表示
   */
  viewFAQ(faqId: string): boolean {
    const faq = this.faqs.get(faqId);
    if (!faq) return false;

    faq.views++;
    faq.updatedAt = Date.now();

    return true;
  }

  /**
   * FAQを役立つとマーク
   */
  markFAQHelpful(faqId: string): boolean {
    const faq = this.faqs.get(faqId);
    if (!faq) return false;

    faq.helpful++;
    faq.updatedAt = Date.now();

    return true;
  }

  /**
   * ユーザーフィードバックを作成
   */
  createFeedback(
    userId: string,
    type: 'bug' | 'feature_request' | 'improvement' | 'general',
    content: string,
    rating: number
  ): UserFeedback {
    const feedbackId = `FBK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const userFeedback: UserFeedback = {
      feedbackId,
      userId,
      timestamp: Date.now(),
      type,
      content,
      rating: Math.min(5, Math.max(1, rating)),
      status: 'new',
    };

    this.feedback.set(feedbackId, userFeedback);

    if (!this.feedbackByType.has(type)) {
      this.feedbackByType.set(type, []);
    }
    this.feedbackByType.get(type)!.push(feedbackId);

    return userFeedback;
  }

  /**
   * フィードバックを取得
   */
  getFeedback(feedbackId: string): UserFeedback | undefined {
    return this.feedback.get(feedbackId);
  }

  /**
   * タイプ別フィードバックを取得
   */
  getFeedbackByType(type: 'bug' | 'feature_request' | 'improvement' | 'general'): UserFeedback[] {
    const ids = this.feedbackByType.get(type) || [];
    return ids
      .map(id => this.feedback.get(id))
      .filter((f): f is UserFeedback => f !== undefined);
  }

  /**
   * 全チケットを取得
   */
  getAllTickets(): SupportTicket[] {
    return Array.from(this.tickets.values());
  }

  /**
   * 全FAQを取得
   */
  getAllFAQs(): FAQItem[] {
    return Array.from(this.faqs.values());
  }

  /**
   * 全フィードバックを取得
   */
  getAllFeedback(): UserFeedback[] {
    return Array.from(this.feedback.values());
  }

  /**
   * サポート統計を計算
   */
  getSupportStats(): {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    totalFAQs: number;
    totalFeedback: number;
    averageRating: number;
  } {
    const allTickets = Array.from(this.tickets.values());
    const resolvedTickets = allTickets.filter(t => t.status === 'resolved');
    const allFeedback = Array.from(this.feedback.values());

    let totalResolutionTime = 0;
    for (const ticket of resolvedTickets) {
      if (ticket.resolvedAt) {
        totalResolutionTime += ticket.resolvedAt - ticket.timestamp;
      }
    }

    let totalRating = 0;
    for (const fb of allFeedback) {
      totalRating += fb.rating;
    }

    return {
      totalTickets: allTickets.length,
      openTickets: this.ticketsByStatus.get('open')?.length || 0,
      resolvedTickets: resolvedTickets.length,
      averageResolutionTime:
        resolvedTickets.length > 0 ? totalResolutionTime / resolvedTickets.length : 0,
      totalFAQs: this.faqs.size,
      totalFeedback: allFeedback.length,
      averageRating: allFeedback.length > 0 ? totalRating / allFeedback.length : 0,
    };
  }

  /**
   * チケットを削除
   */
  deleteTicket(ticketId: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    const statusIds = this.ticketsByStatus.get(ticket.status) || [];
    const index = statusIds.indexOf(ticketId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.tickets.delete(ticketId);
    return true;
  }

  /**
   * FAQを削除
   */
  deleteFAQ(faqId: string): boolean {
    const faq = this.faqs.get(faqId);
    if (!faq) return false;

    const categoryIds = this.faqsByCategory.get(faq.category) || [];
    const index = categoryIds.indexOf(faqId);
    if (index > -1) {
      categoryIds.splice(index, 1);
    }

    this.faqs.delete(faqId);
    return true;
  }

  /**
   * フィードバックを削除
   */
  deleteFeedback(feedbackId: string): boolean {
    const fb = this.feedback.get(feedbackId);
    if (!fb) return false;

    const typeIds = this.feedbackByType.get(fb.type) || [];
    const index = typeIds.indexOf(feedbackId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.feedback.delete(feedbackId);
    return true;
  }
}
