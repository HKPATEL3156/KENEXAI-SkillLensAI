/**
 * warehouse.routes.js
 * Proxies requests from the frontend → Data Warehouse server (port 8001)
 * Requires companyToken or adminToken for access.
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");

const DW_BASE = process.env.DW_SERVICE_URL || "http://127.0.0.1:8001";

// Simple auth check — either admin or company token
const requireAuth = (req, res, next) => {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-admin-token"];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const proxy = async (req, res, path, params = {}) => {
  try {
    const resp = await axios.get(`${DW_BASE}${path}`, {
      params,
      timeout: 30000,
    });
    res.json(resp.data);
  } catch (e) {
    if (e.code === "ECONNREFUSED") {
      return res
        .status(503)
        .json({
          message: "Data Warehouse service is not running. Start it with: uvicorn server:app --port 8001",
        });
    }
    res
      .status(e.response?.status || 500)
      .json({ message: e.response?.data?.detail || e.message });
  }
};

router.use(requireAuth);

// ── ETL trigger ──────────────────────────────────────────────────────────────
router.post("/etl", async (req, res) => {
  try {
    const stage = req.query.stage || "all";
    const resp = await axios.post(`${DW_BASE}/warehouse/etl?stage=${stage}`, {}, {
      timeout: 120000,
    });
    res.json(resp.data);
  } catch (e) {
    if (e.code === "ECONNREFUSED")
      return res.status(503).json({ message: "Data Warehouse service is not running." });
    res.status(e.response?.status || 500).json({ message: e.message });
  }
});

// ── KPI endpoints ─────────────────────────────────────────────────────────────
router.get("/summary",              (req, res) => proxy(req, res, "/warehouse/summary"));
router.get("/monthly-applications", (req, res) => proxy(req, res, "/warehouse/monthly-applications"));
router.get("/top-skills",           (req, res) => proxy(req, res, "/warehouse/top-skills", { limit: req.query.limit || 20 }));
router.get("/top-candidates",       (req, res) => proxy(req, res, "/warehouse/top-candidates"));
router.get("/fit-distribution",     (req, res) => proxy(req, res, "/warehouse/fit-distribution"));

// ── Quality endpoints ─────────────────────────────────────────────────────────
router.get("/data-quality",         (req, res) => proxy(req, res, "/warehouse/data-quality"));
router.get("/quality-metrics",      (req, res) => proxy(req, res, "/warehouse/quality-metrics"));
router.get("/schema",               (req, res) => proxy(req, res, "/warehouse/schema"));

// ── Simulation proxy (forwards to ml-service:8000) ───────────────────────────
const ML_BASE = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

const simulatorProxy = async (req, res, method, path, body = null) => {
  try {
    const opts = { timeout: 30000 };
    const resp =
      method === "GET"
        ? await axios.get(`${ML_BASE}${path}`, opts)
        : method === "DELETE"
        ? await axios.delete(`${ML_BASE}${path}`, opts)
        : await axios.post(`${ML_BASE}${path}`, body || {}, opts);
    res.json(resp.data);
  } catch (e) {
    if (e.code === "ECONNREFUSED")
      return res.status(503).json({ message: "ML service is not running." });
    res.status(e.response?.status || 500).json({ message: e.message });
  }
};

router.post  ("/simulate/start",    (req, res) => simulatorProxy(req, res, "POST",   "/simulate/start",    req.body));
router.post  ("/simulate/stop",     (req, res) => simulatorProxy(req, res, "POST",   "/simulate/stop"));
router.get   ("/simulate/status",   (req, res) => simulatorProxy(req, res, "GET",    "/simulate/status"));
router.post  ("/simulate/run-once", (req, res) => simulatorProxy(req, res, "POST",   `/simulate/run-once?batch_size=${req.query.batch_size || 3}`));
router.delete("/simulate/purge",    (req, res) => simulatorProxy(req, res, "DELETE", "/simulate/purge"));

module.exports = router;
