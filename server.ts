import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const authMiddleware = (req: any, res: any, next: any) => {
    const session = req.cookies.session;
    if (session === "admin-session-id") {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // --- Public Routes ---

  // Link Redirection
  app.get("/l/:alias", async (req, res) => {
    const { alias } = req.params;
    const { data: link, error } = await supabase
      .from("links")
      .select("*")
      .eq("alias", alias)
      .single();

    if (error || !link) {
      return res.status(404).send("Link not found");
    }

    // Log visit (async, don't wait)
    supabase.from("visits").insert({
      type: "link",
      target_alias: alias,
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer")
    }).then();

    // Check if it's a bot for metadata
    const ua = req.get("user-agent") || "";
    const isBot = /bot|facebookexternalhit|twitterbot|googlebot|whatsapp|viber|discordapp/i.test(ua);

    if (isBot) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${link.title || 'Lien raccourci'}</title>
          <meta property="og:title" content="${link.title || ''}" />
          <meta property="og:description" content="${link.description || ''}" />
          <meta property="og:image" content="${link.image_url || ''}" />
          <meta name="twitter:card" content="summary_large_image">
          <meta http-equiv="refresh" content="0;url=${link.target_url}">
        </head>
        <body>
          Redirecting to <a href="${link.target_url}">${link.target_url}</a>
        </body>
        </html>
      `);
    }

    res.redirect(link.target_url);
  });

  // Custom Page Serving
  app.get("/p/:alias", async (req, res) => {
    const { alias } = req.params;
    const { data: page, error } = await supabase
      .from("pages")
      .select("*")
      .eq("alias", alias)
      .single();

    if (error || !page) {
      return res.status(404).send("Page not found");
    }

    // Log visit (async)
    supabase.from("visits").insert({
      type: "page",
      target_alias: alias,
      ip: req.ip,
      user_agent: req.get("user-agent"),
      referer: req.get("referer")
    }).then();

    res.send(page.content);
  });

  // --- Admin API Routes ---

  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are missing!");
      return res.status(500).json({ error: "Configuration serveur manquante (Variables Supabase)" });
    }

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error) {
        console.error("Supabase Login Error:", error.message);
        return res.status(401).json({ error: "Identifiants invalides ou erreur base de données" });
      }

      if (user) {
        res.cookie("session", "admin-session-id", { httpOnly: true, sameSite: 'none', secure: true });
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Utilisateur non trouvé" });
      }
    } catch (err: any) {
      console.error("Login unexpected error:", err);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("session");
    res.json({ success: true });
  });

  app.get("/api/admin/check", (req, res) => {
    if (req.cookies.session === "admin-session-id") {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Stats
  app.get("/api/admin/stats", authMiddleware, async (req, res) => {
    const { count: totalLinks } = await supabase.from("links").select("*", { count: 'exact', head: true });
    const { count: totalPages } = await supabase.from("pages").select("*", { count: 'exact', head: true });
    const { count: totalVisits } = await supabase.from("visits").select("*", { count: 'exact', head: true });
    const { data: recentVisits } = await supabase.from("visits").select("*").order("timestamp", { ascending: false }).limit(50);

    res.json({
      totalLinks: totalLinks || 0,
      totalPages: totalPages || 0,
      totalVisits: totalVisits || 0,
      recentVisits: recentVisits || []
    });
  });

  // Links CRUD
  app.get("/api/admin/links", authMiddleware, async (req, res) => {
    const { data: links } = await supabase.from("links").select("*").order("created_at", { ascending: false });
    res.json(links || []);
  });

  app.post("/api/admin/links", authMiddleware, async (req, res) => {
    const { alias, target_url, title, description, image_url } = req.body;
    const { error } = await supabase.from("links").insert({ alias, target_url, title, description, image_url });
    if (error) {
      res.status(400).json({ error: error.message });
    } else {
      res.json({ success: true });
    }
  });

  app.delete("/api/admin/links/:id", authMiddleware, async (req, res) => {
    const { error } = await supabase.from("links").delete().eq("id", req.params.id);
    if (error) res.status(400).json({ error: error.message });
    else res.json({ success: true });
  });

  // Pages CRUD
  app.get("/api/admin/pages", authMiddleware, async (req, res) => {
    const { data: pages } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    res.json(pages || []);
  });

  app.post("/api/admin/pages", authMiddleware, async (req, res) => {
    const { alias, title, content } = req.body;
    const { error } = await supabase.from("pages").insert({ alias, title, content });
    if (error) res.status(400).json({ error: error.message });
    else res.json({ success: true });
  });

  app.put("/api/admin/pages/:id", authMiddleware, async (req, res) => {
    const { title, content, alias } = req.body;
    const { error } = await supabase.from("pages").update({ title, content, alias }).eq("id", req.params.id);
    if (error) res.status(400).json({ error: error.message });
    else res.json({ success: true });
  });

  app.delete("/api/admin/pages/:id", authMiddleware, async (req, res) => {
    const { error } = await supabase.from("pages").delete().eq("id", req.params.id);
    if (error) res.status(400).json({ error: error.message });
    else res.json({ success: true });
  });

  // AI Generation
  app.post("/api/ai/generate", authMiddleware, async (req, res) => {
    const { prompt, currentCode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `Tu es un expert en développement web. Ta tâche est de générer ou modifier du code HTML/CSS/JS pour une page web. 
    Réponds UNIQUEMENT avec le code complet de la page, sans explications, sans blocs de code markdown. 
    Le code doit être moderne, responsive (Tailwind CSS est disponible via CDN si tu veux l'utiliser), et esthétique.
    Si du code existant est fourni, modifie-le selon les instructions. Sinon, crée une nouvelle page à partir de zéro.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Instructions: ${prompt}\n\nCode actuel:\n${currentCode || ''}`,
        config: { systemInstruction }
      });
      
      res.json({ code: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
