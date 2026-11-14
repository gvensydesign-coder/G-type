import { readdir, readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ORDER = ["tester", "design", "layout", "distort"];

export async function GET() {
  const root = process.cwd();
  const dir = path.join(root, "data", "agents");
  const agents = [];
  try {
    const names = await readdir(dir);
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readFile(path.join(dir, name), "utf8");
      agents.push(JSON.parse(raw));
    }
  } catch {
    return Response.json({ agents: [], patchStamp: 0 });
  }
  agents.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  let patchStamp = 0;
  for (const file of ["layout.js", "visual.js", "distortion.js"]) {
    try {
      const s = await stat(path.join(root, "public", "patches", file));
      patchStamp = Math.max(patchStamp, s.mtimeMs);
    } catch {
      /* patch not written yet */
    }
  }

  return Response.json(
    { agents, patchStamp },
    { headers: { "cache-control": "no-store" } },
  );
}
