export const ULTEF_RESULTS = Object.freeze(['PASS', 'WARN', 'FAIL', 'BLOCKED']);

export function createScenario({ id, title, level, projectGate = null, seed = null }) {
  if (!id || !title || !level) throw new Error('ULTEF scenario requires id, title and level');

  const startedAt = new Date().toISOString();
  const setup = [];
  const timeline = [];
  const assertions = [];
  const stateDeltas = [];

  return {
    setup(label, value, metadata = {}) {
      setup.push({ label, value, metadata });
    },
    event(type, summary, data = {}) {
      timeline.push({ sequence: timeline.length + 1, at: new Date().toISOString(), type, summary, data });
    },
    assert(description, passed, expected = undefined, actual = undefined) {
      assertions.push({ description, passed: Boolean(passed), expected, actual });
    },
    delta(path, before, after, reason = null) {
      stateDeltas.push({ path, before, after, reason });
    },
    finish({ result, reason = null, blockedBy = null }) {
      if (!ULTEF_RESULTS.includes(result)) throw new Error(`Invalid ULTEF result: ${result}`);
      if (result === 'PASS' && assertions.some((item) => !item.passed)) {
        throw new Error('ULTEF scenario cannot PASS with failed assertions');
      }
      if (result === 'BLOCKED' && !blockedBy && !reason) {
        throw new Error('BLOCKED scenario requires blockedBy or reason');
      }
      const finishedAt = new Date().toISOString();
      return {
        schemaVersion: 1,
        id,
        title,
        level,
        projectGate,
        seed,
        startedAt,
        finishedAt,
        result,
        reason,
        blockedBy,
        setup,
        timeline,
        assertions,
        stateDeltas
      };
    }
  };
}

export function renderNarrative(report) {
  const lines = [`# ${report.id} — ${report.title}`, '', `Result: **${report.result}**`, `Level: ${report.level}`];
  if (report.projectGate) lines.push(`Project gate: ${report.projectGate}`);
  if (report.reason) lines.push(`Reason: ${report.reason}`);
  if (report.blockedBy) lines.push(`Blocked by: ${report.blockedBy}`);

  lines.push('', '## Setup');
  for (const item of report.setup) lines.push(`- ${item.label}: ${format(item.value)}`);

  lines.push('', '## What happened');
  for (const item of report.timeline) lines.push(`${String(item.sequence).padStart(2, '0')}. ${item.summary}`);

  lines.push('', '## Assertions');
  for (const item of report.assertions) {
    const mark = item.passed ? 'PASS' : 'FAIL';
    lines.push(`- [${mark}] ${item.description}${comparison(item)}`);
  }

  lines.push('', '## State changes');
  if (report.stateDeltas.length === 0) lines.push('- No recorded state delta.');
  for (const item of report.stateDeltas) {
    lines.push(`- ${item.path}: ${format(item.before)} -> ${format(item.after)}${item.reason ? ` (${item.reason})` : ''}`);
  }

  return `${lines.join('\n')}\n`;
}

function comparison(item) {
  if (item.expected === undefined && item.actual === undefined) return '';
  return ` — expected=${format(item.expected)}, actual=${format(item.actual)}`;
}

function format(value) {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}
