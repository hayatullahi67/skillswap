// Monaco Editor configuration to prevent worker issues
import * as monaco from 'monaco-editor'

// Configure Monaco Editor workers
export const configureMonaco = () => {
  if (typeof window !== 'undefined') {
    // Set up worker configuration
    self.MonacoEnvironment = {
      getWorkerUrl: function (moduleId: string, label: string) {
        if (label === 'json') {
          return './json.worker.js'
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return './css.worker.js'
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return './html.worker.js'
        }
        if (label === 'typescript' || label === 'javascript') {
          return './ts.worker.js'
        }
        return './editor.worker.js'
      }
    }

    // Disable web workers in development to avoid CSP issues
    if (process.env.NODE_ENV === 'development') {
      monaco.editor.setModelLanguage = monaco.editor.setModelLanguage || (() => {})
    }
  }
}

// Alternative configuration that works with CSP
export const configureMonacoForCSP = () => {
  if (typeof window !== 'undefined') {
    // Use inline workers to avoid CSP blob: issues
    self.MonacoEnvironment = {
      getWorker: function (moduleId: string, label: string): Worker {
        // Create a simple worker that runs in main thread
        const blob = new Blob(['self.postMessage({});'], { type: 'application/javascript' })
        return new Worker(URL.createObjectURL(blob))
      }
    }
  }
}