import type { Express } from "express";
import { parseOrder, DEFAULT_OPENAI_MODEL, DEFAULT_ANTHROPIC_MODEL } from "./llm.js";
import { buildXlsmBuffer, XLSM_MIME, XLSM_FILENAME } from "./xlsm.js";
import { generateRequestSchema } from "../shared/schema.js";

/**
 * Register the API routes on an Express app.
 *
 * NOTE: This module is intentionally free of any database / better-sqlite3
 * dependency so it can run unchanged inside a Vercel serverless function.
 * Settings are client-session only (sent in the request body); there is no
 * server-side persistence and no in-memory download store.
 */
export function registerRoutes(app: Express): Express {
  // --- Generate -----------------------------------------------------------
  app.post("/api/generate", async (req, res) => {
    const parsed = generateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const body = parsed.data;

    // Resolve effective settings purely from the request body (no server DB).
    const provider = body.provider ?? "demo";
    const token = body.token ?? "";
    const systemContext = body.systemContext ?? "";
    let model = body.model ?? "";
    if (!model) {
      model = provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL;
    }

    try {
      const { table, usedDemo } = await parseOrder({
        provider,
        token,
        model,
        systemContext,
        input: body.input,
        instructions: body.instructions ?? "",
      });

      const buffer = buildXlsmBuffer(table);

      res.json({
        // Return the workbook inline as base64 so the client can download it
        // via a data-URI anchor — works on Vercel serverless (no persistent
        // server, no in-memory store) and in sandboxed iframes alike.
        fileBase64: buffer.toString("base64"),
        fileName: XLSM_FILENAME,
        mimeType: XLSM_MIME,
        columns: table.columns,
        rows: table.rows,
        usedDemo,
        rowCount: table.rows.length,
      });
    } catch (err: any) {
      res.status(502).json({ error: err?.message ?? "Failed to generate spreadsheet" });
    }
  });

  return app;
}
