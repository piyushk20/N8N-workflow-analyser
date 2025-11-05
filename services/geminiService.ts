
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    summary: {
      type: Type.OBJECT,
      properties: {
        accomplishment: { type: Type.STRING },
        trigger: { type: Type.STRING },
        finalOutcome: { type: Type.STRING },
        analogy: { type: Type.STRING },
      },
    },
    textFlow: { type: Type.STRING },
    nodeBreakdowns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nodeId: { type: Type.STRING },
          nodeName: { type: Type.STRING },
          purpose: { type: Type.STRING },
          requiredInputs: { type: Type.STRING },
          configurationNeeds: { type: Type.STRING },
          output: { type: Type.STRING },
          visualMetaphor: { type: Type.STRING },
        },
      },
    },
    errors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING },
          description: { type: Type.STRING },
          impact: { type: Type.STRING },
          nodeId: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          jsonModification: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              newValue: { type: Type.STRING },
              requiresUserInput: { type: Type.BOOLEAN },
            },
          },
        },
      },
    },
  },
};


export const analyzeWorkflow = async (workflowJson: string): Promise<AnalysisResult> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    throw new Error("API key is not configured. Please ensure the API_KEY environment variable is set.");
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    You are an expert N8N workflow analyst and a friendly teacher. Your goal is to analyze the following N8N workflow and explain everything so a 12-year-old can understand it. Imagine you're explaining a cool machine, a video game level, or a recipe.

    **Your Main Rules:**
    1.  **Explain Simply:** Use simple words, short sentences, and fun analogies for EVERYTHING (the overall summary, each node's purpose, and every error description and recommendation). Avoid jargon.
    2.  **Analyze the Workflow:** Check if the JSON is correct, see how the steps connect, find any mistakes, and identify orphaned or unreachable nodes.
    3.  **Find & Fix Problems:** For every problem you find, explain what's wrong, why it's a problem, and how to fix it, all in simple terms. Give each problem a unique ID. If the error is not specific to a node, return an empty string "" for the 'nodeId' field.
    4.  **Smart Fixes (This is SUPER important!):**
        *   **Automatic Fixes:** For most technical problems, like a missing setting, a typo, or a logical error that can be inferred, you should figure out the correct value yourself and suggest the fix. For these, set 'requiresUserInput' to 'false'.
        *   **Manual Fixes (Only for Secrets!):** If a fix requires a secret password, API key, credential, or a special ID that only the user would know, you MUST set 'requiresUserInput' to 'true'. For the fix, use a clear placeholder in 'newValue' like "<PASTE_YOUR_SECRET_API_KEY_HERE>". Do not ask for manual input for anything else.
    5.  **Stringify 'newValue':** The 'newValue' for your fix must ALWAYS be a string. If the fix is a number like 5, make it the string "5". If it's an object like {"name": "Bot"}, make it the string "{\\"name\\": \\"Bot\\"}". This is a strict rule and is not optional.
    6.  **Give a Summary:** Explain what the whole workflow does, what kicks it off, and what happens at the end.
    7.  **Show the Flow:** Create a simple text map of the workflow steps using arrows (->).

    **Input Workflow JSON:**
    \`\`\`json
    ${workflowJson}
    \`\`\`
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const resultText = response.text.trim();
    // Gemini sometimes wraps the JSON in ```json ... ```, so we need to strip that.
    const cleanedJson = resultText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanedJson) as AnalysisResult;

    // Post-process response to align with TypeScript types
    result.errors.forEach(error => {
      if (error.nodeId === "") {
          error.nodeId = undefined;
      }
      try {
        error.jsonModification.newValue = JSON.parse(error.jsonModification.newValue);
      } catch (e) {
        // If it's not a valid JSON string (e.g., a simple unquoted string), 
        // keep the raw string value.
      }
    });

    return result;
  } catch (error) {
    console.error("Error analyzing workflow with Gemini:", error);
    
    let errorMessage = "An unexpected error occurred while analyzing the workflow.";

    // Check for the nested error structure from the API
    if (error && typeof error === 'object') {
        const errorDetails = (error as any).error || error;
        if (typeof errorDetails.message === 'string' && errorDetails.message) {
            errorMessage = `Error analyzing workflow with Gemini: ${errorDetails.message}`;
        } else if (errorDetails.status) {
            errorMessage = `Error analyzing workflow with Gemini: ${errorDetails.status} (Code: ${errorDetails.code || 'N/A'})`;
        } else if ('message' in error && typeof (error as Error).message === 'string') {
            errorMessage = (error as Error).message;
        }
    }
    
    throw new Error(errorMessage);
  }
};
