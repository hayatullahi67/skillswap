// Utility functions to manage script loading and prevent conflicts

export const cleanupScripts = () => {
  if (typeof window === 'undefined') return

  // Remove duplicate Jitsi scripts
  const jitsiScripts = document.querySelectorAll('script[src*="jit.si"]')
  if (jitsiScripts.length > 1) {
    // Keep only the first one
    for (let i = 1; i < jitsiScripts.length; i++) {
      jitsiScripts[i].remove()
    }
  }

  // Clean up any orphaned script elements
  const orphanedScripts = document.querySelectorAll('script[src=""]')
  orphanedScripts.forEach(script => script.remove())
}

export const loadScriptOnce = (src: string, onLoad?: () => void, onError?: () => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`)
    if (existingScript) {
      if (onLoad) onLoad()
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.onload = () => {
      if (onLoad) onLoad()
      resolve()
    }
    script.onerror = () => {
      if (onError) onError()
      reject(new Error(`Failed to load script: ${src}`))
    }
    
    document.head.appendChild(script)
  })
}

export const removeScript = (src: string) => {
  if (typeof window === 'undefined') return
  
  const script = document.querySelector(`script[src="${src}"]`)
  if (script) {
    script.remove()
  }
}