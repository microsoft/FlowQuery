const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
// Ensure UMD bundles that reference `self` work in the Node-based test / extension host.
if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
	globalThis.self = globalThis;
}
// FlowQuery execution is performed in a dedicated worker (`flowquery-worker.js`);

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  const outputChannel = vscode.window.createOutputChannel('FlowQuery Results');
  // Expose the channel for tests to wrap/inspect if needed.
  module.exports._outputChannel = outputChannel;
  // Expose a slot for the currently running worker/process and a test helper to cancel it
  module.exports._lastWorker = null;
  module.exports._cancelCurrentlyRunningQuery = function() {
    try {
      const w = module.exports._lastWorker;
      if (!w) return false;
      const anyW = /** @type {any} */ (w);
      if (typeof anyW.terminate === 'function') {
        anyW.terminate();
      } else if (typeof anyW.kill === 'function') {
        anyW.kill();
      }
      module.exports._lastWorker = null;
      return true;
    } catch {
      return false;
    }
  };

  // activation

  async function runQueryOnDocument(documentText, documentPath) {
      // If a .env file exists next to the documentPath, substitute any $KEY
      // occurrences in the documentText with values from the .env file. Keys in
      // the .env file are plain (do not include the leading $); any $KEY tokens
      // in the query will be replaced with the corresponding value (raw, no
      // extra quoting is added).
      function applyEnvSubstitutions(text, docPath) {
        if (!docPath) return text;
        try {
          const dir = path.dirname(docPath);
          const envPath = path.join(dir, '.env');
          if (!fs.existsSync(envPath)) return text;
          const raw = fs.readFileSync(envPath, 'utf8');
          const map = Object.create(null);
          raw.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx === -1) return;
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            map[key] = val;
          });

          return text.replace(/\$([A-Za-z0-9_]+)/g, (match, key) => {
            if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
            return match; // leave unchanged if not found
          });
        } catch {
          try { module.exports._outputChannel && module.exports._outputChannel.appendLine && module.exports._outputChannel.appendLine('Warning: .env could not be read or parsed.'); } catch {}
          return text;
        }
      }

      // perform substitutions (no-op if documentPath is not provided or file doesn't exist)
      documentText = applyEnvSubstitutions(documentText, documentPath);
       try {
       // runQueryOnDocument started
         // Clear any previous output and show a running message while the query executes.
         outputChannel.clear();
         outputChannel.appendLine('Running FlowQuery statement. Please wait...');
         outputChannel.show(true);

       // running in worker instead of instantiating FlowQuery here
       let isCancelled = false;
       let workerResults = null;

       // Use VS Code's withProgress API for loading indicator and cancellation support
       await vscode.window.withProgress({
         location: vscode.ProgressLocation.Notification,
         title: 'Running FlowQuery statement...',
         cancellable: true
       }, async (progress, token) => {
        progress.report({ increment: 0 });

        token.onCancellationRequested(() => {
          isCancelled = true;
          outputChannel.appendLine('Query cancelled by user.');
          vscode.window.showInformationMessage('FlowQuery query cancelled.');
        });

        // Execute the FlowQuery inside a worker so it can be terminated on cancellation.
        workerResults = await new Promise(async (resolve, reject) => {
          // Try to use worker_threads first
          try {
            const { Worker } = require('worker_threads');
            const worker = new Worker(path.join(__dirname, 'flowquery-worker.js'));
            let settled = false;

            worker.on('message', (msg) => {
              if (settled) return;
              const m = /** @type {any} */ (msg);
              if (m && m.type === 'results') {
                settled = true;
                resolve(m.results);
              } else if (m && m.type === 'error') {
                settled = true;
                reject(new Error(m.message || 'Unknown error from worker'));
              }
            });

            worker.on('error', (err) => {
              if (!settled) {
                settled = true;
                reject(err);
              }
            });

            // ensure we clear the last worker ref when the worker exits
            worker.on('exit', (code) => {
              if (module.exports._lastWorker === worker) module.exports._lastWorker = null;
              if (!settled) {
                settled = true;
                if (code === 0) resolve(null);
                else reject(new Error(`Worker exited with code ${code}`));
              }
            });

            worker.postMessage(documentText);
            // documentText already had YAML substitutions applied earlier
            // expose worker to tests so they can cancel it programmatically
            module.exports._lastWorker = worker;

            token.onCancellationRequested(() => {
              isCancelled = true;
              try { worker.terminate(); } catch {}
              if (!settled) {
                settled = true;
                resolve(null);
              }
            });

          } catch {
            // Fallback to child process fork if worker_threads is unavailable
            try {
              const cp = require('child_process');
              const proc = cp.fork(path.join(__dirname, 'flowquery-worker.js'));
              let settled = false;

              proc.on('message', (msg) => {
                if (settled) return;
                const m = /** @type {any} */ (msg);
                if (m && m.type === 'results') {
                  settled = true;
                  resolve(m.results);
                } else if (m && m.type === 'error') {
                  settled = true;
                  reject(new Error(m.message || 'Unknown error from worker process'));
                }
              });

              proc.on('error', (err) => {
                if (!settled) {
                  settled = true;
                  reject(err);
                }
              });

              // ensure we clear the last worker ref when the process exits
              proc.on('exit', (code) => {
                if (module.exports._lastWorker === proc) module.exports._lastWorker = null;
                if (!settled) {
                  settled = true;
                  if (code === 0) resolve(null);
                  else reject(new Error(`Worker process exited with code ${code}`));
                }
              });

              proc.send(documentText);
              // documentText already had YAML substitutions applied earlier
               // expose forked process for tests
               module.exports._lastWorker = proc;

              token.onCancellationRequested(() => {
                isCancelled = true;
                try { proc.kill(); } catch {}
                if (!settled) {
                  settled = true;
                  resolve(null);
                }
              });

            } catch (err2) {
              reject(err2);
            }
          }
        });
      });

      if (isCancelled) {
        // If cancelled, don't show results.
        outputChannel.appendLine('Query was cancelled before completion.');
        // query cancelled
        return;
      }

      if (!workerResults) {
        outputChannel.appendLine('No results returned from worker.');
        vscode.window.showErrorMessage('No results returned from FlowQuery execution.');
        // no worker results
        return;
      }

      // have worker results
      // At this point the query has completed successfully; show results in a webview using drawTable
      const panel = vscode.window.createWebviewPanel(
        'flowqueryResults',
        'FlowQuery Results',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent(workerResults, panel.webview, context.extensionUri);

      // Handle messages posted from the webview (e.g. copy confirmation)
      panel.webview.onDidReceiveMessage(message => {
        try {
          if (message && message.command === 'copied') {
            vscode.window.showInformationMessage('Content copied to clipboard');
          }
        } catch {
          // swallow errors from message handling
        }
      });

      const resultString = JSON.stringify(workerResults, null, 2);
      outputChannel.clear();
      outputChannel.appendLine(resultString);
      outputChannel.show(true);
    } catch (e) {
      console.error(e);
      // Clear running message and show error details in the output channel as well as a popup.
      outputChannel.clear();
      outputChannel.appendLine(`Query failed: ${e.message}`);
      outputChannel.show(true);
      vscode.window.showErrorMessage(`Query failed: ${e.message}`);
    }
  }

  let disposable = vscode.commands.registerCommand('extension.runFlowQueryStatement', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const text = editor.document.getText();
      // pass the active document path so .env.yaml lookup can occur in the same folder
      runQueryOnDocument(text, editor.document.uri && editor.document.uri.fsPath);
     }
   });

  context.subscriptions.push(disposable);
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function drawTable(results) {
  // Support both shapes: worker sends an array of result objects directly, or
  // an object with an `output` property (older format).
  const output = Array.isArray(results) ? results : (results && results.output);
  const hasOutput = output && output.length;

  if (hasOutput) {
    const columns = Object.keys(output[0]);

    let table = '<table>';
    table += '<tr>';
    columns.forEach(column => {
      table += `<th>${escapeHtml(column)}</th>`;
    });
    table += '</tr>';
    for (let i = 0; i < output.length; i++) {
      table += '<tr>';
      for (let j = 0; j < columns.length; j++) {
        let value = output[i][columns[j]];
        if (typeof value === 'object') {
          try {
            value = JSON.stringify(value);
          } catch {
            value = String(value);
          }
        } else if (typeof value === 'boolean') {
          value = value ? 'true' : 'false';
        } else if (value === null) {
          value = 'null';
        } else if (value === undefined) {
          value = 'undefined';
        } else {
          value = value.toString();
        }
        table += `<td>${escapeHtml(value)}</td>`;
      }
      table += '</tr>';
    }
    table += '</table>';

    return table;
  }
  return '';
}

