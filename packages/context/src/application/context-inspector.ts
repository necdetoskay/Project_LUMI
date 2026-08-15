import type {
  ContextFinding,
  ContextManifest,
  ContextRequest,
  ContextScope,
  TokenUsage,
} from "../ports";

export interface ContextInspectorItem {
  id: string;
  type: string;
  text: string;
  sourceEngine: string;
  authority: number;
  confidence: number;
  scope: ContextScope;
  priority: number;
  relevance: number;
}

export interface ContextInspectorSection {
  name: string;
  priority: number;
  tokensUsed: number;
  truncated: boolean;
  itemCount: number;
  items: ContextInspectorItem[];
}

export interface ContextInspectorProjection {
  contentHash: string;
  request: ContextRequest;
  tokenUsage: TokenUsage;
  findings: ContextFinding[];
  sections: ContextInspectorSection[];
  summary: {
    sectionCount: number;
    itemCount: number;
    truncatedSectionCount: number;
    warningCount: number;
    errorCount: number;
  };
}

/**
 * Creates the read-only representation consumed by Context Inspector surfaces.
 * The manifest remains the source of truth; this projection intentionally does
 * not persist, enrich, or reinterpret context data.
 */
export function createContextInspectorProjection(
  manifest: ContextManifest,
): ContextInspectorProjection {
  const sections = manifest.sections.map((section) => ({
    name: section.name,
    priority: section.priority,
    tokensUsed: section.tokensUsed,
    truncated: section.truncated,
    itemCount: section.items.length,
    items: section.items.map((item) => ({
      id: item.id,
      type: item.type,
      text: item.text,
      sourceEngine: item.sourceEngine,
      authority: item.authority,
      confidence: item.confidence,
      scope: item.scope,
      priority: item.priority,
      relevance: item.relevance,
    })),
  }));

  return {
    contentHash: manifest.contentHash,
    request: manifest.request,
    tokenUsage: manifest.tokenUsage,
    findings: manifest.findings,
    sections,
    summary: {
      sectionCount: sections.length,
      itemCount: sections.reduce(
        (sum, section) => sum + section.itemCount,
        0,
      ),
      truncatedSectionCount: sections.filter((section) => section.truncated)
        .length,
      warningCount: manifest.findings.filter(
        (finding) => finding.severity === "warning",
      ).length,
      errorCount: manifest.findings.filter(
        (finding) => finding.severity === "error",
      ).length,
    },
  };
}
