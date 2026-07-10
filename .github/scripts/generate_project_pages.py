#!/usr/bin/env python3
"""Repo -> project-page pipeline.

Discovers repos (config: _data/pipeline.yml), compares each repo's HEAD
against the analyzed_sha recorded in its _projects/ page, and drafts or
refreshes pages for anything new or changed. Analysis reads the repo via the
GitHub API (README, file tree, manifests) — no clone — and asks Claude for a
strictly validated JSON draft. Mechanical front matter (shas, dates, flags)
is written by this script, never by the model.

Env:  GITHUB_TOKEN (required)
      CLAUDE_CODE_OAUTH_TOKEN  preferred — bills the Claude subscription via
                               headless Claude Code (create: `claude setup-token`)
      ANTHROPIC_API_KEY        fallback — metered Anthropic API
      (neither set: the run downgrades to plan-only — logs what it would do)
      PIPELINE_USE_LOCAL_CLAUDE=1  dev only: use the locally logged-in CLI
      TARGET_REPO (optional owner/name)   FORCE ("true" to re-analyze)
      MODEL (optional; SDK default claude-sonnet-5, subscription default = plan's)
Flags: --dry-run  plan only — no LLM calls, no writes.
"""

import json
import os
import re
import sys
import datetime
from pathlib import Path

import requests
import yaml

ROOT = Path(__file__).resolve().parents[2]
PROJECTS_DIR = ROOT / "_projects"
SUMMARY_PATH = ROOT / ".github" / "pipeline-summary.md"
API = "https://api.github.com"
DRY_RUN = "--dry-run" in sys.argv
TARGET = os.environ.get("TARGET_REPO", "").strip()
FORCE = os.environ.get("FORCE", "").lower() == "true"
MODEL = os.environ.get("MODEL", "").strip()
OAUTH = os.environ.get("CLAUDE_CODE_OAUTH_TOKEN", "").strip()
USE_LOCAL_CLI = os.environ.get("PIPELINE_USE_LOCAL_CLAUDE", "") == "1"
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
MODE_NOTE = ""

SESSION = requests.Session()
SESSION.headers.update({
    "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
})

MANIFESTS = [
    "package.json", "go.mod", "requirements.txt", "pyproject.toml",
    "Cargo.toml", "CMakeLists.txt", "Makefile", "Dockerfile",
    "docker-compose.yml",
]

SYSTEM_PROMPT = """You draft project pages for a software engineer's portfolio.

HARD RULES — the site's credibility depends on them:
- Every claim must be directly supported by the README, manifests, or file
  tree you are given. Never invent metrics, user counts, performance numbers,
  install bases, or completion status.
- If the repo looks unfinished (WIP wording, sparse README, prototype
  naming), set status to "in progress"; otherwise use null. Never imply a
  project is production software unless the README itself says so.
- demo_type is how this project could be demonstrated on a static site:
  "embed" (runs fully client-side in a browser page), "hosted" (needs a
  server backend), "walkthrough" (CLI/desktop/extension work best shown as a
  guided or recorded demo), "none" (not meant for a demo, e.g. writeups).
- Voice: confident, concrete, plain — no marketing fluff, no buzzword chains.

Return ONLY a JSON object, no markdown fences, with exactly these keys:
  title           string, <= 60 chars, human title (not the repo slug)
  excerpt         string, <= 160 chars, one plain sentence
  tech            string, comma-separated main technologies (from manifests)
  status          "in progress" or null
  demo_type       "embed" | "hosted" | "walkthrough" | "none"
  demo_rationale  string, <= 120 chars, why that demo_type
  bullets         array of 3-5 strings, each <= 140 chars, each a concrete,
                  traceable statement about what the project does or how it
                  is built
"""


