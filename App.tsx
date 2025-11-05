
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { set as lodashSet } from 'lodash';

import { analyzeWorkflow } from './services/geminiService';
import { AnalysisResult, N8NWorkflow, WorkflowError } from './types';
import { Icon } from './components/Icon';
import { CodeBlock } from './components/CodeBlock';

type Stage = 'input' | 'analyzing' | 'results';

const SEVERITY_MAP = {
  critical: {
    icon: 'critical' as const,
    color: 'text-brand-danger',
    bgColor: 'bg-red-900/20',
  },
  warning: {
    icon: 'warning' as const,
    color: 'text-brand-warning',
    bgColor: 'bg-yellow-900/20',
  },
  info: {
    icon: 'info' as const,
    color: 'text-brand-primary',
    bgColor: 'bg-blue-900/20',
  },
};

const App: React.FC = () => {
  const [stage, setStage] = useState<Stage>('input');
  const [jsonInput, setJsonInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [approvedFixes, setApprovedFixes] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hasApiKey, setHasApiKey] = useState(false);

  const originalWorkflow = useRef<N8NWorkflow | null>(null);
  
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio) {
          const keySelected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(keySelected);
        }
      } catch (e) {
        console.error("Error checking for API key:", e);
        setHasApiKey(false);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Optimistically assume the user selected a key.
        setHasApiKey(true);
      }
    } catch (e) {
      console.error("Error opening API key selection:", e);
      setApiError("Could not open the API key selection dialog.");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!jsonInput.trim()) {
      setApiError('JSON input cannot be empty.');
      return;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonInput);
      originalWorkflow.current = parsedJson;
    } catch (error) {
      setApiError('Invalid JSON format. Please check your input.');
      return;
    }

    setStage('analyzing');
    setApiError(null);
    setAnalysisResult(null);
    setApprovedFixes(new Set());
    setOpenSections({});

    try {
      const result = await analyzeWorkflow(jsonInput);
      setAnalysisResult(result);
      setStage('results');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (typeof errorMessage === 'string' && errorMessage.includes('Requested entity was not found')) {
        setApiError('The selected API key is invalid or has been revoked. Please select a different key.');
        setHasApiKey(false); 
      } else {
        setApiError(errorMessage);
      }
      setStage('input');
    }
  };

  const toggleFix = (errorId: string) => {
    setApprovedFixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const approveAllFixes = () => {
    if (!analysisResult) return;
    const autoFixableErrorIds = new Set(
      analysisResult.errors
        .filter(e => !e.jsonModification.requiresUserInput)
        .map(e => e.id)
    );
    setApprovedFixes(autoFixableErrorIds);
  };

  const correctedWorkflowJson = useMemo(() => {
    if (!originalWorkflow.current || !analysisResult) return null;
    
    let correctedWorkflow = JSON.parse(JSON.stringify(originalWorkflow.current));
    
    analysisResult.errors.forEach(error => {
      if (approvedFixes.has(error.id)) {
        lodashSet(correctedWorkflow, error.jsonModification.path, error.jsonModification.newValue);
      }
    });

    return JSON.stringify(correctedWorkflow, null, 2);
  }, [approvedFixes, analysisResult]);

  const downloadCorrectedJson = () => {
    if (!correctedWorkflowJson) return;
    const blob = new Blob([correctedWorkflowJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow-validated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text-primary font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            N8N Workflow Analyzer
          </h1>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Transforming complex workflows into simple, actionable insights.
          </p>
        </header>

        {!hasApiKey ? (
          <div className="text-center max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg border border-brand-border">
            <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
            <p className="text-brand-text-secondary mb-6">
              This application uses the Gemini API to analyze workflows. Please select an API key to proceed. Using the Gemini API may incur charges. Please refer to the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline hover:text-blue-400">billing documentation</a> for details.
            </p>
            <button
              onClick={handleSelectKey}
              className="bg-brand-primary text-white font-bold py-3 px-8 rounded-full hover:bg-blue-600 transition-colors text-lg shadow-lg shadow-blue-500/20"
            >
              Select API Key
            </button>
          </div>
        ) : (
          <>
            {stage === 'input' && (
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon name="clipboard" className="w-6 h-6 text-brand-primary" />
                      <h2 className="text-xl font-semibold">Paste Workflow JSON</h2>
                    </div>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder="Paste your N8N workflow JSON here..."
                      className="w-full h-64 bg-brand-background border border-brand-border rounded-md p-3 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                    />
                  </div>
                  <div className="bg-brand-surface p-6 rounded-lg border border-brand-border h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon name="upload" className="w-6 h-6 text-brand-primary" />
                      <h2 className="text-xl font-semibold">Upload a File</h2>
                    </div>
                    <div
                      {...getRootProps()}
                      className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                        isDragActive ? 'border-brand-primary bg-blue-900/20' : 'border-brand-border hover:border-brand-primary/70'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <p className="text-brand-text-secondary text-center p-4">
                        {isDragActive ? 'Drop the file here...' : "Drag 'n' drop a JSON file here, or click to select"}
                      </p>
                    </div>
                  </div>
                </div>
                {apiError && <p className="text-center mt-6 text-brand-danger">{apiError}</p>}
                <div className="text-center mt-8">
                  <button
                    onClick={handleAnalyze}
                    disabled={!jsonInput.trim()}
                    className="bg-brand-primary text-white font-bold py-3 px-8 rounded-full hover:bg-blue-600 transition-colors disabled:bg-brand-secondary disabled:cursor-not-allowed text-lg shadow-lg shadow-blue-500/20"
                  >
                    Analyze Workflow
                  </button>
                </div>
              </div>
            )}

            {stage === 'analyzing' && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-primary mb-6"></div>
                <h2 className="text-3xl font-bold text-brand-text-primary">Analyzing Workflow...</h2>
                <p className="text-brand-text-secondary mt-3 text-lg">
                  Our digital detective is on the case, examining your workflow clues.
                </p>
              </div>
            )}

            {stage === 'results' && analysisResult && (
              <div className="space-y-12">
                <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                  <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Analysis Summary</h2>
                  <div className="space-y-4 text-brand-text-secondary">
                    <p><strong>What it does:</strong> {analysisResult.summary.accomplishment}</p>
                    <p><strong>How it starts:</strong> {analysisResult.summary.trigger}</p>
                    <p><strong>What's the result:</strong> {analysisResult.summary.finalOutcome}</p>
                    <p className="p-4 bg-black/30 rounded-md italic">
                      <strong>Analogy:</strong> {analysisResult.summary.analogy}
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-3xl font-bold mb-4">Identified Issues & Fixes</h2>
                  {analysisResult.errors.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-right mb-4">
                        <button 
                          onClick={approveAllFixes}
                          className="bg-green-600/80 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-500/80 transition-colors text-sm flex items-center gap-2 ml-auto"
                        >
                          <Icon name="check" className="w-5 h-5" />
                          Accept All Automated Fixes
                        </button>
                      </div>
                      {analysisResult.errors.map((error) => {
                        const severityStyle = SEVERITY_MAP[error.severity as keyof typeof SEVERITY_MAP] || SEVERITY_MAP.info;
                        const isFixApproved = approvedFixes.has(error.id);
                        return (
                          <div key={error.id} className={`p-4 rounded-lg border ${severityStyle.bgColor} border-white/10`}>
                            <div className="flex items-start gap-4">
                              <Icon name={severityStyle.icon} className={`w-6 h-6 mt-1 flex-shrink-0 ${severityStyle.color}`} />
                              <div className="flex-grow">
                                <p className={`font-bold text-lg ${severityStyle.color} capitalize`}>{error.severity}: {error.description}</p>
                                <p className="text-sm text-brand-text-secondary mt-1"><strong>Impact:</strong> {error.impact}</p>
                                {error.nodeId && <p className="text-sm text-brand-text-secondary mt-1"><strong>Node:</strong> <code className="bg-black/50 px-1.5 py-0.5 rounded-sm text-xs">{error.nodeId}</code></p>}
                                <div className="mt-4 p-3 bg-black/30 rounded-md">
                                  <p className="font-semibold text-brand-text-primary">Recommendation:</p>
                                  <p className="text-sm text-brand-text-secondary">{error.recommendation}</p>
                                </div>
                                <div className="mt-4">
                                  {error.jsonModification.requiresUserInput ? (
                                    <button
                                      disabled
                                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-yellow-900/40 text-brand-warning cursor-not-allowed"
                                    >
                                      <Icon name="warning" className="w-5 h-5" />
                                      Manual Input Required
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleFix(error.id)}
                                      className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        isFixApproved 
                                        ? 'bg-green-800/50 text-green-300 hover:bg-green-700/50' 
                                        : 'bg-brand-secondary/20 text-brand-text-secondary hover:bg-brand-secondary/40'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 h-5 border-2 rounded-sm flex items-center justify-center ${isFixApproved ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'}`}>
                                        {isFixApproved && <Icon name="check" className="w-3 h-3 text-white" />}
                                      </div>
                                      Accept Fix
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-brand-surface p-6 rounded-lg border border-brand-success text-center">
                      <Icon name="check" className="w-10 h-10 text-brand-success mx-auto mb-2" />
                      <p className="text-xl font-semibold">No issues found!</p>
                      <p className="text-brand-text-secondary">Your workflow looks clean and ready to go.</p>
                    </div>
                  )}
                </section>
                
                {correctedWorkflowJson && approvedFixes.size > 0 && (
                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-3xl font-bold">Validated Workflow JSON</h2>
                      <button 
                        onClick={downloadCorrectedJson}
                        className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                      >
                        <Icon name="download" className="w-5 h-5" />
                        Download
                      </button>
                    </div>
                    <CodeBlock code={correctedWorkflowJson} />
                  </section>
                )}

                <section>
                    <h2 className="text-3xl font-bold mb-4">Node-by-Node Breakdown</h2>
                    <div className="space-y-3">
                        {analysisResult.nodeBreakdowns.map(node => (
                            <details key={node.nodeId} className="bg-brand-surface border border-brand-border rounded-lg group">
                                <summary className="p-4 cursor-pointer flex justify-between items-center font-semibold">
                                    <span>{node.nodeName} ({node.nodeId})</span>
                                    <Icon name="chevron-down" className="w-5 h-5 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="p-4 border-t border-brand-border text-brand-text-secondary space-y-3">
                                  <p><strong>Purpose:</strong> {node.purpose}</p>
                                  <p><strong>Analogy:</strong> <em className="italic">{node.visualMetaphor}</em></p>
                                  <p><strong>Required Inputs:</strong> {node.requiredInputs}</p>
                                  <p><strong>Configuration:</strong> {node.configurationNeeds}</p>
                                  <p><strong>Output:</strong> {node.output}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                <section>
                  <h2 className="text-3xl font-bold mb-4">Workflow Path</h2>
                  <div className="bg-brand-surface p-4 rounded-lg border border-brand-border">
                    <pre className="text-sm whitespace-pre-wrap font-mono"><code>{analysisResult.textFlow}</code></pre>
                  </div>
                </section>
                
                <div className="text-center pt-8">
                  <button
                    onClick={() => setStage('input')}
                    className="bg-brand-secondary/50 text-white font-bold py-3 px-8 rounded-full hover:bg-brand-secondary/80 transition-colors text-lg"
                  >
                    Analyze Another Workflow
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
    