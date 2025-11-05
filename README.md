
# N8N Workflow Analyzer

An intelligent web application powered by the Google Gemini API that analyzes and demystifies N8N automation workflows. It transforms complex workflow JSON into simple explanations, identifies errors, and provides smart, actionable fixes.

## Core Features

-   **Simplified Explanations**: Translates complex workflow logic into easy-to-understand language, using analogies and simple terms suitable for any audience.
-   **Intelligent Error Detection**: Goes beyond simple validation to identify logical flaws, missing configurations, and unreachable nodes.
-   **Smart Fixes**: Automatically suggests corrections for technical errors while intelligently identifying fields that require user secrets (like API keys) and prompting for manual input.
-   **Severity Levels**: Categorizes issues as `critical`, `warning`, or `info` to help users prioritize what needs attention.
-   **Interactive UI**: Allows users to review each issue, accept individual fixes, or apply all automated fixes with a single click.
-   **Validated Output**: Generates a corrected and validated workflow JSON file that can be downloaded and imported back into N8N.
-   **Detailed Breakdowns**: Provides a node-by-node explanation of each step's purpose, required inputs, configuration, and output.
-   **Secure API Key Handling**: Integrates with the environment's standard API key selection flow to ensure secure and user-friendly authentication with the Gemini API.

## How It Works

The application follows a simple yet powerful process:

1.  **Input**: The user pastes their N8N workflow JSON or uploads a `.json` file.
2.  **Analysis**: The frontend sends the JSON to the Google Gemini API (`gemini-2.5-flash` model) with a detailed system prompt. This prompt instructs the AI to act as an expert N8N analyst and a friendly teacher.
3.  **Structured Response**: The AI analyzes the workflow according to a strict JSON schema and returns a structured response containing:
    -   A high-level summary.
    -   A plain-text flow diagram.
    -   A breakdown of each node.
    -   A list of identified errors, each with a description, impact analysis, recommendation, and a proposed `jsonModification`.
4.  **Rendering Results**: The React application parses the AI's response and renders a rich, interactive results page.
5.  **Applying Fixes**: The user can review the proposed fixes. Using `lodash`, the application applies the approved modifications to an in-memory copy of the original workflow.
6.  **Output**: The user can download the newly corrected workflow JSON.

## Tech Stack

-   **Frontend**: React, TypeScript
-   **AI Engine**: Google Gemini API (`@google/genai`)
-   **Styling**: Tailwind CSS for a modern, responsive, and dark-themed UI.
-   **File Handling**: `react-dropzone` for seamless drag-and-drop file uploads.
-   **JSON Manipulation**: `lodash` for safely and deeply applying fixes to the workflow object.

## Project Structure

```
.
├── index.html            # Main HTML entry point, includes CDN links and importmap
├── index.tsx             # React application root
├── App.tsx               # Main application component (state management, UI stages)
├── services/
│   └── geminiService.ts  # Core logic for Gemini API interaction, prompt engineering, and response schema
├── components/
│   ├── CodeBlock.tsx     # Component for displaying formatted code with a copy button
│   └── Icon.tsx          # SVG icon component
├── types.ts              # TypeScript interfaces for N8N and the analysis result
└── README.md             # Project documentation
```

## API Key Requirement

This application requires a Google Gemini API key to function. The application is built to integrate with a host environment (like AI Studio) that provides a standard mechanism for API key selection (`window.aistudio.openSelectKey`). On startup, it checks if a key has been selected and prompts the user if one is needed, ensuring a secure and seamless user experience.
