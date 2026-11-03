// Builds the folder you upload to the hosting "htdocs" folder:  deploy/htdocs/
//   index.html + assets/ + .htaccess       <- the React website (from "npm run build")
//   awarenessalert-api/                    <- the PHP API (without your local uploads / database export)
// Run with:  npm run deploy:package
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const dist = join(root, "dist")
const api = join(root, "Backend", "awarenessalert-api")
const out = join(root, "deploy", "htdocs")

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html not found. Run  npm run build  first (npm run deploy:package does both).")
  process.exit(1)
}

rmSync(join(root, "deploy"), { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// 1. the website
cpSync(dist, out, { recursive: true })

// 2. the PHP API (skip private / local-only files)
const skip = new Set(["uploads", "database.sql", "config.php", "uploads.htaccess"])
const apiOut = join(out, "awarenessalert-api")
mkdirSync(apiOut, { recursive: true })
for (const name of readdirSync(api)) {
  if (skip.has(name)) continue
  const from = join(api, name)
  cpSync(from, join(apiOut, name), { recursive: statSync(from).isDirectory() })
}

// 3. empty uploads folder that can never run code
mkdirSync(join(apiOut, "uploads"), { recursive: true })
copyFileSync(join(api, "uploads.htaccess"), join(apiOut, "uploads", ".htaccess"))

const count = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, entry) => n + (entry.isDirectory() ? count(join(dir, entry.name)) : 1),
    0,
  )
console.log(`Ready: deploy/htdocs  (${count(out)} files)`)
console.log("Next: copy config.sample.php to config.php inside deploy/htdocs/awarenessalert-api and fill it in,")
console.log("then upload EVERYTHING inside deploy/htdocs to the hosting htdocs folder.")
