#!/usr/bin/env node
/**
 * 从 topxai.cn 站点 API 同步工具与类目数据到 data/。
 *
 * 设计要点：
 * - 只覆盖中文来源字段（name/desc/category/url/tags/visits），**保留已有的英文翻译**，
 *   避免自动化把人工翻译冲掉。
 * - 新出现的工具会被标记 `en` 为空，并在结束时打印待翻译清单。
 *
 * 用法：
 *   SITE=https://topxai.cn node scripts/sync.mjs
 *   SITE=http://localhost:3000 node scripts/sync.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = (process.env.SITE || "http://localhost:3000").replace(/\/$/, "");
const PAGE_SIZE = 50;

/** 去掉站点外链上的 utm_source 追踪参数，仓库里只留干净的官方地址 */
function cleanUrl(u) {
  if (!u) return "";
  return u
    .replace(/[?&]utm_source=[^&]*/g, "")
    .replace(/[?&]$/, "")
    .replace(/\?$/, "")
    .trim();
}

/** 把 markdown 正文压成纯文本，供补全截断的描述用 */
function stripMarkdown(s) {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 在 limit 字符内取「以句末标点收尾、且不短于 min」的最长片段；
 * 取不到则硬截并补省略号。用于把被切断的句子补完整。
 */
function completeSentence(text, limit, min = 0) {
  const positions = [];
  const re = /[。！？]/g;
  let m;
  while ((m = re.exec(text))) positions.push(m.index + 1);
  const ok = positions.filter((p) => p <= limit && p >= min);
  if (ok.length) return text.slice(0, Math.max(...ok));
  // 没有可用的句末标点：退到最后一个顿号/逗号处收尾，避免把词切断
  const hard = text.slice(0, limit);
  const atDelim = hard.replace(/[、，,；;][^、，,；;]*$/, "");
  const tail = atDelim.length >= min ? atDelim : hard;
  return tail.length < text.length ? `${tail}…` : tail;
}

/**
 * 站点接口的 description 被硬性截断在 89 字符左右，会把句子切断（如「并提供 AP」）。
 * 这里检测到截断时，从 content 全文里把描述补到完整句子，并控制在 120 字符内，
 * 避免与未截断条目（60–90 字符）长度差得太多。
 */
function normalizeDesc(desc, content) {
  const d = (desc || "").trim();
  if (!d) return completeSentence(stripMarkdown(content), 120, 55);
  if (/[。！？.!?]$/.test(d)) return d;

  // 短句只是缺句末标点，补一个句号保持清单内格式统一
  if (d.length < 85) return `${d}。`;

  const plain = stripMarkdown(content);
  const anchorPos = plain.indexOf(d.slice(0, 18));
  const aligned = anchorPos >= 0;
  const base = aligned ? plain.slice(anchorPos) : plain;
  const min = aligned ? Math.max(40, d.length - 12) : 55;
  return completeSentence(base, 120, min);
}

async function getJson(path, attempt = 1) {
  const url = `${SITE}${path}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "awesome-ai-toolbox-sync" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 3) throw new Error(`拉取 ${url} 失败：${err.message}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return getJson(path, attempt + 1);
  }
}

async function fetchAllTools() {
  const first = await getJson(`/api/tools?page=1&size=${PAGE_SIZE}`);
  const total = first.total ?? 0;
  const collected = [...(first.tools ?? [])];
  const pages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    const d = await getJson(`/api/tools?page=${p}&size=${PAGE_SIZE}`);
    collected.push(...(d.tools ?? []));
    process.stdout.write(`\r  已拉取 ${collected.length}/${total}`);
  }
  process.stdout.write("\n");
  return collected;
}

const main = async () => {
  console.log(`从 ${SITE} 同步…`);

  const [cats, remote, localRaw] = await Promise.all([
    getJson("/api/categories"),
    fetchAllTools(),
    readFile(join(ROOT, "data/tools.json"), "utf8").catch(() => "[]"),
  ]);

  const local = JSON.parse(localRaw);
  const prevBySlug = new Map(local.map((t) => [t.slug, t]));
  const catOrder = new Map(
    cats.filter((c) => !c.hidden).map((c, i) => [c.id, c.order ?? i + 1]),
  );
  const validCats = new Set(catOrder.keys());

  const next = [];
  const untranslated = [];
  let added = 0;
  let removed = 0;

  for (const t of remote) {
    if (t.hidden) continue;
    const prev = prevBySlug.get(t.slug);
    const category = validCats.has(t.categoryId) ? t.categoryId : "other";
    if (!prev) added++;
    const enName = prev?.name?.en && prev.name.en !== prev.name?.zh ? prev.name.en : "";
    const enDesc = prev?.desc?.en || "";
    if (!enDesc) untranslated.push(t.slug);
    next.push({
      slug: t.slug,
      name: { zh: t.name, en: enName || t.name },
      desc: { zh: normalizeDesc(t.description, t.content), en: enDesc },
      category,
      url: cleanUrl(t.url),
      tags: t.tags || [],
      visits: t.monthlyVisits || 0,
    });
  }

  const remoteSlugs = new Set(next.map((t) => t.slug));
  removed = local.filter((t) => !remoteSlugs.has(t.slug)).length;

  next.sort(
    (a, b) =>
      (catOrder.get(a.category) ?? 99) - (catOrder.get(b.category) ?? 99) ||
      a.slug.localeCompare(b.slug),
  );

  await writeFile(join(ROOT, "data/tools.json"), JSON.stringify(next, null, 1) + "\n");

  console.log(`\n工具：${next.length} 条（新增 ${added}，移除 ${removed}）`);
  console.log(`类目：${validCats.size} 个`);
  if (untranslated.length) {
    console.log(`\n⚠️ 待补英文描述：${untranslated.length} 条`);
    console.log(untranslated.slice(0, 40).map((s) => `  - ${s}`).join("\n"));
    if (untranslated.length > 40) console.log(`  … 其余 ${untranslated.length - 40} 条见 data/tools.json`);
  } else {
    console.log("\n✅ 全部条目均有英文描述");
  }
};

main().catch((err) => {
  console.error(`\n同步失败：${err.message}`);
  process.exit(1);
});
