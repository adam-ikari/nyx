import { useState, useCallback, useEffect } from 'react'
import { Shield, Copy, Trash2, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrowserLLMDetector, AVAILABLE_BROWSER_MODELS } from '@/lib/browser-llm'

interface BrowserSupport {
  webgpu: boolean
  caches: boolean
  networkOnline: boolean
}

export function App() {
  const [mode, setMode] = useState<'sanitize' | 'restore'>('sanitize')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sensitiveCount, setSensitiveCount] = useState(0)

  // WebLLM state
  const [modelId, setModelId] = useState(AVAILABLE_BROWSER_MODELS[3].id) // Default to smallest
  const [detector, setDetector] = useState<BrowserLLMDetector | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelLoadingText, setModelLoadingText] = useState('')
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(null)
  const [mapping, setMapping] = useState<Map<string, string>>(new Map())

  // Check browser support on mount
  useEffect(() => {
    const support: BrowserSupport = {
      webgpu: 'gpu' in navigator,
      caches: 'caches' in window,
      networkOnline: navigator.onLine,
    }
    setBrowserSupport(support)

    const handleOnline = () => setBrowserSupport(prev => prev ? { ...prev, networkOnline: true } : null)
    const handleOffline = () => setBrowserSupport(prev => prev ? { ...prev, networkOnline: false } : null)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadModel = useCallback(async () => {
    if (!browserSupport?.webgpu) {
      setError('WebGPU not available. Please use Chrome/Edge 113+.')
      return
    }
    if (!browserSupport?.caches) {
      setError('Cache API not available. Cannot store models.')
      return
    }
    if (!browserSupport?.networkOnline) {
      setError('Network offline. Cannot download models from HuggingFace.')
      return
    }

    setModelLoading(true)
    setModelLoadingProgress(0)
    setModelLoadingText('Initializing...')
    setError(null)

    try {
      const newDetector = new BrowserLLMDetector({ model: modelId })
      newDetector.onLoading((progress, text) => {
        setModelLoadingProgress(progress)
        setModelLoadingText(text)
      })
      await newDetector.initialize()
      setDetector(newDetector)
      setModelLoadingText('Model loaded!')
      setSuccess('Model loaded successfully!')
    } catch (err) {
      console.error('Failed to load model:', err)
      setError(`Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setModelLoading(false)
    }
  }, [modelId, browserSupport])

  const handleProcess = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text')
      return
    }

    if (!detector) {
      setError('Please load a model first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'sanitize') {
        const result = await detector.detect(inputText)

        // Create sanitized text with placeholders
        let sanitized = inputText
        const newMapping = new Map<string, string>()
        let index = 1

        // Sort by position (reverse) to replace from end to start
        const sortedSensitive = [...result.sensitive].sort((a, b) => b.start - a.start)

        for (const item of sortedSensitive) {
          const placeholder = `«NYX_${item.type.toUpperCase()}_${index}»`
          newMapping.set(placeholder, item.value)
          sanitized = sanitized.slice(0, item.start) + placeholder + sanitized.slice(item.end)
          index++
        }

        setOutputText(sanitized)
        setMapping(newMapping)
        setSessionId(`session-${Date.now()}`)
        setSensitiveCount(result.sensitive.length)
        setSuccess(`Found ${result.sensitive.length} sensitive items`)
      } else {
        // Restore mode
        let restored = inputText
        let complete = true

        for (const [placeholder, original] of mapping.entries()) {
          if (restored.includes(placeholder)) {
            restored = restored.replaceAll(placeholder, original)
          } else {
            complete = false
          }
        }

        setOutputText(restored)
        setSuccess(complete ? 'Text restored successfully!' : 'Some placeholders not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }, [inputText, mode, detector, mapping])

  const handleCopy = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText)
      setSuccess('Copied to clipboard!')
    }
  }

  const handleClear = () => {
    setInputText('')
    setOutputText('')
    setError(null)
    setSuccess(null)
    setMapping(new Map())
    setSensitiveCount(0)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              Nyx Sanitizer
            </h1>
          </div>
          <p className="text-muted-foreground">
            Browser-based privacy-preserving content sanitization (WebLLM)
          </p>
        </div>

        {/* Browser Support & Model Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              WebLLM Model
            </CardTitle>
            <CardDescription>
              Models run entirely in your browser using WebGPU
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Browser Support */}
            {browserSupport && (
              <div className="mb-4 p-3 rounded-lg bg-muted text-sm">
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    {browserSupport.webgpu ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    WebGPU
                  </span>
                  <span className="flex items-center gap-1">
                    {browserSupport.caches ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    Cache API
                  </span>
                  <span className="flex items-center gap-1">
                    {browserSupport.networkOnline ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    Network
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-sm text-muted-foreground">Model</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={modelLoading}
                  className="w-full p-2 rounded-md border border-input bg-background"
                >
                  {AVAILABLE_BROWSER_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={loadModel} disabled={modelLoading || !browserSupport?.webgpu || !browserSupport?.caches}>
                {modelLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : detector ? 'Reload Model' : 'Load Model'}
              </Button>
              <div className="flex items-center gap-2">
                {detector ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm">{detector ? 'Model ready' : 'No model loaded'}</span>
              </div>
            </div>

            {modelLoading && (
              <div className="mt-4 p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{modelLoadingText}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${modelLoadingProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border p-1">
            <button
              onClick={() => setMode('sanitize')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'sanitize' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              Sanitize
            </button>
            <button
              onClick={() => setMode('restore')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'restore' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              Restore
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {mode === 'sanitize' ? 'Input (Sensitive Content)' : 'Input (AI Response)'}
              </CardTitle>
              <CardDescription>
                {mode === 'sanitize'
                  ? 'Enter text containing sensitive information'
                  : 'Paste AI response with placeholders'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={mode === 'sanitize'
                  ? 'Enter text with sensitive information...'
                  : 'Paste AI response with placeholders...'}
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {mode === 'sanitize' ? 'Output (Sanitized)' : 'Output (Restored)'}
              </CardTitle>
              <CardDescription>
                {mode === 'sanitize'
                  ? 'Sanitized text ready to paste into AI tools'
                  : 'Restored text with original values'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outputText}
                readOnly
                placeholder="Output will appear here..."
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <Button onClick={handleProcess} disabled={loading || !detector} size="lg">
            {loading ? 'Processing...' : (mode === 'sanitize' ? 'Sanitize' : 'Restore')}
          </Button>
          <Button variant="secondary" onClick={handleCopy} disabled={!outputText}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Output
          </Button>
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive mb-6 max-w-md mx-auto">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 text-green-500 mb-6 max-w-md mx-auto">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Status Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session ID:</span>
                <span className="font-mono">{sessionId || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span>{mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sensitive Items:</span>
                <span>{sensitiveCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
