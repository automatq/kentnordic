import analytics from "../api_routes/admin/analytics.js";
import contentHealth from "../api_routes/admin/content-health.js";
import contentReleases from "../api_routes/admin/content-releases.js";
import contentReleaseDetail from "../api_routes/admin/content-releases/[id].js";
import content from "../api_routes/admin/content.js";
import contentDetail from "../api_routes/admin/content/[id].js";
import contentRollback from "../api_routes/admin/content/[id]/rollback.js";
import adminCopy from "../api_routes/admin/copy/[key].js";
import customFields from "../api_routes/admin/custom-fields.js";
import dashboard from "../api_routes/admin/dashboard.js";
import emailTemplates from "../api_routes/admin/email-templates.js";
import adminExport from "../api_routes/admin/export.js";
import leads from "../api_routes/admin/leads.js";
import leadDetail from "../api_routes/admin/leads/[id].js";
import leadEmail from "../api_routes/admin/leads/[id]/email.js";
import leadEvents from "../api_routes/admin/leads/[id]/events.js";
import login from "../api_routes/admin/login.js";
import logout from "../api_routes/admin/logout.js";
import mediaUpload from "../api_routes/admin/media-upload.js";
import media from "../api_routes/admin/media.js";
import mediaDetail from "../api_routes/admin/media/[id].js";
import notifications from "../api_routes/admin/notifications.js";
import notificationDetail from "../api_routes/admin/notifications/[id].js";
import adminPhoto from "../api_routes/admin/photos/[key].js";
import pipelineConfig from "../api_routes/admin/pipeline-config.js";
import pipeline from "../api_routes/admin/pipeline.js";
import preferences from "../api_routes/admin/preferences.js";
import profileSession from "../api_routes/admin/profile-session.js";
import profiles from "../api_routes/admin/profiles.js";
import profileDetail from "../api_routes/admin/profiles/[id].js";
import savedViews from "../api_routes/admin/saved-views.js";
import session from "../api_routes/admin/session.js";
import settings from "../api_routes/admin/settings.js";
import adminSubmissions from "../api_routes/admin/submissions.js";
import adminSubmissionDetail from "../api_routes/admin/submissions/[id].js";
import tasks from "../api_routes/admin/tasks.js";
import taskDetail from "../api_routes/admin/tasks/[id].js";
import team from "../api_routes/admin/team.js";
import copy from "../api_routes/copy.js";
import cronAdminNotifications from "../api_routes/cron/admin-notifications.js";
import formSubmissions from "../api_routes/form-submissions.js";
import submissions from "../api_routes/submissions.js";
import uploadPhoto from "../api_routes/uploads/photos/[filename].js";
import postmarkWebhook from "../api_routes/webhooks/postmark.js";
import {
  json,
  type ApiRequest,
  type ApiResponse,
} from "../api_routes/_lib/http.js";

type Handler = (request: ApiRequest, response: ApiResponse) => Promise<void>;

interface RouteMatch {
  handler: Handler;
  params?: Record<string, string>;
}

const staticRoutes: Record<string, Handler> = {
  "admin/analytics": analytics,
  "admin/content-health": contentHealth,
  "admin/content-releases": contentReleases,
  "admin/content": content,
  "admin/custom-fields": customFields,
  "admin/dashboard": dashboard,
  "admin/email-templates": emailTemplates,
  "admin/export": adminExport,
  "admin/leads": leads,
  "admin/login": login,
  "admin/logout": logout,
  "admin/media-upload": mediaUpload,
  "admin/media": media,
  "admin/notifications": notifications,
  "admin/pipeline-config": pipelineConfig,
  "admin/pipeline": pipeline,
  "admin/preferences": preferences,
  "admin/profile-session": profileSession,
  "admin/profiles": profiles,
  "admin/saved-views": savedViews,
  "admin/session": session,
  "admin/settings": settings,
  "admin/submissions": adminSubmissions,
  "admin/tasks": tasks,
  "admin/team": team,
  copy: copy,
  "cron/admin-notifications": cronAdminNotifications,
  "form-submissions": formSubmissions,
  submissions: submissions,
  "webhooks/postmark": postmarkWebhook,
};

const dynamicRoutes: Array<{
  pattern: RegExp;
  param: string;
  handler: Handler;
}> = [
  {
    pattern: /^admin\/content-releases\/([^/]+)$/,
    param: "id",
    handler: contentReleaseDetail,
  },
  {
    pattern: /^admin\/content\/([^/]+)\/rollback$/,
    param: "id",
    handler: contentRollback,
  },
  { pattern: /^admin\/content\/([^/]+)$/, param: "id", handler: contentDetail },
  { pattern: /^admin\/copy\/(.+)$/, param: "key", handler: adminCopy },
  {
    pattern: /^admin\/leads\/([^/]+)\/email$/,
    param: "id",
    handler: leadEmail,
  },
  {
    pattern: /^admin\/leads\/([^/]+)\/events$/,
    param: "id",
    handler: leadEvents,
  },
  { pattern: /^admin\/leads\/([^/]+)$/, param: "id", handler: leadDetail },
  { pattern: /^admin\/media\/([^/]+)$/, param: "id", handler: mediaDetail },
  {
    pattern: /^admin\/notifications\/([^/]+)$/,
    param: "id",
    handler: notificationDetail,
  },
  { pattern: /^admin\/photos\/(.+)$/, param: "key", handler: adminPhoto },
  {
    pattern: /^admin\/profiles\/([^/]+)$/,
    param: "id",
    handler: profileDetail,
  },
  {
    pattern: /^admin\/submissions\/([^/]+)$/,
    param: "id",
    handler: adminSubmissionDetail,
  },
  { pattern: /^admin\/tasks\/([^/]+)$/, param: "id", handler: taskDetail },
  {
    pattern: /^uploads\/photos\/(.+)$/,
    param: "filename",
    handler: uploadPhoto,
  },
];

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  const path = routePath(request);
  const match = matchRoute(path);
  if (!match) {
    return json(response, 404, { ok: false, error: "API route not found." });
  }
  request.query = {
    ...queryFromUrl(request),
    ...(request.query || {}),
    ...(match.params || {}),
  };
  return match.handler(request, response);
}

function matchRoute(path: string): RouteMatch | null {
  const staticHandler = staticRoutes[path];
  if (staticHandler) return { handler: staticHandler };
  for (const route of dynamicRoutes) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    return {
      handler: route.handler,
      params: { [route.param]: decodeURIComponent(match[1] || "") },
    };
  }
  return null;
}

function routePath(request: ApiRequest) {
  const url = new URL(request.url || "/", "http://localhost");
  const rewrittenPath = url.searchParams.get("__path");
  if (rewrittenPath) {
    return rewrittenPath.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  }
  return url.pathname
    .replace(/^\/api\/?/, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function queryFromUrl(request: ApiRequest) {
  const url = new URL(request.url || "/", "http://localhost");
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }
  return query;
}
