
export interface N8NNode {
  parameters: Record<string, any>;
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  credentials?: Record<string, any>;
}

export interface N8NConnection {
  main: Array<[ { node: string; main: Array<[number, number]>; } ]>;
}

export interface N8NWorkflow {
  meta: {
    instanceId: string;
  };
  nodes: N8NNode[];
  connections: Record<string, N8NConnection>;
}

export interface WorkflowError {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  impact: string;
  nodeId?: string;
  recommendation: string;
  jsonModification: {
    path: string;
    newValue: any;
    requiresUserInput: boolean;
  };
}

export interface NodeBreakdown {
  nodeId: string;
  nodeName: string;
  purpose: string;
  requiredInputs: string;
  configurationNeeds: string;
  output: string;
  visualMetaphor: string;
}

export interface AnalysisResult {
  isValid: boolean;
  summary: {
    accomplishment: string;
    trigger: string;
    finalOutcome: string;
    analogy: string;
  };
  textFlow: string;
  nodeBreakdowns: NodeBreakdown[];
  errors: WorkflowError[];
}