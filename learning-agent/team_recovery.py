"""Guarded cross-session intent recovery for scientific/innovation projects.

This module only selects among existing persisted projects. It never creates a project,
executes a plan, or changes project state as a side effect of matching.
"""
import json
import re
import uuid

import learning_agent as agent
import team_orchestrator as team


def _candidates():
    with team.connection() as c:
        team.init(c)
        c.execute("""CREATE TABLE IF NOT EXISTS team_sessions(
            project_id TEXT NOT NULL, session_id TEXT NOT NULL, intent TEXT NOT NULL,
            matched_by TEXT NOT NULL, confidence REAL NOT NULL, created TEXT NOT NULL,
            PRIMARY KEY(project_id, session_id))""")
        rows = c.execute(
            "SELECT id,version,body FROM team_projects ORDER BY rowid DESC LIMIT 100"
        ).fetchall()
    out = []
    for row in rows:
        project = json.loads(row["body"])
        diagnosis = project.get("diagnosis") or {}
        plan = project.get("plan") or {}
        tasks = plan.get("tasks", [])
        out.append({
            "project_id": row["id"],
            "version": row["version"],
            "goal": str(project.get("goal") or "")[:700],
            "mode": project.get("mode", ""),
            "updated_at": project.get("updated_at", ""),
            "stage": (
                "WAITING_REVIEW" if any(t.get("status") == "pending_review" for t in tasks)
                else "PLAN_PREVIEW" if project.get("proposal")
                else "EXECUTING" if plan
                else "DIAGNOSING" if diagnosis
                else "MATERIAL_READY"
            ),
            "task_titles": [str(t.get("title") or "")[:120] for t in tasks[:12]],
            "gap_titles": [
                str(g.get("target_result") or g.get("gap_id") or "")[:120]
                for g in diagnosis.get("gaps", [])[:12]
            ],
        })
    return out


def recover(data):
    """Match a user's new-session intent against existing projects; fail closed."""
    if not isinstance(data, dict):
        raise ValueError("请求必须为 JSON 对象")
    intent = str(data.get("intent") or "").strip()[:2400]
    if len(intent) < 3:
        raise ValueError("请描述你想继续的项目或任务")
    session_id = str(data.get("session_id") or data.get("sessionId") or uuid.uuid4().hex).strip()[:160]
    if not session_id:
        raise ValueError("session_id 不能为空")
    candidates = _candidates()
    if not candidates:
        return {
            "ok": True, "project": None, "matches": [], "match_method": "none",
            "session_id": session_id, "note": "还没有可恢复的项目，请先创建真实项目。",
        }

    direct = [
        item for item in candidates
        if item["project_id"] in intent
        or (len(item["goal"].strip()) >= 5 and item["goal"].strip() in intent)
    ]
    chosen = direct[0] if len(direct) == 1 else None
    method, confidence, reason = (
        ("exact", 1.0, "输入包含已有项目 ID 或完整目标。") if chosen else ("none", 0.0, "")
    )

    if not chosen:
        cfg = agent.rescue.config_snapshot()
        if cfg.get("base") and cfg.get("model"):
            prompt = (
                "Choose the one existing project that best matches the user's intent. "
                "Only select a project_id from the candidates. If evidence is insufficient, return NONE. "
                "Do not create a project or merge merely similar topics. Return strict JSON with keys "
                "project_id, confidence (0..1), reason.\n"
                "User intent: " + intent + "\nCandidates: "
                + json.dumps(candidates, ensure_ascii=False)
            )
            try:
                raw = str(agent.rescue.complete([
                    {
                        "role": "system",
                        "content": (
                            "You are a cross-session project matcher. Select only a listed project_id. "
                            "Reply with JSON only. If uncertain, use project_id NONE and confidence 0."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ], cfg)).strip()
                fence = chr(96) * 3
                cleaned = raw.strip()
                if cleaned.startswith(fence):
                    cleaned = cleaned[len(fence):]
                    if cleaned.lower().startswith("json"):
                        cleaned = cleaned[4:]
                    if cleaned.rstrip().endswith(fence):
                        cleaned = cleaned.rstrip()[:-len(fence)]
                obj = json.loads(cleaned.strip())
                project_id = str(obj.get("project_id") or "")
                score = float(obj.get("confidence", 0))
                candidate = next((x for x in candidates if x["project_id"] == project_id), None)
                if candidate and 0.62 <= score <= 1:
                    chosen = candidate
                    method, confidence = "model_intent", score
                    reason = str(obj.get("reason") or "")[:500]
            except Exception:
                chosen = None

    if not chosen:
        return {
            "ok": True, "project": None, "matches": candidates[:8], "match_method": "none",
            "session_id": session_id, "needs_confirmation": True,
            "note": "没有足够证据自动匹配。请从候选项目中选择，避免混入其他项目的上下文。",
        }

    with team.connection() as c:
        team.init(c)
        c.execute("""CREATE TABLE IF NOT EXISTS team_sessions(
            project_id TEXT NOT NULL, session_id TEXT NOT NULL, intent TEXT NOT NULL,
            matched_by TEXT NOT NULL, confidence REAL NOT NULL, created TEXT NOT NULL,
            PRIMARY KEY(project_id, session_id))""")
        c.execute(
            "INSERT OR REPLACE INTO team_sessions VALUES(?,?,?,?,?,?)",
            (chosen["project_id"], session_id, intent, method, confidence, agent.now()),
        )
    project = team.state(chosen["project_id"])
    with team.connection() as c:
        links = c.execute(
            "SELECT session_id,intent,matched_by,confidence,created FROM team_sessions "
            "WHERE project_id=? ORDER BY created DESC LIMIT 30",
            (chosen["project_id"],),
        ).fetchall()
    project["session_links"] = [dict(row) for row in links]
    return {
        "ok": True, "project": project, "matches": [chosen], "match_method": method,
        "confidence": confidence, "reason": reason, "session_id": session_id,
        "needs_confirmation": True,
        "note": "找到可能相关的旧项目。请确认项目与阶段后再继续；匹配本身不会改写项目状态。",
    }
