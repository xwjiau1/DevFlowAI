import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("devflow.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    step_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    extracted_text TEXT,
    type TEXT,
    step_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default model if not exists
const defaultModelExists = (db.prepare("SELECT COUNT(*) as count FROM models WHERE id = 'default-gemini'").get() as any).count > 0;
if (!defaultModelExists) {
  db.prepare("INSERT INTO models (id, display_name, model_name, base_url, api_key, is_active) VALUES (?, ?, ?, ?, ?, ?)").run(
    'default-gemini',
    'Gemini 3.1 Pro',
    'gemini-3.1-pro-preview',
    'https://generativelanguage.googleapis.com/v1beta/openai/',
    process.env.GEMINI_API_KEY || '',
    1
  );
}

// Migration: Add step_number and folder_id to documents if missing
try {
  db.prepare("ALTER TABLE documents ADD COLUMN step_number INTEGER").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE documents ADD COLUMN folder_id TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE documents ADD COLUMN extracted_text TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE messages ADD COLUMN prompt_tokens INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE messages ADD COLUMN completion_tokens INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'todo'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE reviews ADD COLUMN remark TEXT").run();
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.get("/api/projects", (req, res) => {
    console.log("GET /api/projects");
    try {
      const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/projects", (req, res) => {
    const { id, name, description } = req.body;
    db.prepare("INSERT INTO projects (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
    res.json({ success: true });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const projectId = req.params.id;
    // Delete related data first
    db.prepare("DELETE FROM messages WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM tasks WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM documents WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM reviews WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/messages", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(req.params.id);
    res.json(messages);
  });

  app.post("/api/projects/:id/messages", (req, res) => {
    const { id: msgId, role, content, prompt_tokens, completion_tokens } = req.body;
    db.prepare("INSERT INTO messages (id, project_id, role, content, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?)").run(
      msgId, 
      req.params.id, 
      role, 
      content, 
      prompt_tokens || 0, 
      completion_tokens || 0
    );
    res.json({ success: true });
  });

  app.delete("/api/projects/:id/messages", (req, res) => {
    db.prepare("DELETE FROM messages WHERE project_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY step_number ASC").all(req.params.id);
    res.json(tasks);
  });

  app.post("/api/projects/:id/tasks", (req, res) => {
    const { id: taskId, title, step_number, status } = req.body;
    db.prepare("INSERT INTO tasks (id, project_id, title, step_number, status) VALUES (?, ?, ?, ?, ?)").run(taskId, req.params.id, title, step_number, status || 'todo');
    res.json({ success: true });
  });

  app.patch("/api/projects/:id/tasks/:taskId", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE tasks SET status = ? WHERE id = ? AND project_id = ?").run(status, req.params.taskId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/documents", (req, res) => {
    const docs = db.prepare("SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(docs);
  });

  app.post("/api/projects/:id/documents", (req, res) => {
    const { id: docId, title, content, extracted_text, type, step_number, folder_id } = req.body;
    let finalFolderId = folder_id;

    // Auto-sync logic for lifecycle steps
    if (step_number && !finalFolderId) {
      const stepNames: Record<number, string> = {
        1: '需求确认',
        2: 'AW 任务项',
        3: '整体流程图',
        4: '开发方案',
        5: '原型开发',
        6: '过程进度',
        7: '文档输出'
      };
      const folderName = stepNames[step_number] || `Step ${step_number}`;
      
      let folder = db.prepare("SELECT id FROM folders WHERE project_id = ? AND name = ?").get(req.params.id, folderName) as { id: string } | undefined;
      
      if (!folder) {
        const newFolderId = Math.random().toString(36).substring(7);
        db.prepare("INSERT INTO folders (id, project_id, name) VALUES (?, ?, ?)").run(newFolderId, req.params.id, folderName);
        finalFolderId = newFolderId;
      } else {
        finalFolderId = folder.id;
      }
    }

    db.prepare("INSERT INTO documents (id, project_id, title, content, extracted_text, type, step_number, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(docId, req.params.id, title, content, extracted_text || null, type, step_number || null, finalFolderId || null);
    res.json({ success: true });
  });

  app.delete("/api/projects/:id/documents/:docId", (req, res) => {
    db.prepare("DELETE FROM documents WHERE id = ? AND project_id = ?").run(req.params.docId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/folders", (req, res) => {
    const folders = db.prepare("SELECT * FROM folders WHERE project_id = ? ORDER BY created_at ASC").all(req.params.id);
    res.json(folders);
  });

  app.post("/api/projects/:id/folders", (req, res) => {
    const { id: folderId, name } = req.body;
    db.prepare("INSERT INTO folders (id, project_id, name) VALUES (?, ?, ?)").run(folderId, req.params.id, name);
    res.json({ success: true });
  });

  app.delete("/api/projects/:id/folders/:folderId", (req, res) => {
    // Optionally move docs to uncategorized or delete them. User said "Docs中的文档支持打开预览和删除", 
    // usually deleting a folder might delete docs or just unassign them. 
    // Let's just unassign them for safety.
    db.prepare("UPDATE documents SET folder_id = NULL WHERE folder_id = ? AND project_id = ?").run(req.params.folderId, req.params.id);
    db.prepare("DELETE FROM folders WHERE id = ? AND project_id = ?").run(req.params.folderId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/reviews", (req, res) => {
    const reviews = db.prepare("SELECT * FROM reviews WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(reviews);
  });

  app.post("/api/projects/:id/reviews", (req, res) => {
    const { id: reviewId, content } = req.body;
    db.prepare("INSERT INTO reviews (id, project_id, content, status) VALUES (?, ?, ?, 'todo')").run(reviewId, req.params.id, content);
    res.json({ success: true });
  });

  app.patch("/api/projects/:id/reviews/:reviewId", (req, res) => {
    const { status, remark } = req.body;
    if (status !== undefined && remark !== undefined) {
      db.prepare("UPDATE reviews SET status = ?, remark = ? WHERE id = ? AND project_id = ?").run(status, remark, req.params.reviewId, req.params.id);
    } else if (status !== undefined) {
      db.prepare("UPDATE reviews SET status = ? WHERE id = ? AND project_id = ?").run(status, req.params.reviewId, req.params.id);
    } else if (remark !== undefined) {
      db.prepare("UPDATE reviews SET remark = ? WHERE id = ? AND project_id = ?").run(remark, req.params.reviewId, req.params.id);
    }
    res.json({ success: true });
  });

  // Model Routes
  app.get("/api/models", (req, res) => {
    const models = db.prepare("SELECT * FROM models ORDER BY created_at ASC").all();
    res.json(models);
  });

  app.post("/api/models", (req, res) => {
    const { id, display_name, model_name, base_url, api_key } = req.body;
    db.prepare("INSERT INTO models (id, display_name, model_name, base_url, api_key, is_active) VALUES (?, ?, ?, ?, ?, 0)").run(id, display_name, model_name, base_url, api_key);
    res.json({ success: true });
  });

  app.patch("/api/models/:id", (req, res) => {
    const { display_name, model_name, base_url, api_key } = req.body;
    db.prepare("UPDATE models SET display_name = ?, model_name = ?, base_url = ?, api_key = ? WHERE id = ?").run(display_name, model_name, base_url, api_key, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/models/:id/activate", (req, res) => {
    db.prepare("UPDATE models SET is_active = 0").run();
    db.prepare("UPDATE models SET is_active = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/models/:id", (req, res) => {
    if (req.params.id === 'default-gemini') {
      return res.status(400).json({ error: "Cannot delete default model" });
    }
    db.prepare("DELETE FROM models WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Backup & Restore Routes
  app.get("/api/backup/export", (req, res) => {
    try {
      const data = {
        projects: db.prepare("SELECT * FROM projects").all(),
        messages: db.prepare("SELECT * FROM messages").all(),
        tasks: db.prepare("SELECT * FROM tasks").all(),
        documents: db.prepare("SELECT * FROM documents").all(),
        reviews: db.prepare("SELECT * FROM reviews").all(),
        folders: db.prepare("SELECT * FROM folders").all(),
        models: db.prepare("SELECT * FROM models").all(),
      };
      res.json(data);
    } catch (error) {
      console.error("Export failed:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.post("/api/backup/import", (req, res) => {
    const data = req.body;
    try {
      db.transaction(() => {
        if (data.projects) {
          const stmt = db.prepare("INSERT OR REPLACE INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)");
          data.projects.forEach((p: any) => stmt.run(p.id, p.name, p.description, p.created_at));
        }
        if (data.messages) {
          const stmt = db.prepare("INSERT OR REPLACE INTO messages (id, project_id, role, content, prompt_tokens, completion_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
          data.messages.forEach((m: any) => stmt.run(m.id, m.project_id, m.role, m.content, m.prompt_tokens, m.completion_tokens, m.created_at));
        }
        if (data.tasks) {
          const stmt = db.prepare("INSERT OR REPLACE INTO tasks (id, project_id, title, status, step_number, created_at) VALUES (?, ?, ?, ?, ?, ?)");
          data.tasks.forEach((t: any) => stmt.run(t.id, t.project_id, t.title, t.status, t.step_number, t.created_at));
        }
        if (data.documents) {
          const stmt = db.prepare("INSERT OR REPLACE INTO documents (id, project_id, title, content, extracted_text, type, step_number, folder_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
          data.documents.forEach((d: any) => stmt.run(d.id, d.project_id, d.title, d.content, d.extracted_text, d.type, d.step_number, d.folder_id, d.created_at));
        }
        if (data.reviews) {
          const stmt = db.prepare("INSERT OR REPLACE INTO reviews (id, project_id, content, status, remark, created_at) VALUES (?, ?, ?, ?, ?, ?)");
          data.reviews.forEach((r: any) => stmt.run(r.id, r.project_id, r.content, r.status, r.remark, r.created_at));
        }
        if (data.folders) {
          const stmt = db.prepare("INSERT OR REPLACE INTO folders (id, project_id, name, created_at) VALUES (?, ?, ?, ?)");
          data.folders.forEach((f: any) => stmt.run(f.id, f.project_id, f.name, f.created_at));
        }
        if (data.models) {
          const stmt = db.prepare("INSERT OR REPLACE INTO models (id, display_name, model_name, base_url, api_key, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
          data.models.forEach((m: any) => stmt.run(m.id, m.display_name, m.model_name, m.base_url, m.api_key, m.is_active, m.created_at));
        }
      })();
      res.json({ success: true });
    } catch (error) {
      console.error("Import failed:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Catch-all for API routes that didn't match
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isProduction) {
    console.log("Starting in development mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode");
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Only serve index.html if it's not an API route
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
