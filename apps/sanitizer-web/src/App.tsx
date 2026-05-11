import { useState, useCallback, useEffect } from 'react'
import { Shield, Copy, Trash2, CheckCircle, AlertCircle, Loader2, RefreshCw, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrowserLLMDetector, AVAILABLE_BROWSER_MODELS } from '@/lib/browser-llm'

const SESSION_STORAGE_KEY = 'nyx-sanitizer-session'

interface SessionData {
  sessionId: string
  mapping: Array<[string, string]>
  createdAt: number
}

function loadSession(): { sessionId: string; mapping: Map<string, string> } | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null
    const data: SessionData = JSON.parse(stored)
    return {
      sessionId: data.sessionId,
      mapping: new Map(data.mapping)
    }
  } catch {
    return null
  }
}

function saveSession(sessionId: string, mapping: Map<string, string>) {
  const data: SessionData = {
    sessionId,
    mapping: Array.from(mapping.entries()),
    createdAt: Date.now()
  }
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
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
  const [modelId, setModelId] = useState(AVAILABLE_BROWSER_MODELS[0].id)
  const [detector, setDetector] = useState<BrowserLLMDetector | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelLoadingText, setModelLoadingText] = useState('')
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [webgpuAvailable, setWebgpuAvailable] = useState(false)
  const [mapping, setMapping] = useState<Map<string, string>>(new Map())

  // Check WebGPU support and load saved session on mount
  useEffect(() => {
    setWebgpuAvailable('gpu' in navigator)

    // Restore session from storage
    const saved = loadSession()
    if (saved) {
      setSessionId(saved.sessionId)
      setMapping(saved.mapping)
    }
  }, [])

  const loadModel = useCallback(async () => {
    if (!webgpuAvailable) {
      setError('WebGPU not available. Please use Chrome/Edge 113+.')
      return
    }

    setModelLoading(true)
    setModelLoadingProgress(0)
    setModelLoadingText('Loading model from local assets...')
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
  }, [modelId, webgpuAvailable])

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

        let sanitized = inputText
        const newMapping = new Map<string, string>()
        let index = 1

        const sortedSensitive = [...result.sensitive].sort((a, b) => b.start - a.start)

        for (const item of sortedSensitive) {
          const placeholder = `«NYX_${item.type.toUpperCase()}_${index}»`
          newMapping.set(placeholder, item.value)
          sanitized = sanitized.slice(0, item.start) + placeholder + sanitized.slice(item.end)
          index++
        }

        setOutputText(sanitized)
        setMapping(newMapping)
        const newSessionId = `session-${Date.now()}`
        setSessionId(newSessionId)
        setSensitiveCount(result.sensitive.length)
        setSuccess(`Found ${result.sensitive.length} sensitive items`)

        // Save session
        saveSession(newSessionId, newMapping)
      } else {
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
    clearSession()
  }

  const handleExportMapping = () => {
    if (mapping.size === 0) {
      setError('No mapping to export')
      return
    }
    const data = {
      sessionId,
      mapping: Array.from(mapping.entries()),
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nyx-mapping-${sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSuccess('Mapping exported!')
  }

  const handleImportMapping = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.mapping && Array.isArray(data.mapping)) {
          const newMapping = new Map<string, string>(data.mapping)
          setMapping(newMapping)
          setSessionId(data.sessionId || `imported-${Date.now()}`)
          setSuccess(`Imported mapping with ${newMapping.size} entries`)
        }
      } catch {
        setError('Failed to import mapping file')
      }
    }
    input.click()
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

        {/* Model Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Local Model
            </CardTitle>
            <CardDescription>
              Models run entirely in your browser using WebGPU (loaded from local assets)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* WebGPU Status */}
            <div className="mb-4 p-3 rounded-lg bg-muted text-sm">
              <span className="flex items-center gap-1">
                {webgpuAvailable ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                WebGPU {webgpuAvailable ? 'Available' : 'Not Available'}
              </span>
            </div>

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
                      {model.name} ({model.size}){model.recommended ? ' - Recommended' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={loadModel} disabled={modelLoading || !webgpuAvailable}>
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
          <Button variant="outline" onClick={handleExportMapping} disabled={mapping.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Mapping
          </Button>
          <Button variant="outline" onClick={handleImportMapping}>
            <Upload className="h-4 w-4 mr-2" />
            Import Mapping
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
                <span className="text-muted-foreground">Mapping Entries:</span>
                <span>{mapping.size}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}