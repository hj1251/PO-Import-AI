import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/lib/settings";
import { useTheme } from "@/lib/theme";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Logo } from "@/components/Logo";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Download,
  Loader2,
  ArrowUp,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

type GenerateResult = {
  fileBase64: string;
  fileName: string;
  mimeType: string;
  columns: string[];
  rows: Record<string, string | number>[];
  usedDemo: boolean;
  rowCount: number;
};

const SAMPLE = `PO: ACE-44821
Customer: Northwind Components Ltd
Address: Unit 5, Brookfield Industrial Estate
City: Leeds
Postcode: LS11 5BD
Country: United Kingdom
Tel: 0113 496 0021

BRK-DISC-205  front brake discs  x4  £38.50
WPR-BLD-22A   wiper blades qty 2  12.99
ALT-9912-RM   remanufactured alternator  1 x  189.00`;

export default function Home() {
  const { settings, loading: settingsLoading } = useSettings();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast({ title: "Nothing to import", description: "Paste your order details first." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/generate", {
        input: text,
        instructions: "",
        provider: settings.provider,
        token: settings.token,
        model: settings.model,
        systemContext: settings.systemContext,
      });
      const data: GenerateResult = await res.json();
      setResult(data);
      if (data.usedDemo && settings.provider !== "demo") {
        toast({
          title: "Used demo parsing",
          description: "No API token set, so a heuristic parser was used.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    // Build the file from the base64 returned inline by /api/generate using a
    // data-URI anchor. This avoids the blob/objectURL path and works on Vercel
    // (the deploy target); it generally works in the sandbox iframe too.
    const a = document.createElement("a");
    a.href = `data:${result.mimeType};base64,${result.fileBase64}`;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-7 text-foreground" />
          <div className="leading-tight">
            <div className="font-semibold text-sm">PO Importer</div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              Paste an order → download a clean spreadsheet
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            data-testid="button-theme-toggle"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            data-testid="button-open-settings"
            aria-label="Open settings"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col">
        {!result && (
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold tracking-tight">
              Turn a messy order into a ready-to-upload spreadsheet
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Paste purchase-order details copied from anywhere — email, a sheet, a photo.
              Add instructions in plain English if you like. We structure it and hand you an
              <span className="font-medium text-foreground"> .xlsm</span> in your standard format.
            </p>
          </div>
        )}

        {/* Composer */}
        <div className="relative rounded-2xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="input-order"
            placeholder="Paste your order details and add any instructions in English…"
            className="min-h-[180px] resize-y border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed p-4 pb-14"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
            }}
          />
          <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-normal gap-1">
                <Sparkles className="h-3 w-3" />
                {settingsLoading
                  ? "…"
                  : settings.provider === "openai"
                    ? "OpenAI"
                    : settings.provider === "anthropic"
                      ? "Claude"
                      : "Demo mode"}
              </Badge>
              <span className="hidden sm:inline">⌘/Ctrl + Enter to submit</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              data-testid="button-submit"
              size="sm"
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Working…
                </>
              ) : (
                <>
                  Submit <ArrowUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sample helper */}
        {!text && !result && (
          <button
            type="button"
            data-testid="button-load-sample"
            onClick={() => setText(SAMPLE)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground self-center hover-elevate rounded px-2 py-1"
          >
            Try it with a sample order
          </button>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8" data-testid="section-result">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-sm" data-testid="text-result-title">
                    Parsed {result.rowCount} {result.rowCount === 1 ? "row" : "rows"}
                    {result.usedDemo && (
                      <Badge variant="outline" className="ml-2 font-normal text-[10px]">
                        demo
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sheet “Purchase Order” · {result.columns.length} columns
                  </div>
                </div>
              </div>
              <Button onClick={handleDownload} data-testid="button-download" className="gap-1.5">
                <Download className="h-4 w-4" /> Download .xlsm
              </Button>
            </div>

            {/* Preview table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" data-testid="table-preview">
                  <thead>
                    <tr className="bg-muted/60">
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          className="text-left font-medium text-muted-foreground whitespace-nowrap px-3 py-2 border-b border-border"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover-elevate" data-testid={`row-preview-${i}`}>
                        {result.columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 border-b border-border whitespace-nowrap max-w-[220px] truncate"
                            title={String(row[col] ?? "")}
                          >
                            {row[col] === "" || row[col] === undefined ? (
                              <span className="text-muted-foreground/40">—</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              data-testid="button-new-import"
              onClick={() => {
                setResult(null);
                setText("");
              }}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground hover-elevate rounded px-2 py-1"
            >
              ← Start a new import
            </button>
          </div>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
