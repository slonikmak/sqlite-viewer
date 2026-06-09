// Silence Node's "SQLite is an experimental feature" ExperimentalWarning emitted
// by node:sqlite. Must be imported before any module that loads node:sqlite.
const originalEmitWarning = process.emitWarning.bind(process);

process.emitWarning = ((warning: any, ...args: any[]) => {
  const name = typeof warning === 'object' && warning !== null ? warning.name : args[0];
  const message = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (name === 'ExperimentalWarning' && /sqlite/i.test(message)) {
    return;
  }
  return originalEmitWarning(warning, ...args);
}) as typeof process.emitWarning;
