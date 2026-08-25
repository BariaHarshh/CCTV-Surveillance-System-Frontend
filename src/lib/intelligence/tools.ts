import mongoose from "mongoose";
import { can } from "@/lib/permissions/capabilities";
import { connectDB } from "@/lib/db/connect";
import { Campus } from "@/models/Campus";
import { Camera } from "@/models/Camera";
import { Alert } from "@/models/Alert";
import { Incident } from "@/models/Incident";
import { Emergency } from "@/models/Emergency";
import { orgFilter } from "@/lib/campus/service";
import { getOrCreateSubscription, collectUsage } from "@/lib/platform/billing-service";
import type { AIToolName } from "./constants";
import type { ToolExecutionContext } from "./types";
import { CONFIRMATION_REQUIRED_TOOLS } from "./constants";

type ToolResult = { ok: boolean; data: Record<string, unknown>; error?: string };

function oid(organizationId: string) {
  return new mongoose.Types.ObjectId(organizationId);
}

function userCan(ctx: ToolExecutionContext, perm: string) {
  if (ctx.role === "SUPER_ADMIN" || ctx.role === "ADMIN") return true;
  return can(ctx.user as never, perm);
}

export function toolAllowed(ctx: ToolExecutionContext, tool: AIToolName): boolean {
  const map: Record<AIToolName, () => boolean> = {
    getDashboardSummary: () => true,
    getCampuses: () => userCan(ctx, "campus.view") || ctx.role === "ADMIN",
    getCampusRisk: () => userCan(ctx, "incident.view") || ctx.role === "ADMIN",
    getCameras: () => userCan(ctx, "camera.view") || ctx.role === "ADMIN",
    getOfflineCameras: () => userCan(ctx, "camera.view") || ctx.role === "ADMIN",
    getAlerts: () => userCan(ctx, "alert.view") || ctx.role === "ADMIN",
    getIncidents: () => userCan(ctx, "incident.view") || ctx.role === "ADMIN",
    getIncidentDetails: () => userCan(ctx, "incident.view") || ctx.role === "ADMIN",
    getEmergencies: () => userCan(ctx, "emergency.view") || ctx.role === "ADMIN",
    getResponseTeams: () => userCan(ctx, "emergency.view") || ctx.role === "ADMIN",
    getTasks: () => userCan(ctx, "incident.view") || ctx.role === "ADMIN",
    getAnalytics: () => userCan(ctx, "analytics.view") || ctx.role === "ADMIN",
    getReports: () => userCan(ctx, "report.view") || ctx.role === "ADMIN",
    generateReport: () => userCan(ctx, "report.export") || ctx.role === "ADMIN",
    createIncident: () => userCan(ctx, "incident.manage") || ctx.role === "ADMIN",
    createTask: () => userCan(ctx, "incident.manage") || ctx.role === "ADMIN",
    createCorrectiveAction: () => userCan(ctx, "analytics.view") || ctx.role === "ADMIN",
    searchOrganization: () => true,
    getAuditLogs: () => ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN",
    getUsage: () => ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN",
    getSystemHealth: () => ctx.role === "SUPER_ADMIN",
    searchKnowledge: () => true,
    getCameraHealth: () => userCan(ctx, "camera.view") || ctx.role === "ADMIN",
    getRecommendations: () => userCan(ctx, "analytics.view") || ctx.role === "ADMIN",
    getPredictiveRisk: () => userCan(ctx, "analytics.view") || ctx.role === "ADMIN",
  };
  return map[tool]();
}

export function requiresConfirmation(tool: AIToolName) {
  return CONFIRMATION_REQUIRED_TOOLS.includes(tool);
}

