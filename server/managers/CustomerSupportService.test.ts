import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerSupportService } from './CustomerSupportService';

describe('CustomerSupportService', () => {
  let service: CustomerSupportService;

  beforeEach(() => {
    service = new CustomerSupportService();
  });

  describe('createTicket', () => {
    it('should create a support ticket', () => {
      const ticket = service.createTicket('user1', 'Bug Report', 'App crashes', 'bug', 'high');

      expect(ticket).toBeDefined();
      expect(ticket.status).toBe('open');
      expect(ticket.ticketId).toMatch(/^TKT-/);
    });
  });

  describe('getTicket', () => {
    it('should retrieve a ticket', () => {
      const created = service.createTicket('user1', 'Subject', 'Description', 'support', 'medium');
      const retrieved = service.getTicket(created.ticketId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.subject).toBe('Subject');
    });
  });

  describe('getTicketsByStatus', () => {
    it('should retrieve tickets by status', () => {
      service.createTicket('user1', 'Ticket1', 'Desc1', 'bug', 'high');
      service.createTicket('user1', 'Ticket2', 'Desc2', 'feature', 'low');

      const open = service.getTicketsByStatus('open');
      expect(open.length).toBe(2);
    });
  });

  describe('assignTicket', () => {
    it('should assign a ticket', () => {
      const ticket = service.createTicket('user1', 'Subject', 'Desc', 'bug', 'high');
      const result = service.assignTicket(ticket.ticketId, 'support_agent');

      expect(result).toBe(true);

      const updated = service.getTicket(ticket.ticketId);
      expect(updated?.assignedTo).toBe('support_agent');
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('resolveTicket', () => {
    it('should resolve a ticket', () => {
      const ticket = service.createTicket('user1', 'Subject', 'Desc', 'bug', 'high');
      service.assignTicket(ticket.ticketId, 'agent');

      const result = service.resolveTicket(ticket.ticketId, 'Fixed in v1.1');

      expect(result).toBe(true);

      const updated = service.getTicket(ticket.ticketId);
      expect(updated?.status).toBe('resolved');
      expect(updated?.resolution).toBe('Fixed in v1.1');
    });
  });

  describe('createFAQ', () => {
    it('should create an FAQ', () => {
      const faq = service.createFAQ('How to use?', 'Click here', 'getting_started');

      expect(faq).toBeDefined();
      expect(faq.views).toBe(0);
      expect(faq.faqId).toMatch(/^FAQ-/);
    });
  });

  describe('getFAQ', () => {
    it('should retrieve an FAQ', () => {
      const created = service.createFAQ('Question?', 'Answer', 'support');
      const retrieved = service.getFAQ(created.faqId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.question).toBe('Question?');
    });
  });

  describe('getFAQsByCategory', () => {
    it('should retrieve FAQs by category', () => {
      service.createFAQ('Q1', 'A1', 'general');
      service.createFAQ('Q2', 'A2', 'general');
      service.createFAQ('Q3', 'A3', 'technical');

      const general = service.getFAQsByCategory('general');
      expect(general.length).toBe(2);
    });
  });

  describe('viewFAQ', () => {
    it('should increment FAQ views', () => {
      const faq = service.createFAQ('Q', 'A', 'cat');
      service.viewFAQ(faq.faqId);

      const updated = service.getFAQ(faq.faqId);
      expect(updated?.views).toBe(1);
    });
  });

  describe('markFAQHelpful', () => {
    it('should increment helpful count', () => {
      const faq = service.createFAQ('Q', 'A', 'cat');
      service.markFAQHelpful(faq.faqId);

      const updated = service.getFAQ(faq.faqId);
      expect(updated?.helpful).toBe(1);
    });
  });

  describe('createFeedback', () => {
    it('should create feedback', () => {
      const feedback = service.createFeedback('user1', 'bug', 'Issue found', 3);

      expect(feedback).toBeDefined();
      expect(feedback.rating).toBe(3);
      expect(feedback.feedbackId).toMatch(/^FBK-/);
    });

    it('should clamp rating between 1 and 5', () => {
      const feedback = service.createFeedback('user1', 'general', 'Comment', 10);

      expect(feedback.rating).toBe(5);
    });
  });

  describe('getFeedback', () => {
    it('should retrieve feedback', () => {
      const created = service.createFeedback('user1', 'improvement', 'Suggestion', 4);
      const retrieved = service.getFeedback(created.feedbackId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Suggestion');
    });
  });

  describe('getFeedbackByType', () => {
    it('should retrieve feedback by type', () => {
      service.createFeedback('user1', 'bug', 'Bug1', 2);
      service.createFeedback('user2', 'bug', 'Bug2', 3);

      const bugs = service.getFeedbackByType('bug');
      expect(bugs.length).toBe(2);
    });
  });

  describe('getAllTickets', () => {
    it('should retrieve all tickets', () => {
      service.createTicket('user1', 'T1', 'D1', 'bug', 'high');
      service.createTicket('user2', 'T2', 'D2', 'feature', 'low');

      const all = service.getAllTickets();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllFAQs', () => {
    it('should retrieve all FAQs', () => {
      service.createFAQ('Q1', 'A1', 'cat1');
      service.createFAQ('Q2', 'A2', 'cat2');

      const all = service.getAllFAQs();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllFeedback', () => {
    it('should retrieve all feedback', () => {
      service.createFeedback('user1', 'bug', 'Feedback1', 3);
      service.createFeedback('user2', 'feature_request', 'Feedback2', 4);

      const all = service.getAllFeedback();
      expect(all.length).toBe(2);
    });
  });

  describe('getSupportStats', () => {
    it('should calculate support statistics', () => {
      service.createTicket('user1', 'T1', 'D1', 'bug', 'high');
      service.createFAQ('Q', 'A', 'cat');
      service.createFeedback('user1', 'bug', 'Feedback', 4);

      const stats = service.getSupportStats();

      expect(stats.totalTickets).toBe(1);
      expect(stats.totalFAQs).toBe(1);
      expect(stats.totalFeedback).toBe(1);
      expect(stats.averageRating).toBe(4);
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket', () => {
      const ticket = service.createTicket('user1', 'T', 'D', 'bug', 'high');
      const result = service.deleteTicket(ticket.ticketId);

      expect(result).toBe(true);
      expect(service.getTicket(ticket.ticketId)).toBeUndefined();
    });
  });

  describe('deleteFAQ', () => {
    it('should delete an FAQ', () => {
      const faq = service.createFAQ('Q', 'A', 'cat');
      const result = service.deleteFAQ(faq.faqId);

      expect(result).toBe(true);
      expect(service.getFAQ(faq.faqId)).toBeUndefined();
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback', () => {
      const feedback = service.createFeedback('user1', 'bug', 'Feedback', 3);
      const result = service.deleteFeedback(feedback.feedbackId);

      expect(result).toBe(true);
      expect(service.getFeedback(feedback.feedbackId)).toBeUndefined();
    });
  });
});
