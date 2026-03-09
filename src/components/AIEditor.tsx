import { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Send, Save, Eye, Code, ArrowLeft, Globe, Type, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AIEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [alias, setAlias] = useState('');
  const [code, setCode] = useState('<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-zinc-950 text-white flex items-center justify-center min-h-screen font-sans">\n  <div class="text-center">\n    <h1 class="text-4xl font-bold mb-4">Nouvelle Page</h1>\n    <p class="text-zinc-400">Demandez à l\'IA de générer votre contenu !</p>\n  </div>\n</body>\n</html>');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    try {
      const res = await axios.get('/api/admin/pages');
      const page = res.data.find((p: any) => p.id === parseInt(id!));
      if (page) {
        setTitle(page.title);
        setAlias(page.alias);
        setCode(page.content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/generate', {
        prompt: userMsg,
        currentCode: code
      });
      
      const newCode = res.data.code;
      setCode(newCode);
      setMessages(prev => [...prev, { role: 'ai', content: 'Code mis à jour avec succès !' }]);
      setView('preview');
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Erreur: ' + (err.response?.data?.error || 'Erreur inconnue') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !alias) {
      setStatus({ type: 'error', message: 'Titre et Alias requis' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      if (id) {
        await axios.put(`/api/admin/pages/${id}`, { title, alias, content: code });
      } else {
        await axios.post('/api/admin/pages', { title, alias, content: code });
      }
      setStatus({ type: 'success', message: 'Page enregistrée !' });
      setTimeout(() => navigate('/admin/pages'), 1500);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={id ? 'Modifier la page' : 'Créer une page avec l\'IA'}>
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-12rem)]">
        
        {/* Left Panel: Settings & Chat */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin/pages')} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-bold">Paramètres de la page</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Titre de gestion</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Ma super page"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Alias URL (/p/...)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="ma-page"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : <><Save size={18} /> Enregistrer la page</>}
            </button>

            {status && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs ${
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.message}
              </div>
            )}
          </div>

          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2 text-emerald-400">
              <Sparkles size={18} />
              <span className="font-bold text-sm">Assistant IA</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-600 text-sm italic">Décrivez la page que vous voulez créer...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-2xl text-sm animate-pulse">
                    L'IA réfléchit...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleGenerate} className="p-4 bg-zinc-950 border-t border-zinc-800">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ajoute un bouton rouge au milieu..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg disabled:opacity-30 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: Preview/Code */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setView('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === 'preview' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Eye size={14} /> Aperçu
              </button>
              <button
                onClick={() => setView('code')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === 'code' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Code size={14} /> Code
              </button>
            </div>
            <div className="flex items-center gap-2 px-4">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
          </div>

          <div className="flex-1 relative bg-white">
            {view === 'preview' ? (
              <iframe
                srcDoc={code}
                title="Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-forms allow-modals"
              />
            ) : (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-zinc-950 text-zinc-300 p-6 font-mono text-sm focus:outline-none resize-none"
                spellCheck={false}
              />
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
