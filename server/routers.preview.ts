import { protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { documentPreviewService } from './_core/documentPreview';

/**
 * Document Preview Router
 * Excel、PowerPoint、Wordのプレビューと微調整機能
 */

export const previewRouter = router({
  // ============================================================================
  // Excel Preview
  // ============================================================================

  excelGeneratePreview: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        topic: z.string(),
        rows: z.number().default(10),
        columns: z.number().default(5),
      })
    )
    .mutation(async ({ input }) => {
      const preview = await documentPreviewService.generateExcelPreview(input);
      return preview;
    }),

  excelUpdatePreview: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        updates: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updated = await documentPreviewService.updatePreviewContent('excel', input.preview, input.updates);
      return updated;
    }),

  excelValidatePreview: protectedProcedure
    .input(z.object({ preview: z.any() }))
    .mutation(async ({ input }) => {
      const validation = await documentPreviewService.validatePreview('excel', input.preview);
      return validation;
    }),

  excelAddSheet: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sheetName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('excel', input.preview, {
        addSheet: input.sheetName,
      });
      return updated;
    }),

  excelAddRow: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sheetIndex: z.number(),
        rowData: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('excel', input.preview, {
        addRow: { sheetIndex: input.sheetIndex, data: input.rowData },
      });
      return updated;
    }),

  excelEditCell: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sheetIndex: z.number(),
        rowIndex: z.number(),
        cellIndex: z.number(),
        value: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('excel', input.preview, {
        editCell: {
          sheetIndex: input.sheetIndex,
          rowIndex: input.rowIndex,
          cellIndex: input.cellIndex,
          value: input.value,
        },
      });
      return updated;
    }),

  // ============================================================================
  // PowerPoint Preview
  // ============================================================================

  powerpointGeneratePreview: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        topic: z.string(),
        slides: z.number().default(5),
        theme: z.string().default('modern'),
      })
    )
    .mutation(async ({ input }) => {
      const preview = await documentPreviewService.generatePowerPointPreview(input);
      return preview;
    }),

  powerpointUpdatePreview: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        updates: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updated = await documentPreviewService.updatePreviewContent('powerpoint', input.preview, input.updates);
      return updated;
    }),

  powerpointValidatePreview: protectedProcedure
    .input(z.object({ preview: z.any() }))
    .mutation(async ({ input }) => {
      const validation = await documentPreviewService.validatePreview('powerpoint', input.preview);
      return validation;
    }),

  powerpointAddSlide: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        title: z.string(),
        layout: z.enum(['title', 'content', 'two-column', 'blank']),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('powerpoint', input.preview, {
        addSlide: { title: input.title, layout: input.layout },
      });
      return updated;
    }),

  powerpointEditSlide: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        slideIndex: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('powerpoint', input.preview, {
        editSlide: {
          slideIndex: input.slideIndex,
          title: input.title,
          content: input.content,
          notes: input.notes,
        },
      });
      return updated;
    }),

  powerpointDeleteSlide: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        slideIndex: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('powerpoint', input.preview, {
        deleteSlide: input.slideIndex,
      });
      return updated;
    }),

  powerpointChangeTheme: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        theme: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('powerpoint', input.preview, {
        theme: input.theme,
      });
      return updated;
    }),

  // ============================================================================
  // Word Preview
  // ============================================================================

  wordGeneratePreview: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        topic: z.string(),
        sections: z.number().default(3),
      })
    )
    .mutation(async ({ input }) => {
      const preview = await documentPreviewService.generateWordPreview(input);
      return preview;
    }),

  wordUpdatePreview: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        updates: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updated = await documentPreviewService.updatePreviewContent('word', input.preview, input.updates);
      return updated;
    }),

  wordValidatePreview: protectedProcedure
    .input(z.object({ preview: z.any() }))
    .mutation(async ({ input }) => {
      const validation = await documentPreviewService.validatePreview('word', input.preview);
      return validation;
    }),

  wordAddSection: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        heading: z.string(),
        level: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('word', input.preview, {
        addSection: { heading: input.heading, level: input.level },
      });
      return updated;
    }),

  wordEditSection: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sectionIndex: z.number(),
        heading: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('word', input.preview, {
        editSection: {
          sectionIndex: input.sectionIndex,
          heading: input.heading,
          content: input.content,
        },
      });
      return updated;
    }),

  wordDeleteSection: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sectionIndex: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('word', input.preview, {
        deleteSection: input.sectionIndex,
      });
      return updated;
    }),

  wordAddParagraph: protectedProcedure
    .input(
      z.object({
        preview: z.any(),
        sectionIndex: z.number(),
        text: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await documentPreviewService.updatePreviewContent('word', input.preview, {
        addParagraph: { sectionIndex: input.sectionIndex, text: input.text },
      });
      return updated;
    }),
});
