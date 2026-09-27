import React, { useState, useRef, useEffect } from 'react';
import { assistantApi } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import {
  Send,
  Sparkles,
  ShieldAlert,
  Bot,
  Loader2,
  Trash2,
} from 'lucide-react';

export type UserRole = 'Viewer' | 'Analyst' | 'Admin';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  role: UserRole;
  text?: string;
  response?: any;
  error?: string;
}

export interface FinancialAssistantProps {}

const FinancialAssistantContent: React.FC<FinancialAssistantProps> = () => {
  const { user } = useAuth();
  const userRole = (user?.role?.name || 'Viewer') as UserRole;

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const queryText = (customQuestion || question).trim();
    if (!queryText || loading) return;

    const userMsgId = Date.now().toString();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp: now,
      role: userRole,
      text: queryText,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setQuestion('');

    if (queryText.length < 3) {
      const errorMsgObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        role: userRole,
        error: 'Question must be longer than or equal to 3 characters.',
      };
      setMessages((prev) => [...prev, errorMsgObj]);
      return;
    }

    setLoading(true);

    try {
      const data = await assistantApi.ask(queryText);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        role: userRole,
        response: data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const rawErr = err.response?.data?.message || err.message || 'Failed to connect to Assistant API.';
      const errMsg = Array.isArray(rawErr)
        ? rawErr.join(', ')
        : typeof rawErr === 'object' && rawErr !== null
          ? JSON.stringify(rawErr)
          : String(rawErr);
      const errorMsgObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        role: userRole,
        error: errMsg,
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = (res: any): string => {
    if (!res) return 'No answer generated.';
    if (typeof res === 'string') return res;
    if (typeof res.answer === 'string') return res.answer;
    if (typeof res.answer === 'object' && res.answer !== null) {
      return JSON.stringify(res.answer);
    }
    if (res.summary && typeof res.summary === 'string') return res.summary;
    if (res.message && typeof res.message === 'string') return res.message;
    return typeof res === 'object' ? JSON.stringify(res) : String(res);
  };

  useEffect(() => {
    assistantApi
      .getHistory()
      .then((history: any[]) => {
        if (Array.isArray(history) && history.length > 0) {
          const formatted: ChatMessage[] = history.map((item) => {
            let parsedPayload = item.payload;
            if (typeof item.payload === 'string') {
              try {
                parsedPayload = JSON.parse(item.payload);
              } catch {
                parsedPayload = { answer: item.payload };
              }
            }
            return {
              id: item.id,
              sender: item.sender as 'user' | 'assistant',
              timestamp: new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              role: (item.role || userRole) as UserRole,
              text: item.question || undefined,
              response: parsedPayload || (item.answer ? { answer: item.answer } : undefined),
              error: item.error || undefined,
            };
          });
          setMessages(formatted);
        }
      })
      .catch(() => {});
  }, [userRole]);

  const handleClearHistory = async () => {
    try {
      await assistantApi.clearHistory();
    } catch {}
    setMessages([]);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        maxHeight: '820px',
        minHeight: '580px',
        borderRadius: '20px',
        border: '1px solid var(--border-glass)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.45rem',
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '10px',
              color: '#60a5fa',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              AI Financial Assistant Chat
            </h3>
          </div>
        </div>

        {/* Clear History Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear Discussion History"
              style={{
                padding: '0.35rem 0.6rem',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Discussion Messages Thread Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '2rem',
            }}
          >
            <div
              style={{
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '50%',
                color: '#60a5fa',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={36} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Ask your financial data anything
            </h4>
            <p style={{ maxWidth: '480px', fontSize: '0.9rem', margin: 0 }}>
              Grounded analytics over 5M Nigerian banking transactions. Queries are planned by AI and validated against server-side RBAC policy.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              {/* Sender Label */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {msg.sender === 'user' ? (
                  <>
                    <span>You</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>
                      {msg.role}
                    </span>
                  </>
                ) : (
                  <>
                    <Bot size={13} style={{ color: '#60a5fa' }} />
                    <span style={{ color: '#60a5fa', fontWeight: 500 }}>Financial Assistant</span>
                  </>
                )}
                <span>• {msg.timestamp}</span>
              </div>

              {/* Message Content Bubble / Card */}
              {msg.sender === 'user' ? (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: '16px 16px 4px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    maxWidth: '80%',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '920px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {/* Error / Forbidden Card */}
                  {msg.error ? (
                    (() => {
                      const errString = Array.isArray(msg.error)
                        ? (msg.error as string[]).join(', ')
                        : typeof msg.error === 'object' && msg.error !== null
                          ? JSON.stringify(msg.error)
                          : String(msg.error || '');
                      const errLower = errString.toLowerCase();
                      const isAuthError =
                        errLower.includes('authorized') ||
                        errLower.includes('forbidden') ||
                        errLower.includes('denied') ||
                        errLower.includes('permission') ||
                        errLower.includes('lacks required capability') ||
                        errLower.includes('cannot access') ||
                        errLower.includes('rbac');

                      const isValidationError =
                        errLower.includes('character') ||
                        errLower.includes('validation') ||
                        errLower.includes('invalid') ||
                        errLower.includes('must be');

                      const title = isAuthError
                        ? 'Access Refused (Authorization Policy)'
                        : isValidationError
                          ? 'Input Validation Error'
                          : 'AI Service Unavailable';

                      const iconColor = isAuthError ? '#f87171' : isValidationError ? '#f59e0b' : '#f59e0b';
                      const bg = isAuthError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
                      const border = isAuthError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)';

                      return (
                        <div
                          style={{
                            padding: '1.25rem',
                            borderRadius: '14px',
                            background: bg,
                            border: border,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                          }}
                        >
                          <div
                            style={{
                              padding: '0.4rem',
                              background: isAuthError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              borderRadius: '8px',
                              color: iconColor,
                            }}
                          >
                            <ShieldAlert size={22} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: iconColor, margin: '0 0 0.35rem 0' }}>
                              {title}
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                              {errString}
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      {/* Grounded Natural Language Answer Card */}
                      <div
                        style={{
                          padding: '1.25rem',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <Sparkles size={16} style={{ color: '#60a5fa' }} />
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#60a5fa' }}>
                            Grounded Financial Insight
                          </h4>
                        </div>
                        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                          {renderAnswer(msg.response)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator for pending AI response */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontSize: '0.875rem' }}>
            <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>AI Assistant is analyzing financial dataset...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Bar & Sample Pills Footer */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-glass)',
          background: 'rgba(15, 23, 42, 0.9)',
        }}
      >
        {/* Question Submit Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              minLength={3}
              placeholder="Ask a financial question (e.g. What was total transaction amount by channel in 2024?)"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || question.trim().length < 3}
              style={{
                padding: '0.75rem 1.4rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: 'none',
                background: loading || question.trim().length < 3
                  ? 'rgba(59, 130, 246, 0.4)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                cursor: loading || question.trim().length < 3 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Ask</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Chat Assistant Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Chat Assistant Encountered an Error</h3>
          <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const FinancialAssistant: React.FC<FinancialAssistantProps> = (props) => (
  <ChatErrorBoundary>
    <FinancialAssistantContent {...props} />
  </ChatErrorBoundary>
);