def gh(path, **params):
    resp = SESSION.get(f"{API}{path}", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def gh_raw(path):
    resp = SESSION.get(
        f"{API}{path}", headers={"Accept": "application/vnd.github.raw+json"},
        timeout=30)
    resp.raise_for_status()
    return resp.text


def discover(cfg):
    """All candidate repos per config, as {full_name_lower: repo_json}."""
    repos = {}
    for owner in cfg.get("owners", []):
        page = 1
        while True:
            batch = gh(f"/users/{owner}/repos", per_page=100, page=page)
            for r in batch:
                repos[r["full_name"].lower()] = r
            if len(batch) < 100:
                break
            page += 1
    for full in cfg.get("extra_repos", []) or []:
        try:
            r = gh(f"/repos/{full}")
            r["_explicit"] = True  # opted in by name — bypasses the fork filter
            repos[r["full_name"].lower()] = r
        except requests.HTTPError as err:
            repos[full.lower()] = {"full_name": full, "_no_access": str(err)}
    excluded = {e.lower() for e in (cfg.get("exclude") or [])}
    out = {}
    for key, r in repos.items():
        if key in excluded:
            continue
        if (not cfg.get("include_forks", False) and r.get("fork")
                and not r.get("_explicit")):
            continue
        out[key] = r
    return out


def existing_pages():
    """{repo_full_lower: {path, fm}} for pages that declare a repo, plus a
    list of every page so unmapped ones are never collided with."""
    mapped, all_slugs = {}, set()
    for path in sorted(PROJECTS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if not m:
            continue
        fm = yaml.safe_load(m.group(1)) or {}
        all_slugs.add(path.stem)
        if fm.get("repo"):
            mapped[str(fm["repo"]).lower()] = {"path": path, "fm": fm}
    return mapped, all_slugs


def head_sha(repo):
    branch = gh(f"/repos/{repo['full_name']}/branches/{repo['default_branch']}")
    return branch["commit"]["sha"]


def gather_context(repo, sha):
    full = repo["full_name"]
    try:
        readme = gh_raw(f"/repos/{full}/readme")[:12000]
    except requests.HTTPError:
        readme = "(no README)"
    langs = gh(f"/repos/{full}/languages")
    tree = gh(f"/repos/{full}/git/trees/{sha}", recursive=1)
    paths = [t["path"] for t in tree.get("tree", []) if t["type"] == "blob"]
    manifest_texts = {}
    for name in MANIFESTS:
        if name in paths and len(manifest_texts) < 4:
            try:
                manifest_texts[name] = gh_raw(f"/repos/{full}/contents/{name}")[:6000]
            except requests.HTTPError:
                pass
    return {
        "full_name": full,
        "description": repo.get("description") or "",
        "topics": repo.get("topics") or [],
        "created_at": repo.get("created_at", ""),
        "pushed_at": repo.get("pushed_at", ""),
        "languages": langs,
        "readme": readme,
        "file_tree": paths[:400],
        "tree_truncated": len(paths) > 400,
        "manifests": manifest_texts,
    }


def model_call(user):
    """One completion. Prefers the Claude subscription (headless Claude Code,
    CLAUDE_CODE_OAUTH_TOKEN); falls back to the metered Anthropic SDK."""
    if OAUTH or USE_LOCAL_CLI:
        import subprocess
        cmd = ["claude", "-p", "--max-turns", "1"]
        if MODEL:
            cmd += ["--model", MODEL]
        proc = subprocess.run(cmd, input=SYSTEM_PROMPT + "\n\n" + user,
                              text=True, capture_output=True, timeout=300)
        if proc.returncode != 0:
            raise RuntimeError(f"claude -p failed: {proc.stderr[:300]}")
        return proc.stdout
    import anthropic
    msg = anthropic.Anthropic().messages.create(
        model=MODEL or "claude-sonnet-5", max_tokens=1600,
        system=SYSTEM_PROMPT, messages=[{"role": "user", "content": user}])
    return msg.content[0].text


def analyze(context):
    user = ("Draft the portfolio page JSON for this repository.\n\n"
            + json.dumps(context, indent=1))
    last_err = None
    for attempt in range(2):
        text = model_call(user if attempt == 0 else (
            f"{user}\n\nYour previous output failed validation "
            f"({last_err}). Return ONLY the corrected JSON object."))
        try:
            data = json.loads(re.search(r"\{.*\}", text, re.S).group(0))
            return validate(data)
        except (AttributeError, ValueError, AssertionError) as err:
            last_err = err
    raise ValueError(f"model output failed validation twice: {last_err}")


def validate(d):
    assert isinstance(d.get("title"), str) and 0 < len(d["title"]) <= 80, \
        f"title missing/too long: {d.get('title')!r}"
    assert isinstance(d.get("excerpt"), str) and 0 < len(d["excerpt"]) <= 200, \
        f"excerpt missing/too long: {d.get('excerpt')!r}"
    assert isinstance(d.get("tech"), str) and d["tech"], \
        f"tech missing/empty: {d.get('tech')!r}"
    assert d.get("status") in ("in progress", None), \
        f"status not 'in progress'/null: {d.get('status')!r}"
    assert d.get("demo_type") in ("embed", "hosted", "walkthrough", "none"), \
        f"demo_type invalid: {d.get('demo_type')!r}"
    assert isinstance(d.get("demo_rationale"), str), "demo_rationale missing"
    bullets = d.get("bullets")
    assert isinstance(bullets, list) and 3 <= len(bullets) <= 5, \
        f"bullets not a list of 3-5: {bullets!r}"
    assert all(isinstance(b, str) and len(b) <= 160 for b in bullets), \
        "a bullet exceeds 160 chars"
    return d


NON_CODE = re.compile(
    r"(^|/)(readme[^/]*|license[^/]*|\.gitignore|\.gitattributes)$"
    r"|\.(md|txt|rst|png|jpe?g|gif|svg|ico|pdf)$", re.I)


def has_code(paths):
    return any(not NON_CODE.search(p) for p in paths)


def write_page(slug, repo, sha, draft):
    fm = {
        "title": draft["title"],
        "excerpt": draft["excerpt"],
        "tech": draft["tech"],
        # Real date objects → unquoted YAML dates. Site templates sort on
        # startD; a quoted string here breaks Liquid's sort against the
        # hand-written pages' date values.
        "startD": datetime.date.fromisoformat(
            (repo.get("created_at") or "1970-01-01")[:10]),
        "githuburl": f"https://github.com/{repo['full_name']}",
        "repo": repo["full_name"],
        "featured": False,
        "managed": True,
        "demo_type": draft["demo_type"],
        "demo_rationale": draft["demo_rationale"],
        "analyzed_sha": sha,
        "analyzed_at": datetime.date.today(),
    }
    if draft["status"]:
        fm["status"] = draft["status"]
    body = "\n".join(f"- {b}" for b in draft["bullets"])
    front = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True,
                           default_flow_style=False).strip()
    (PROJECTS_DIR / f"{slug}.md").write_text(
        f"---\n{front}\n---\n\n{body}\n", encoding="utf-8")


def main():
    global DRY_RUN, MODE_NOTE
    # Empty secrets must not fail the nightly run — downgrade to a plan-only
    # sweep whose log shows exactly what a credentialed run would do.
    if not DRY_RUN and not (OAUTH or USE_LOCAL_CLI or API_KEY):
        DRY_RUN = True
        MODE_NOTE = (" — no AI credential configured; add CLAUDE_CODE_OAUTH_TOKEN "
                     "(Claude subscription: run `claude setup-token`) or "
                     "ANTHROPIC_API_KEY as a repository secret to go live")
        print("NOTE: no AI credential — plan-only run." + MODE_NOTE,
              file=sys.stderr)
    cfg = yaml.safe_load((ROOT / "_data" / "pipeline.yml").read_text())
    repos = discover(cfg)
    mapped, all_slugs = existing_pages()
    overrides = cfg.get("overrides") or {}
    rows, changed = [], 0

    for key in sorted(repos):
        repo = repos[key]
        full = repo["full_name"]
        if TARGET and TARGET.lower() != key:
            continue
        if "_no_access" in repo:
            rows.append((full, "no access — add REPOS_READ_TOKEN for private repos"))
            continue
        if repo.get("size") == 0:
            rows.append((full, "empty repo — nothing to analyze yet"))
            continue
        page = mapped.get(key)
        policy = (overrides.get(full, {}) or {}).get("update", cfg.get("update", "auto"))
        try:
            sha = head_sha(repo)
        except requests.HTTPError as err:
            rows.append((full, f"HEAD unreadable ({err.response.status_code}) — "
                               "private repo? add REPOS_READ_TOKEN"))
            continue

        if page and page["fm"].get("managed") is False:
            stale = page["fm"].get("analyzed_sha") not in (None, sha)
            note = "hand-written page — repo moved since last note" if stale \
                else "hand-written page — left alone"
            rows.append((full, note))
            continue
        if policy == "frozen" or (policy == "manual" and TARGET.lower() != key):
            rows.append((full, f"policy: {policy} — skipped"))
            continue
        if page and page["fm"].get("analyzed_sha") == sha and not FORCE:
            rows.append((full, "up to date"))
            continue

        action = "update" if page else "create"
        if DRY_RUN:
            rows.append((full, f"would {action} (HEAD {sha[:7]})"))
            continue
        try:
            context = gather_context(repo, sha)
            if not has_code(context["file_tree"]):
                rows.append((full, "README-only repo — nothing to showcase yet"))
                continue
            draft = analyze(context)
            slug = repo["name"].lower().replace("_", "-")
            if not page and slug in all_slugs:
                slug = f"{repo['owner']['login'].lower()}-{slug}"
            path_slug = page["path"].stem if page else slug
            write_page(path_slug, repo, sha, draft)
            changed += 1
            rows.append((full, f"{action}d page ({draft['demo_type']}, HEAD {sha[:7]})"))
        except Exception as err:  # one repo failing must not sink the sweep
            rows.append((full, f"FAILED: {err}"))

    lines = ["## Project-page pipeline run", "",
             f"Mode: {'plan-only' if DRY_RUN else 'live'}" + MODE_NOTE
             + (f" · target: {TARGET}" if TARGET else "")
             + (" · force" if FORCE else ""), "",
             "| Repo | Result |", "|---|---|"]
    lines += [f"| {full} | {note} |" for full, note in rows]
    lines += ["", "Review each draft before merging — the generator is told to",
              "claim only what the repo supports, and this PR is the gate.", ""]
    summary = "\n".join(lines)
    if not DRY_RUN:
        SUMMARY_PATH.write_text(summary, encoding="utf-8")
    print(summary)
    print(f"\n{changed} page(s) written.", file=sys.stderr)


if __name__ == "__main__":
    main()
