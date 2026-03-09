import { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from 'axios';
import { Plus, Trash2, Copy, ExternalLink, Globe, Image as ImageIcon, Type, AlignLeft, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LinkManager() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState({
    alias: '',
    target_url: '',
    title: '',
    description: '',
    image_url: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await axios.get('/api/admin/links');
      setLinks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/admin/links', newLink);
      setNewLink({ alias: '', target_url: '', title: '', description: '', image_url: '' });
      setShowAdd(false);
      fetchLinks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer ce lien ?')) {
      await axios.delete(`/api/admin/links/${id}`);
      fetchLinks();
    }
  };

  const copyToClipboard = (alias: string) => {
    const url = `${window.location.origin}/l/${alias}`;
    navigator.clipboard.writeText(url);
    alert('Lien copié !');
  };

  return (
    <Layout title="Gestion des liens">
      <div className="flex justify-between items-center mb-8">
        <p className="text-zinc-400">Créez des liens courts avec des métadonnées personnalisées pour les réseaux sociaux.</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          Nouveau lien
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <form onSubmit={handleAdd} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Alias personnalisé (ex: promo2024)</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="text"
                        value={newLink.alias}
                        onChange={(e) => setNewLink({ ...newLink, alias: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="mon-lien"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">URL de destination</label>
                    <div className="relative">
                      <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="url"
                        value={newLink.target_url}
                        onChange={(e) => setNewLink({ ...newLink, target_url: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="https://google.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Titre Meta (OG Title)</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="text"
                        value={newLink.title}
                        onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Super Promo !"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">URL de l'image Meta (OG Image)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="url"
                        value={newLink.image_url}
                        onChange={(e) => setNewLink({ ...newLink, image_url: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="https://image.com/pic.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description Meta (OG Description)</label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 text-zinc-500" size={18} />
                  <textarea
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-24"
                    placeholder="Profitez de notre offre exceptionnelle..."
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all"
                >
                  Créer le lien
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {links.map((link) => (
          <motion.div
            layout
            key={link.id}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between gap-6"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-white truncate">{link.title || 'Sans titre'}</h3>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase">/{link.alias}</span>
              </div>
              <p className="text-zinc-500 text-sm truncate mb-2">{link.target_url}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-600">
                <span>Créé le {new Date(link.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(link.alias)}
                className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Copier le lien"
              >
                <Copy size={18} />
              </button>
              <a
                href={`/l/${link.alias}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                title="Ouvrir"
              >
                <ExternalLink size={18} />
              </a>
              <button
                onClick={() => handleDelete(link.id)}
                className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}

        {links.length === 0 && !loading && (
          <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <LinkIcon size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">Aucun lien raccourci pour le moment</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
