import { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from 'axios';
import { MousePointer2, Link as LinkIcon, FileText, Globe, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout title="Tableau de bord">Chargement...</Layout>;

  const cards = [
    { label: 'Visites totales', value: stats.totalVisits, icon: MousePointer2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Liens actifs', value: stats.totalLinks, icon: LinkIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Pages créées', value: stats.totalPages, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <Layout title="Tableau de bord">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
            <h3 className="text-zinc-400 text-sm font-medium mb-1">{card.label}</h3>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock size={20} className="text-zinc-500" />
            Visites récentes
          </h3>
          <button onClick={fetchStats} className="text-xs text-emerald-400 hover:underline">Rafraîchir</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Cible</th>
                <th className="px-6 py-4 font-medium">IP</th>
                <th className="px-6 py-4 font-medium">Navigateur</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {stats.recentVisits.map((visit: any) => (
                <tr key={visit.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      visit.type === 'link' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {visit.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-zinc-300">
                    /{visit.type === 'link' ? 'l' : 'p'}/{visit.target_alias}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{visit.ip}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500 max-w-xs truncate">
                    {visit.user_agent}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {new Date(visit.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {stats.recentVisits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 italic">
                    Aucune visite enregistrée pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
