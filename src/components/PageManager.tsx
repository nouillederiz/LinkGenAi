import { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from 'axios';
import { Plus, Trash2, Edit3, ExternalLink, FileText, Globe, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function PageManager() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await axios.get('/api/admin/pages');
      setPages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer cette page ?')) {
      await axios.delete(`/api/admin/pages/${id}`);
      fetchPages();
    }
  };

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.alias.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Pages personnalisées">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Rechercher une page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <Link
          to="/admin/pages/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Nouvelle page IA
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages.map((page) => (
          <motion.div
            layout
            key={page.id}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-emerald-500/30 transition-all"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
                  <FileText size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/pages/edit/${page.id}`}
                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-all"
                    title="Modifier"
                  >
                    <Edit3 size={18} />
                  </Link>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-white mb-1 truncate">{page.title}</h3>
              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                <Globe size={14} />
                <span className="font-mono">/p/{page.alias}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <span className="text-xs text-zinc-600">
                  {new Date(page.created_at).toLocaleDateString()}
                </span>
                <a
                  href={`/p/${page.alias}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                >
                  Voir la page <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredPages.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">Aucune page trouvée</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
