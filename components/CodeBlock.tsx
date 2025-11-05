
import React, { useState } from 'react';
import { Icon } from './Icon';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'json' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/50 rounded-lg relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-gray-700/50 rounded-md text-gray-300 hover:bg-gray-600/70 focus:outline-none focus:ring-2 focus:ring-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Icon name="check" className="w-5 h-5 text-brand-success" /> : <Icon name="clipboard" className="w-5 h-5" />}
      </button>
      <pre className="p-4 text-sm rounded-lg overflow-x-auto text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
};
