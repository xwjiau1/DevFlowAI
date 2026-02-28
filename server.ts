import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("devflow.db");

// Dynamic imports for optional dependencies
let multer: any = null;
let AdmZip: any = null;
let upload: any = null;

// Try to import optional dependencies
try {
  // @ts-ignore - Optional dependency
  multer = (await import("multer")).default;
  // @ts-ignore - Optional dependency
  AdmZip = (await import("adm-zip")).default;
  
  // Configure multer for file upload
  upload = multer({
    dest: os.tmpdir(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
      // Only allow zip files
      if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
        cb(null, true);
      } else {
        cb(new Error("Only zip files are allowed"), false);
      }
    },
  });
} catch (error) {
  console.warn("Optional dependencies not available (multer, adm-zip). Zip import feature will be disabled.");
  console.warn("To enable zip import, run: npm install adm-zip multer");
}

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
    step_number INTEGER,
    status TEXT DEFAULT 'todo',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_id) REFERENCES folders(id)
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
try {
  db.prepare("ALTER TABLE reviews ADD COLUMN step_number INTEGER").run();
} catch (e) {}
// Migration: Add parent_id to folders if missing
try {
  db.prepare("ALTER TABLE folders ADD COLUMN parent_id TEXT").run();
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

  app.delete("/api/projects/:id/tasks/:taskId", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ? AND project_id = ?").run(req.params.taskId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/documents", (req, res) => {
    const docs = db.prepare("SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(docs);
  });

  app.post("/api/projects/:id/documents", (req, res) => {
    const { id: docId, title, content, extracted_text, type, step_number, folder_id } = req.body;
    
    // Removed auto-sync logic for lifecycle steps - no longer creates folders automatically
    
    db.prepare("INSERT INTO documents (id, project_id, title, content, extracted_text, type, step_number, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(docId, req.params.id, title, content, extracted_text || null, type, step_number || null, folder_id || null);
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
    const { id: folderId, name, parent_id } = req.body;
    
    try {
      // Check if folder with same name exists in the same parent directory
      let existingFolder;
      if (parent_id === null || parent_id === undefined) {
        existingFolder = db.prepare(
          "SELECT id FROM folders WHERE project_id = ? AND name = ? AND parent_id IS NULL"
        ).get(req.params.id, name);
      } else {
        existingFolder = db.prepare(
          "SELECT id FROM folders WHERE project_id = ? AND name = ? AND parent_id = ?"
        ).get(req.params.id, name, parent_id);
      }
      
      if (existingFolder) {
        return res.status(400).json({ error: "Folder with the same name already exists in this directory" });
      }
      
      db.prepare("INSERT INTO folders (id, project_id, parent_id, name) VALUES (?, ?, ?, ?)").run(
        folderId, req.params.id, parent_id || null, name
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/projects/:id/folders/:folderId", (req, res) => {
    const projectId = req.params.id;
    const folderId = req.params.folderId;
    
    // Get all child folders recursively
    const getChildFolders = (parentId: string): string[] => {
      const childFolders = db.prepare(
        "SELECT id FROM folders WHERE parent_id = ? AND project_id = ?"
      ).all(parentId, projectId) as { id: string }[];
      
      let allChildIds: string[] = [];
      for (const folder of childFolders) {
        allChildIds.push(folder.id);
        allChildIds = allChildIds.concat(getChildFolders(folder.id));
      }
      return allChildIds;
    };
    
    // Get all child folder IDs including current folder
    const allFolderIds = [folderId, ...getChildFolders(folderId)];
    
    // Update documents in all folders to have no folder_id
    for (const id of allFolderIds) {
      db.prepare("UPDATE documents SET folder_id = NULL WHERE folder_id = ? AND project_id = ?").run(id, projectId);
    }
    
    // Delete all child folders
    for (const id of allFolderIds) {
      db.prepare("DELETE FROM folders WHERE id = ? AND project_id = ?").run(id, projectId);
    }
    
    res.json({ success: true });
  });

  app.get("/api/projects/:id/reviews", (req, res) => {
    const reviews = db.prepare("SELECT * FROM reviews WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(reviews);
  });

  app.post("/api/projects/:id/reviews", (req, res) => {
    const { id: reviewId, content, step_number } = req.body;
    db.prepare("INSERT INTO reviews (id, project_id, content, step_number, status) VALUES (?, ?, ?, ?, 'todo')").run(reviewId, req.params.id, content, step_number);
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
          const stmt = db.prepare("INSERT OR REPLACE INTO folders (id, project_id, name, parent_id, created_at) VALUES (?, ?, ?, ?, ?)");
          data.folders.forEach((f: any) => stmt.run(f.id, f.project_id, f.name, f.parent_id || null, f.created_at));
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

  // Compressed Package Import Route
  app.post("/api/projects/:id/import-zip", (req, res) => {
    // Check if dependencies are available
    if (!multer || !AdmZip || !upload) {
      return res.status(501).json({
        error: "Zip import feature is not available",
        details: "Please install required dependencies: npm install adm-zip multer"
      });
    }
    
    // Use upload middleware if available
    const uploadMiddleware = upload.single("file");
    
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      const projectId = req.params.id;
      const file = (req as any).file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      try {
        // Read the zip file
        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        
        // Import summary
        const summary = {
          totalFiles: 0,
          importedFiles: 0,
          skippedFiles: 0,
          foldersCreated: 0,
          errors: []
        };
        
        // Create a map to store folder paths to their IDs
        const folderMap: Record<string, string> = {};
        
        // Process all entries
        for (const entry of zipEntries) {
          if (entry.isDirectory) {
            continue; // Skip directories, we'll create them when processing files
          }
          
          summary.totalFiles++;
          
          try {
            const entryPath = entry.entryName;
            const pathParts = entryPath.split("/");
            const fileName = pathParts.pop()!;
            const folderPath = pathParts.join("/");
            
            // Determine the file type based on extension
            const ext = path.extname(fileName).toLowerCase();
            let fileType = "markdown";
            if ([".md", ".markdown"].includes(ext)) {
              fileType = "markdown";
            } else if ([".txt"].includes(ext)) {
              fileType = "text";
            } else {
              // Skip unsupported file types
              summary.skippedFiles++;
              continue;
            }
            
            // Create folders if they don't exist
            let currentParentId: string | null = null;
            let currentPath = "";
            
            for (const folderName of pathParts) {
              currentPath += (currentPath ? "/" : "") + folderName;
              
              if (!folderMap[currentPath]) {
                // Check if folder already exists in database
                const existingFolder = db.prepare(
                  "SELECT id FROM folders WHERE project_id = ? AND name = ? AND parent_id = ?"
                ).get(projectId, folderName, currentParentId);
                
                if (existingFolder) {
                  folderMap[currentPath] = existingFolder.id;
                } else {
                  // Create new folder
                  const folderId = Math.random().toString(36).substring(7);
                  db.prepare(
                    "INSERT INTO folders (id, project_id, parent_id, name) VALUES (?, ?, ?, ?)"
                  ).run(folderId, projectId, currentParentId, folderName);
                  folderMap[currentPath] = folderId;
                  summary.foldersCreated++;
                }
              }
              
              currentParentId = folderMap[currentPath];
            }
            
            // Read file content
            const content = entry.getData().toString("utf-8");
            
            // Check if file already exists in this folder
            const existingFile = db.prepare(
              "SELECT id FROM documents WHERE project_id = ? AND title = ? AND folder_id = ?"
            ).get(projectId, fileName, currentParentId);
            
            if (existingFile) {
              // Update existing file
              db.prepare(
                "UPDATE documents SET content = ?, type = ? WHERE id = ? AND project_id = ?"
              ).run(content, fileType, existingFile.id, projectId);
            } else {
              // Create new file
              const docId = Math.random().toString(36).substring(7);
              db.prepare(
                "INSERT INTO documents (id, project_id, title, content, type, folder_id) VALUES (?, ?, ?, ?, ?, ?)"
              ).run(docId, projectId, fileName, content, fileType, currentParentId);
            }
            
            summary.importedFiles++;
          } catch (error) {
            summary.errors.push(`Error processing file ${entry.entryName}: ${error instanceof Error ? error.message : String(error)}`);
            summary.skippedFiles++;
          }
        }
        
        // Clean up temporary file
        fs.unlinkSync(file.path);
        
        res.json({
          success: true,
          summary
        });
      } catch (error) {
        console.error("Zip import error:", error);
        
        // Clean up temporary file if it exists
        if (file && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        res.status(500).json({
          error: "Failed to import zip file",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
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
