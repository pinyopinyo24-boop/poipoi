/**
 * PoiPoi Presentation tRPC Router
 * PresentationAIManager統合API層
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { getPresentationAIManager, PresentationAIManager } from './managers/PresentationAIManager';
import { getPresentationRepository, PresentationRepository } from './managers/PresentationRepository';

// Validation Schemas
const CreatePresentationInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const UpdatePresentationInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const AddSlideInput = z.object({
  presentationId: z.string(),
  title: z.string().min(1),
  content: z.string(),
  layout: z.enum(['title', 'content', 'two-column', 'image-text', 'chart', 'table']),
  notes: z.string().optional(),
});

const UpdateSlideInput = z.object({
  presentationId: z.string(),
  slideId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  layout: z.enum(['title', 'content', 'two-column', 'image-text', 'chart', 'table']).optional(),
  notes: z.string().optional(),
});

const ExportInput = z.object({
  presentationId: z.string(),
  format: z.enum(['pptx', 'pdf', 'json']),
});

const GenerateNotesInput = z.object({
  slideTitle: z.string(),
  slideContent: z.string(),
  purpose: z.string().optional(),
});

const ApplyThemeInput = z.object({
  presentationId: z.string(),
  themeId: z.string(),
});

// Initialize managers
const repository = getPresentationRepository();
const manager = new PresentationAIManager(repository);

export const presentationRouter = router({
  create: publicProcedure
    .input(CreatePresentationInput)
    .mutation(({ input }) => {
      try {
        const presentation = manager.createPresentation(input.title, input.description || '');
        return { success: true, data: presentation };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      try {
        const presentation = manager.getPresentation(input.id);
        if (!presentation) {
          return { success: false, error: 'Presentation not found' };
        }
        return { success: true, data: presentation };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  list: publicProcedure
    .query(() => {
      try {
        const presentations = manager.getAllPresentations();
        return { success: true, data: presentations };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  update: publicProcedure
    .input(UpdatePresentationInput)
    .mutation(({ input }) => {
      try {
        const updated = manager.updatePresentation(input.id, {
          title: input.title,
          description: input.description,
          metadata: input.metadata,
        } as any);
        if (!updated) {
          return { success: false, error: 'Presentation not found' };
        }
        return { success: true, data: updated };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      try {
        const deleted = manager.deletePresentation(input.id);
        return { success: deleted, error: deleted ? undefined : 'Presentation not found' };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  generate: publicProcedure
    .input(z.object({ presentationId: z.string(), slideCount: z.number().min(1).max(50) }))
    .mutation(({ input }) => {
      try {
        const result = manager.generateWithAI(input.presentationId, input.slideCount);
        if (!result) {
          return { success: false, error: 'Presentation not found' };
        }
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  addSlide: publicProcedure
    .input(AddSlideInput)
    .mutation(({ input }) => {
      try {
        const slide = manager.addSlide(input.presentationId, {
          title: input.title,
          content: input.content,
          layout: input.layout,
          notes: input.notes,
          elements: [],
        });
        if (!slide) {
          return { success: false, error: 'Presentation not found' };
        }
        return { success: true, data: slide };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  updateSlide: publicProcedure
    .input(UpdateSlideInput)
    .mutation(({ input }) => {
      try {
        const slide = manager.updateSlide(input.presentationId, input.slideId, {
          title: input.title,
          content: input.content,
          layout: input.layout,
          notes: input.notes,
        } as any);
        if (!slide) {
          return { success: false, error: 'Slide not found' };
        }
        return { success: true, data: slide };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  deleteSlide: publicProcedure
    .input(z.object({ presentationId: z.string(), slideId: z.string() }))
    .mutation(({ input }) => {
      try {
        const deleted = manager.removeSlide(input.presentationId, input.slideId);
        return { success: deleted, error: deleted ? undefined : 'Slide not found' };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  export: publicProcedure
    .input(ExportInput)
    .query(({ input }) => {
      try {
        let result: Buffer | string | null = null;
        if (input.format === 'pptx') {
          result = manager.exportPowerPoint(input.presentationId);
        } else if (input.format === 'pdf') {
          result = manager.exportPDF(input.presentationId);
        } else if (input.format === 'json') {
          result = manager.exportJSON(input.presentationId);
        }

        if (!result) {
          return { success: false, error: 'Presentation not found' };
        }

        return {
          success: true,
          data: {
            format: input.format,
            size: typeof result === 'string' ? result.length : result.length,
          },
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  import: publicProcedure
    .input(z.object({ json: z.string() }))
    .mutation(({ input }) => {
      try {
        const presentation = manager.importJSON(input.json);
        if (!presentation) {
          return { success: false, error: 'Invalid JSON format' };
        }
        return { success: true, data: presentation };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  getNotes: publicProcedure
    .input(z.object({ presentationId: z.string() }))
    .query(({ input }) => {
      try {
        const notes = manager.getNotes(input.presentationId);
        return { success: true, data: notes };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  generateNotes: publicProcedure
    .input(GenerateNotesInput)
    .query(({ input }) => {
      try {
        return {
          success: true,
          data: {
            content: `スライド「${input.slideTitle}」について説明します。\n\n${input.slideContent}`,
            duration: Math.ceil((input.slideContent.split(/\s+/).length * 0.5)),
          },
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  getThemes: publicProcedure
    .query(() => {
      try {
        return {
          success: true,
          data: [
            { id: 'professional', name: 'Professional' },
            { id: 'creative', name: 'Creative' },
            { id: 'minimal', name: 'Minimal' },
            { id: 'corporate', name: 'Corporate' },
            { id: 'dark', name: 'Dark' },
          ],
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  applyTheme: publicProcedure
    .input(ApplyThemeInput)
    .mutation(({ input }) => {
      try {
        const presentation = manager.getPresentation(input.presentationId);
        if (!presentation) {
          return { success: false, error: 'Presentation not found' };
        }

        const updated = manager.updatePresentation(input.presentationId, {
          metadata: {
            ...presentation.metadata,
            themeId: input.themeId,
          },
        } as any);

        return { success: true, data: updated };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => {
      try {
        const results = manager.search(input.query);
        return { success: true, data: results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  getStats: publicProcedure
    .query(() => {
      try {
        const stats = manager.getStatistics();
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),
});
