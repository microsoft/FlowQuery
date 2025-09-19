const path = require('path');

// Polyfill for environments that expect `self` to exist
if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

// Helper to send a message back to the parent (worker thread or forked child)
function sendMessage(obj) {
  try {
    // worker_threads
    const wt = require('worker_threads');
    if (wt && wt.parentPort) {
      wt.parentPort.postMessage(obj);
      return;
    }
  } catch {
    // ignore
  }

  // child_process
  if (process && typeof process.send === 'function') {
    process.send(obj);
  }
}

async function handleText(documentText) {
  try {
    // Test hook: if the document text begins with `__TEST_SLEEP__:<ms>` then simulate delay
    if (typeof documentText === 'string' && documentText.indexOf('__TEST_SLEEP__:') === 0) {
      const parts = documentText.split(':');
      const ms = parseInt(parts[1], 10) || 0;
      setTimeout(() => {
        sendMessage({ type: 'results', results: [{ expr0: `slept ${ms}ms` }] });
      }, ms);
      return;
    }
    const _FlowQueryModule = require(path.join(__dirname, 'flowQueryEngine', 'flowquery.min.js'));
    const FlowQuery = _FlowQueryModule && _FlowQueryModule.default ? _FlowQueryModule.default : _FlowQueryModule;
    const flowquery = new FlowQuery(documentText);
    await flowquery.run();
    sendMessage({ type: 'results', results: flowquery.results });
  } catch {
    sendMessage({ type: 'error', message: 'Unknown error' });
  }
}

// Support worker_threads
try {
  const { parentPort } = require('worker_threads');
  if (parentPort) {
    parentPort.on('message', (documentText) => {
      handleText(documentText);
    });
  } else {
    // fallback to child process API
    process.on('message', (documentText) => {
      handleText(documentText);
    });
  }
} catch {
  // If worker_threads isn't available, fallback
  process.on('message', (documentText) => {
    handleText(documentText);
  });
}