export async function executeTool(
  tool: AIToolName,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  if (!toolAllowed(ctx, tool)) {
    return { ok: false, data: {}, error: "PERMISSION_DENIED" };
  }
  await connectDB();
  const organizationId = ctx.organizationId;

  switch (tool) {
    case "getDashboardSummary": {
      const [openIncidents, criticalAlerts, offlineCameras, activeEmergencies] = await Promise.all([
        Incident.countDocuments(orgFilter(organizationId, { status: { $nin: ["RESOLVED", "CLOSED"] } })),
        Alert.countDocuments(orgFilter(organizationId, { severity: "CRITICAL", status: { $ne: "RESOLVED" } })),
        Camera.countDocuments(orgFilter(organizationId, { status: { $in: ["OFFLINE", "ERROR", "DISCONNECTED"] } })),
        Emergency.countDocuments(orgFilter(organizationId, { status: { $in: ["ACTIVE", "CONTAINED"] } })),
      ]);
      return {
        ok: true,
        data: { openIncidents, criticalAlerts, offlineCameras, activeEmergencies, asOf: new Date().toISOString() },
      };
    }
    case "getCampuses": {
      const campuses = await Campus.find(orgFilter(organizationId)).limit(50).lean();
      return {
        ok: true,
        data: {
          campuses: campuses.map((c) => ({
            id: c._id.toString(),
            name: (c as { name?: string }).name ?? "Campus",
            status: (c as { status?: string }).status ?? null,
          })),
        },
      };
    }
    case "getCampusRisk": {
      const campuses = await Campus.find(orgFilter(organizationId)).lean();
      const scored = [];
      for (const c of campuses) {
        const campusId = c._id;
        const [incidents, alerts, offline] = await Promise.all([
          Incident.countDocuments(orgFilter(organizationId, { campusId, status: { $nin: ["RESOLVED", "CLOSED"] } })),
          Alert.countDocuments(orgFilter(organizationId, { campusId, severity: { $in: ["CRITICAL", "HIGH"] } })),
          Camera.countDocuments(
            orgFilter(organizationId, { campusId, status: { $in: ["OFFLINE", "ERROR", "DISCONNECTED"] } })
          ),
        ]);
        const riskScore = Math.min(100, incidents * 12 + alerts * 8 + offline * 10);
        scored.push({
          campusId: campusId.toString(),
          name: (c as { name?: string }).name ?? "Campus",
          riskScore,
          openIncidents: incidents,
          highAlerts: alerts,
          offlineCameras: offline,
        });
      }
      scored.sort((a, b) => b.riskScore - a.riskScore);
      return { ok: true, data: { campuses: scored, highest: scored[0] ?? null } };
    }
    case "getCameras":
    case "getOfflineCameras": {
      const filter =
        tool === "getOfflineCameras"
          ? orgFilter(organizationId, { status: { $in: ["OFFLINE", "ERROR", "DISCONNECTED"] } })
          : orgFilter(organizationId);
      const cameras = await Camera.find(filter).limit(100).lean();
      return {
        ok: true,
        data: {
          cameras: cameras.map((c) => ({
            id: c._id.toString(),
            name: c.name,
            status: (c as { status?: string }).status ?? "UNKNOWN",
            cameraId: (c as { cameraId?: string }).cameraId ?? null,
          })),
          count: cameras.length,
        },
      };
    }
    case "getAlerts": {
      const since = args.since ? new Date(String(args.since)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const severity = args.severity ? String(args.severity) : undefined;
      const q: Record<string, unknown> = { createdAt: { $gte: since } };
      if (severity) q.severity = severity.toUpperCase();
      const alerts = await Alert.find(orgFilter(organizationId, q)).sort({ createdAt: -1 }).limit(50).lean();
      return {
        ok: true,
        data: {
          alerts: alerts.map((a) => ({
            id: a._id.toString(),
            alertId: (a as { alertId?: string }).alertId,
            title: (a as { title?: string }).title,
            severity: (a as { severity?: string }).severity,
            status: (a as { status?: string }).status,
            createdAt: a.createdAt?.toISOString?.() ?? null,
          })),
          count: alerts.length,
        },
      };
    }
    case "getIncidents": {
      const status = args.status ? String(args.status) : undefined;
      const q: Record<string, unknown> = {};
      if (status === "open" || !status) q.status = { $nin: ["RESOLVED", "CLOSED"] };
      else if (status !== "all") q.status = status.toUpperCase();
      const incidents = await Incident.find(orgFilter(organizationId, q)).sort({ createdAt: -1 }).limit(50).lean();
      return {
        ok: true,
        data: {
          incidents: incidents.map((i) => ({
            id: i._id.toString(),
            incidentId: (i as { incidentId?: string }).incidentId,
            title: (i as { title?: string }).title,
            status: (i as { status?: string }).status,
            severity: (i as { severity?: string }).severity,
            href: `/admin/incidents/${i._id}`,
          })),
          count: incidents.length,
        },
      };
    }
    case "getIncidentDetails": {
      const id = String(args.incidentId ?? "");
      if (!mongoose.isValidObjectId(id)) return { ok: false, data: {}, error: "Invalid incident id" };
      const incident = await Incident.findOne(orgFilter(organizationId, { _id: id })).lean();
      if (!incident) return { ok: false, data: {}, error: "Incident not found" };
      return {
        ok: true,
        data: {
          incident: {
            id: incident._id.toString(),
            incidentId: (incident as { incidentId?: string }).incidentId,
            title: (incident as { title?: string }).title,
            status: (incident as { status?: string }).status,
            severity: (incident as { severity?: string }).severity,
            description: (incident as { description?: string }).description ?? null,
            createdAt: incident.createdAt?.toISOString?.() ?? null,
            href: `/admin/incidents/${incident._id}`,
          },
        },
      };
    }
    case "getEmergencies": {
      const emergencies = await Emergency.find(
        orgFilter(organizationId, { status: { $in: ["ACTIVE", "CONTAINED", "RESOLVED"] } })
      )
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return {
        ok: true,
        data: {
          emergencies: emergencies.map((e) => ({
            id: e._id.toString(),
            status: (e as { status?: string }).status,
            type: (e as { type?: string }).type ?? (e as { emergencyType?: string }).emergencyType,
            createdAt: e.createdAt?.toISOString?.() ?? null,
            href: `/admin/emergencies/${e._id}`,
          })),
        },
      };
    }
    case "getUsage": {
      const sub = await getOrCreateSubscription(organizationId);
      const usage = await collectUsage(organizationId);
      return { ok: true, data: { planId: sub.planId, status: sub.status, usage } };
    }
    case "getSystemHealth": {
      return {
        ok: true,
        data: {
          api: "OPERATIONAL",
          database: "OPERATIONAL",
          note: "Limited health snapshot for authorized super-admins only.",
        },
      };
    }
    case "createIncident":
    case "createTask":
    case "createCorrectiveAction":
    case "generateReport":
      return {
        ok: true,
        data: {
          requiresConfirmation: true,
          tool,
          args,
          message: "This action requires explicit human confirmation before execution.",
        },
      };
    case "searchOrganization": {
      const q = String(args.q ?? "").trim();
      if (q.length < 2) return { ok: true, data: { results: [] } };
      const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      const [cameras, incidents, alerts] = await Promise.all([
        toolAllowed(ctx, "getCameras")
          ? Camera.find(orgFilter(organizationId, { $or: [{ name: rx }, { cameraId: rx }] }))
              .limit(8)
              .lean()
          : [],
        toolAllowed(ctx, "getIncidents")
          ? Incident.find(orgFilter(organizationId, { $or: [{ title: rx }, { incidentId: rx }] }))
              .limit(8)
              .lean()
          : [],
        toolAllowed(ctx, "getAlerts")
          ? Alert.find(orgFilter(organizationId, { $or: [{ title: rx }, { alertId: rx }] }))
              .limit(8)
              .lean()
          : [],
      ]);
      return {
        ok: true,
        data: {
          results: [
            ...cameras.map((c) => ({ type: "camera", title: c.name, href: "/admin/cameras", id: c._id.toString() })),
            ...incidents.map((i) => ({
              type: "incident",
              title: (i as { title?: string }).title ?? (i as { incidentId?: string }).incidentId,
              href: `/admin/incidents/${i._id}`,
              id: i._id.toString(),
            })),
            ...alerts.map((a) => ({
              type: "alert",
              title: (a as { title?: string }).title ?? (a as { alertId?: string }).alertId,
              href: `/admin/alerts/${a._id}`,
              id: a._id.toString(),
            })),
          ],
        },
      };
    }
    case "getCameraHealth":
    case "getRecommendations":
    case "getPredictiveRisk":
    case "getAnalytics":
    case "getReports":
    case "getResponseTeams":
    case "getTasks":
    case "getAuditLogs":
    case "searchKnowledge":
      // Filled by specialized services when called from orchestrator helpers
      return { ok: true, data: { deferred: true, tool } };
    default:
      return { ok: false, data: {}, error: "Unknown tool" };
  }
}

export function detectIntent(message: string): { tools: AIToolName[]; args: Record<string, unknown> } {
  const m = message.toLowerCase();
  const tools: AIToolName[] = [];
  const args: Record<string, unknown> = {};

  if (/offline\s+camera|cameras?\s+offline|camera\s+health|disconnect/.test(m)) {
    tools.push("getOfflineCameras", "getCameraHealth");
  }
  if (/active\s+incident|open\s+incident|unresolved|how many.*incident/.test(m)) {
    tools.push("getIncidents");
    args.status = "open";
  }
  if (/critical\s+alert|today'?s?\s+critical|alerts?\s+today/.test(m)) {
    tools.push("getAlerts");
    args.severity = "CRITICAL";
  }
  if (/highest\s+risk|riskiest\s+campus|campus.*risk|which campus/.test(m)) {
    tools.push("getCampusRisk");
  }
  if (/emergency|active\s+emergency/.test(m)) tools.push("getEmergencies");
  if (/dashboard|summary|overview|briefing|what.*know/.test(m)) tools.push("getDashboardSummary");
  if (/usage|billing|plan\s+limit/.test(m)) tools.push("getUsage");
  if (/recommend|improving|getting worse|coverage/.test(m)) tools.push("getRecommendations");
  if (/predict|predictive|elevated risk|risk trend/.test(m)) tools.push("getPredictiveRisk");
  if (/policy|procedure|evacuation|knowledge|document/.test(m)) tools.push("searchKnowledge");
  if (/create\s+incident/.test(m)) tools.push("createIncident");
  if (/generate\s+.*report|weekly\s+safety\s+report|monthly\s+safety/.test(m)) tools.push("generateReport");
  if (/search|near |building /.test(m) && tools.length === 0) {
    tools.push("searchOrganization");
    args.q = message;
  }
  if (tools.length === 0) tools.push("getDashboardSummary", "searchOrganization");
  if (!args.q && /searchOrganization/.test(tools.join(","))) args.q = message;
  return { tools: [...new Set(tools)], args };
}
