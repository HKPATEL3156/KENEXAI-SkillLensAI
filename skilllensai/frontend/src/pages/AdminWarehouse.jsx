import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import api from "../services/api";

// ─── API calls ────────────────────────────────────────────────────────────────
const whApi = (path, opts) =>
  api({ url: `/warehouse${path}`, ...opts });

const getToken = () => localStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = "indigo" }) => {
  const c = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  }[color] || "bg-slate-50 text-slate-700 border-slate-100";
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${c}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value ?? "—"}</div>
      {sub && <div className="mt-1 text-xs opacity-60">{sub}</div>}
    </div>
  );
};

const SectionCard = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
    <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
    {children}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const AdminWarehouse = () => {
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [schema, setSchema] = useState(null);
  const [topSkills, setTopSkills] = useState([]);
  const [fitDist, setFitDist] = useState([]);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Simulator state
  const [simStatus, setSimStatus] = useState(null);
  const [simInterval, setSimInterval] = useState(120);
  const [simBatch, setSimBatch] = useState(3);
  const [simLoading, setSimLoading] = useState(false);
  const [simMsg, setSimMsg] = useState("");

  // ETL state
  const [etlLoading, setEtlLoading] = useState(false);
  const [etlMsg, setEtlMsg] = useState("");

  const token = getToken();

  const fetchWarehouseData = useCallback(async () => {
    if (!token) { nav("/admin/login"); return; }
    setLoading(true);
    setErr("");
    try {
      const [sumRes, schRes, skillRes, fitRes, qualRes] = await Promise.allSettled([
        api.get("/warehouse/summary",        { headers: authHeaders() }),
        api.get("/warehouse/schema",         { headers: authHeaders() }),
        api.get("/warehouse/top-skills",     { headers: authHeaders() }),
        api.get("/warehouse/fit-distribution",{ headers: authHeaders() }),
        api.get("/warehouse/quality-metrics",{ headers: authHeaders() }),
      ]);
      if (sumRes.status === "fulfilled")   setSummary(sumRes.value.data);
      if (schRes.status === "fulfilled")   setSchema(schRes.value.data);
      if (skillRes.status === "fulfilled") setTopSkills(skillRes.value.data);
      if (fitRes.status === "fulfilled")   setFitDist(fitRes.value.data);
      if (qualRes.status === "fulfilled")  setQualityMetrics(qualRes.value.data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [token, nav]);

  const fetchSimStatus = useCallback(async () => {
    try {
      const r = await api.get("/warehouse/simulate/status", { headers: authHeaders() });
      setSimStatus(r.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchWarehouseData();
    fetchSimStatus();
    const iv = setInterval(fetchSimStatus, 10000);
    return () => clearInterval(iv);
  }, [fetchWarehouseData, fetchSimStatus]);

  const runEtl = async () => {
    setEtlLoading(true);
    setEtlMsg("Running ETL pipeline… this may take 10–30 seconds.");
    try {
      const r = await api.post("/warehouse/etl", {}, { headers: authHeaders(), timeout: 120000 });
      setEtlMsg(`✅ ETL complete! ${r.data.status}`);
      await fetchWarehouseData();
    } catch (e) {
      setEtlMsg(`❌ ETL failed: ${e?.response?.data?.message || e.message}`);
    } finally {
      setEtlLoading(false);
    }
  };

  const startSim = async () => {
    setSimLoading(true);
    try {
      const r = await api.post("/warehouse/simulate/start",
        { interval_seconds: simInterval, batch_size: simBatch },
        { headers: authHeaders() });
      setSimStatus(r.data);
      setSimMsg(`✅ Simulation started — generating ${simBatch} records every ${simInterval}s`);
    } catch (e) {
      setSimMsg(`❌ ${e?.response?.data?.message || e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const stopSim = async () => {
    setSimLoading(true);
    try {
      const r = await api.post("/warehouse/simulate/stop", {}, { headers: authHeaders() });
      setSimStatus(r.data);
      setSimMsg("⏹ Simulation stopped.");
    } catch (e) {
      setSimMsg(`❌ ${e?.response?.data?.message || e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const runOnce = async () => {
    setSimLoading(true);
    try {
      const r = await api.post(
        `/warehouse/simulate/run-once?batch_size=${simBatch}`,
        {},
        { headers: authHeaders() }
      );
      setSimMsg(`✅ Generated ${r.data.generated} candidate profiles!`);
      await fetchSimStatus();
    } catch (e) {
      setSimMsg(`❌ ${e?.response?.data?.message || e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const purgeSim = async () => {
    if (!window.confirm("Delete all synthetic data from the database?")) return;
    setSimLoading(true);
    try {
      const r = await api.delete("/warehouse/simulate/purge", { headers: authHeaders() });
      setSimMsg(`🗑 Purged: ${JSON.stringify(r.data.deleted)}`);
    } catch (e) {
      setSimMsg(`❌ ${e?.response?.data?.message || e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const fitColors = {
    "Excellent Fit": "bg-emerald-500",
    "Good Fit":      "bg-blue-500",
    "Moderate Fit":  "bg-amber-400",
    "Low Fit":       "bg-rose-400",
  };

  return (
    <AdminShell active="warehouse">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data Warehouse & Simulation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Star schema analytics, ETL pipeline controls, and live data simulation.
        </p>
      </div>

      {err && (
        <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          ⚠️ {err} — Make sure the Data Warehouse server is running on port 8001.
        </div>
      )}

      {/* ── SECTION 1: Platform KPIs ─────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">📊 Warehouse KPIs (Gold Layer)</h2>
          <div className="flex gap-2">
            <button
              onClick={runEtl}
              disabled={etlLoading}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {etlLoading ? "⏳ Running ETL…" : "⚡ Run ETL Pipeline"}
            </button>
            <button
              onClick={fetchWarehouseData}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        {etlMsg && (
          <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm text-indigo-700">
            {etlMsg}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard label="Candidates"    value={summary?.total_candidates}     color="indigo" />
            <StatCard label="Companies"     value={summary?.total_companies}      color="purple" />
            <StatCard label="Applications"  value={summary?.total_applications}   color="amber" />
            <StatCard label="Quiz Attempts" value={summary?.total_quiz_attempts}  sub={`Avg ${summary?.avg_quiz_score ?? 0}%`} color="emerald" />
            <StatCard label="Screenings"    value={summary?.total_screenings}     color="rose" />
          </div>
        )}
      </section>

      {/* ── SECTION 2: Skills + Fit Distribution ─────────────────────────────── */}
      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="🔑 Top Skills (bridge_user_skill)">
          {topSkills.length === 0 ? (
            <p className="text-xs text-slate-400">No data yet. Run ETL first.</p>
          ) : (
            <div className="space-y-2">
              {topSkills.slice(0, 12).map((s, i) => {
                const max = topSkills[0]?.user_count || 1;
                const pct = Math.round((s.user_count / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-32 truncate text-xs text-slate-600">{s.skill_name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{s.user_count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="🎯 Resume Fit Label Distribution">
          {fitDist.length === 0 ? (
            <p className="text-xs text-slate-400">No screening data yet.</p>
          ) : (
            <div className="space-y-3">
              {fitDist.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-slate-600">{f.fit_label}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fitColors[f.fit_label] || "bg-slate-400"}`}
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{f.count} ({f.pct}%)</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      {/* ── SECTION 3: Schema Overview ───────────────────────────────────────── */}
      {schema && (
        <section className="mb-6">
          <SectionCard title="🏛️ Warehouse Schema (Table Row Counts)">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(schema).map(([table, count]) => {
                const layer = table.startsWith("bronze") ? "bronze"
                  : table.startsWith("dim") ? "silver"
                  : table.startsWith("fact") || table.startsWith("bridge") ? "gold"
                  : "other";
                const bg = { bronze: "bg-orange-50 border-orange-200", silver: "bg-blue-50 border-blue-200", gold: "bg-yellow-50 border-yellow-200", other: "bg-slate-50 border-slate-200" }[layer];
                return (
                  <div key={table} className={`rounded-xl border px-3 py-2 text-xs ${bg}`}>
                    <div className="font-mono font-semibold">{table}</div>
                    <div className="mt-0.5 text-lg font-bold">{count}</div>
                    <div className="opacity-60 capitalize">{layer}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>
      )}

      {/* ── SECTION 4: Data Quality Metrics ─────────────────────────────────── */}
      {qualityMetrics && !qualityMetrics.error && (
        <section className="mb-6">
          <SectionCard title="✅ Post-ETL Data Quality Metrics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {Object.entries(qualityMetrics).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-slate-500">{k.replace(/_/g, " ")}</div>
                  <div className={`text-lg font-bold mt-0.5 ${
                    k.includes("outlier") || k.includes("null") ? "text-amber-600" : "text-slate-800"
                  }`}>{v}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      )}

      {/* ── SECTION 5: Data Simulator Controls ──────────────────────────────── */}
      <section className="mb-6">
        <SectionCard title="🤖 Data Source Simulator (Point 2)">
          <p className="text-xs text-slate-500 mb-4">
            Generates synthetic candidates, applications, quiz attempts and parsed resumes
            on a configurable interval. Data is flagged{" "}
            <code className="bg-slate-100 px-1 rounded">_synthetic: true</code> and can be purged at any time.
          </p>

          {/* Status badge */}
          <div className="mb-4 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              simStatus?.running ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}>
              <span className={`w-2 h-2 rounded-full ${simStatus?.running ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {simStatus?.running ? "Running" : "Stopped"}
            </span>
            {simStatus?.records_generated > 0 && (
              <span className="text-xs text-slate-500">{simStatus.records_generated} records generated</span>
            )}
            {simStatus?.last_batch_at && (
              <span className="text-xs text-slate-400">Last batch: {new Date(simStatus.last_batch_at).toLocaleTimeString()}</span>
            )}
          </div>

          {simMsg && (
            <div className="mb-4 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm text-indigo-700">
              {simMsg}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Interval (seconds)</label>
              <input
                type="number"
                min={10}
                max={3600}
                value={simInterval}
                onChange={(e) => setSimInterval(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch size</label>
              <input
                type="number"
                min={1}
                max={20}
                value={simBatch}
                onChange={(e) => setSimBatch(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={startSim}
              disabled={simLoading || simStatus?.running}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              ▶️ Start Simulation
            </button>
            <button
              onClick={stopSim}
              disabled={simLoading || !simStatus?.running}
              className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              ⏹ Stop
            </button>
            <button
              onClick={runOnce}
              disabled={simLoading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              ⚡ Run Once ({simBatch} records)
            </button>
            <button
              onClick={purgeSim}
              disabled={simLoading}
              className="rounded-xl border border-rose-300 px-5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
            >
              🗑 Purge Synthetic Data
            </button>
          </div>
        </SectionCard>
      </section>
    </AdminShell>
  );
};

export default AdminWarehouse;