function getPath(webview, _path, file) {
  return webview.asWebviewUri(vscode.Uri.joinPath(_path, file));
}

function getWebviewContent(results, webview, extensionUri) {
  const libsPath = vscode.Uri.joinPath(extensionUri, 'libs');
  const safeResults = JSON.stringify(results).replace(/</g, '\\u003c');
  return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" type="text/css" href="${getPath(webview, libsPath, 'page.css')}">
            <link rel="stylesheet" type="text/css" href="${getPath(webview, libsPath, 'tabs.css')}">
            <link rel="stylesheet" type="text/css" href="${getPath(webview, libsPath, 'table.css')}">
        </head>
        <body>
            <div class="tab">
                <button class="tab-links active" onclick="openTab(event, 'table')">Table</button>
                <button class="tab-links" onclick="openTab(event, 'json')">JSON</button>
            </div>

            <div id="table" class="tab-content active">
                <span id="table-data">
                    ${drawTable(results)}
                </span>
                <button class="copy-button" onclick="copyToClipboard('table-data')">Copy</button>
            </div>

            <div id="json" class="tab-content">
                <div class="json-controls">
                    <button id="wrap-toggle" onclick="toggleWrap()">No wrap</button>
                </div>
                <pre id="json-content"></pre>
                <button class="copy-button" onclick="copyToClipboard('json-content')">Copy</button>
            </div>

            <script>
                const vscodeApi = acquireVsCodeApi();
                function openTab(evt, tabName) {
                    const tabContents = document.getElementsByClassName("tab-content");
                    const tabLinks = document.getElementsByClassName("tab-links");

                    // Hide all tab contents
                    for (let i = 0; i < tabContents.length; i++) {
                        tabContents[i].classList.remove("active");
                    }

                    // Remove active class from all tab buttons
                    for (let i = 0; i < tabLinks.length; i++) {
                        tabLinks[i].classList.remove("active");
                    }

                    // Show the selected tab and set active state on button
                    document.getElementById(tabName).classList.add("active");
                    evt.currentTarget.classList.add("active");
                }

                function copyToClipboard(elementId) {
                    const text = document.getElementById(elementId).innerText;
                    navigator.clipboard.writeText(text).then(() => {
                        // Notify the extension host so it can show a VS Code notification
                        vscodeApi.postMessage({ command: 'copied' });
                    }).catch(err => {
                        console.error('Could not copy text: ', err);
                    });
                }

                // ----- JSON UI helpers -----
                const resultsData = ${safeResults};

                function escapeHtmlForWeb(str) {
                    return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }

                function syntaxHighlight(json) {
                    if (!json) return '';
                    const escaped = escapeHtmlForWeb(json);
                    return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, function (match) {
                        let cls = 'number';
                        if (/^"/.test(match)) {
                            if (/:\s*$/.test(match)) {
                                cls = 'key';
                            } else {
                                cls = 'string';
                            }
                        } else if (/true|false/.test(match)) {
                            cls = 'boolean';
                        } else if (/null/.test(match)) {
                            cls = 'null';
                        }
                        return '<span class="' + cls + '">' + match + '</span>';
                    });
                }

                function renderJson() {
                    const pretty = JSON.stringify(resultsData, null, 2);
                    const pre = document.getElementById('json-content');
                    pre.textContent = pretty;
                    pre.innerHTML = syntaxHighlight(pre.textContent);
                }

                function toggleWrap() {
                    const pre = document.getElementById('json-content');
                    const btn = document.getElementById('wrap-toggle');
                    if (pre.classList.contains('nowrap')) {
                        pre.classList.remove('nowrap');
                        btn.textContent = 'No wrap';
                    } else {
                        pre.classList.add('nowrap');
                        btn.textContent = 'Wrap';
                    }
                    // Persist nowrap state across webview sessions
                    const newState = Object.assign({}, vscodeApi.getState() || {}, { nowrap: pre.classList.contains('nowrap') });
                    vscodeApi.setState(newState);
                }

                // Initialize
                (function() {
                    renderJson();
                    // restore persisted state if present
                    const state = vscodeApi.getState() || {};
                    const pre = document.getElementById('json-content');
                    const btn = document.getElementById('wrap-toggle');
                    if (state.nowrap) {
                        pre.classList.add('nowrap');
                        btn.textContent = 'Wrap';
                    } else {
                        pre.classList.remove('nowrap');
                        btn.textContent = 'No wrap';
                    }
                })();

            </script>
        </body>
    </html>
    `;
}

function deactivate() {}

// Attach activate/deactivate to the existing exports object so test harness can access
// properties placed on module.exports (such as `_outputChannel`) earlier.
module.exports.activate = activate;
module.exports.deactivate = deactivate;

// Expose an applyEnvSubstitutions helper for unit tests
module.exports._applyEnvSubstitutions = function(text, docPath) {
	if (!docPath) return text;
	try {
		const dir = path.dirname(docPath);
		const envPath = path.join(dir, '.env');
		if (!fs.existsSync(envPath)) return text;
		const raw = fs.readFileSync(envPath, 'utf8');
		const map = Object.create(null);
		raw.split(/\r?\n/).forEach(line => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) return;
			const idx = trimmed.indexOf('=');
			if (idx === -1) return;
			const key = trimmed.substring(0, idx).trim();
			let val = trimmed.substring(idx + 1).trim();
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.substring(1, val.length - 1);
			}
			map[key] = val;
		});

		return text.replace(/\$([A-Za-z0-9_]+)/g, (match, key) => {
			if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
			return match;
		});
	} catch {
		try { module.exports._outputChannel && module.exports._outputChannel.appendLine && module.exports._outputChannel.appendLine('Warning: .env could not be read or parsed.'); } catch {}
		return text;
	}
};
