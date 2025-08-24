import React, { useState } from 'react';
import { MessageSquare, DollarSign, User, Hash, Clock, Copy, Check } from 'lucide-react';

interface ParsedTransaction {
  type: 'RECEIVED' | 'SENT' | 'WITHDRAWAL' | 'UNKNOWN';
  amount: number;
  fromName?: string;
  toName?: string;
  reference?: string;
  balance?: number;
  timestamp: Date;
  rawMessage: string;
}

/**
 * BANKING SMS PARSER COMPONENT
 * ============================
 * 
 * Manual SMS parsing for MCB banking messages
 * Works on any device - just copy/paste SMS
 */
const BankingSmsParser: React.FC = () => {
  const [smsText, setSmsText] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // MCB SMS parsing patterns
  const patterns = {
    received: /MCB:\s*Rs\s*([\d,]+\.?\d*)\s*received\s*from\s*([A-Z\s]+)\s*Ref:\s*(\d+)\s*Bal:\s*Rs\s*([\d,]+\.?\d*)/i,
    sent: /MCB:\s*Rs\s*([\d,]+\.?\d*)\s*sent\s*to\s*([A-Z\s]+)\s*Ref:\s*(\d+)\s*Bal:\s*Rs\s*([\d,]+\.?\d*)/i,
    withdrawal: /MCB:\s*Rs\s*([\d,]+\.?\d*)\s*withdrawn.*Bal:\s*Rs\s*([\d,]+\.?\d*)/i
  };

  // Parse SMS message
  const parseSmsMessage = (message: string): ParsedTransaction | null => {
    if (!message.trim()) return null;

    const cleanMessage = message.trim();
    
    // Try received pattern
    const receivedMatch = cleanMessage.match(patterns.received);
    if (receivedMatch) {
      return {
        type: 'RECEIVED',
        amount: parseFloat(receivedMatch[1].replace(/,/g, '')),
        fromName: receivedMatch[2].trim(),
        reference: receivedMatch[3],
        balance: parseFloat(receivedMatch[4].replace(/,/g, '')),
        timestamp: new Date(),
        rawMessage: cleanMessage
      };
    }

    // Try sent pattern
    const sentMatch = cleanMessage.match(patterns.sent);
    if (sentMatch) {
      return {
        type: 'SENT',
        amount: parseFloat(sentMatch[1].replace(/,/g, '')),
        toName: sentMatch[2].trim(),
        reference: sentMatch[3],
        balance: parseFloat(sentMatch[4].replace(/,/g, '')),
        timestamp: new Date(),
        rawMessage: cleanMessage
      };
    }

    // Try withdrawal pattern
    const withdrawalMatch = cleanMessage.match(patterns.withdrawal);
    if (withdrawalMatch) {
      return {
        type: 'WITHDRAWAL',
        amount: parseFloat(withdrawalMatch[1].replace(/,/g, '')),
        balance: parseFloat(withdrawalMatch[2].replace(/,/g, '')),
        timestamp: new Date(),
        rawMessage: cleanMessage
      };
    }

    // If no pattern matches but contains MCB, mark as unknown
    if (cleanMessage.toLowerCase().includes('mcb')) {
      return {
        type: 'UNKNOWN',
        amount: 0,
        timestamp: new Date(),
        rawMessage: cleanMessage
      };
    }

    return null;
  };

  // Handle SMS input change
  const handleSmsChange = (value: string) => {
    setSmsText(value);
    setError('');
    
    if (value.trim()) {
      const parsed = parseSmsMessage(value);
      if (parsed) {
        setParsedTransaction(parsed);
      } else {
        setParsedTransaction(null);
        if (value.length > 10) {
          setError('Could not parse this message. Please check the format.');
        }
      }
    } else {
      setParsedTransaction(null);
    }
  };

  // Copy parsed data to clipboard
  const copyToClipboard = async () => {
    if (!parsedTransaction) return;
    
    const copyText = `Type: ${parsedTransaction.type}
Amount: Rs ${parsedTransaction.amount.toFixed(2)}
${parsedTransaction.fromName ? `From: ${parsedTransaction.fromName}` : ''}
${parsedTransaction.toName ? `To: ${parsedTransaction.toName}` : ''}
${parsedTransaction.reference ? `Reference: ${parsedTransaction.reference}` : ''}
${parsedTransaction.balance ? `Balance: Rs ${parsedTransaction.balance.toFixed(2)}` : ''}
Time: ${parsedTransaction.timestamp.toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = copyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Sample MCB messages for testing
  const sampleMessages = [
    'MCB: Rs 1,500.00 received from JOHN DOE Ref: 1234567890 Bal: Rs 5,250.00',
    'MCB: Rs 500.00 sent to JANE SMITH Ref: 9876543210 Bal: Rs 4,750.00',
    'MCB: Rs 200.00 withdrawn from ATM Port Louis Bal: Rs 4,550.00'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-full">
          <MessageSquare size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">MCB SMS Parser</h3>
          <p className="text-sm text-gray-600">Paste MCB banking SMS to extract transaction details</p>
        </div>
      </div>

      {/* SMS Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste MCB SMS Message
        </label>
        <textarea
          value={smsText}
          onChange={(e) => handleSmsChange(e.target.value)}
          placeholder="Paste your MCB SMS message here..."
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Sample Messages */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Try these sample MCB messages:</p>
        <div className="space-y-2">
          {sampleMessages.map((sample, index) => (
            <button
              key={index}
              onClick={() => handleSmsChange(sample)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <p className="text-sm text-gray-700 font-mono">{sample}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Parsed Result */}
      {parsedTransaction && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-green-800 flex items-center gap-2">
              {getTransactionIcon(parsedTransaction.type)}
              Transaction Parsed Successfully
            </h4>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium text-gray-800">{parsedTransaction.type}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium text-gray-800">Rs {parsedTransaction.amount.toFixed(2)}</span>
            </div>
            
            {parsedTransaction.fromName && (
              <div>
                <span className="text-gray-600">From:</span>
                <span className="ml-2 font-medium text-gray-800">{parsedTransaction.fromName}</span>
              </div>
            )}
            
            {parsedTransaction.toName && (
              <div>
                <span className="text-gray-600">To:</span>
                <span className="ml-2 font-medium text-gray-800">{parsedTransaction.toName}</span>
              </div>
            )}
            
            {parsedTransaction.reference && (
              <div>
                <span className="text-gray-600">Reference:</span>
                <span className="ml-2 font-medium text-gray-800">{parsedTransaction.reference}</span>
              </div>
            )}
            
            {parsedTransaction.balance && (
              <div>
                <span className="text-gray-600">Balance:</span>
                <span className="ml-2 font-medium text-gray-800">Rs {parsedTransaction.balance.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              <span>Parsed at {parsedTransaction.timestamp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingSmsParser;