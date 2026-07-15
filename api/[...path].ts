import analytics from "../api_routes/admin/analytics";
import contentHealth from "../api_routes/admin/content-health";
import contentReleases from "../api_routes/admin/content-releases";
import contentReleaseDetail from "../api_routes/admin/content-releases/[id]";
import content from "../api_routes/admin/content";
import contentDetail from "../api_routes/admin/content/[id]";
import contentRollback from "../api_routes/admin/content/[id]/rollback";
import adminCopy from "../api_routes/admin/copy/[key]";
import customFields from "../api_routes/admin/custom-fields";
import dashboard from "../api_routes/admin/dashboard";
import emailTemplates from "../api_routes/admin/email-templates";
import adminExport from "../api_routes/admin/export";
import leads from "../api_routes/admin/leads";
import leadDetail from "../api_routes/admin/leads/[id]";
import leadEmail from "../api_routes/admin/leads/[id]/email";
import leadEvents from "../api_routes/admin/leads/[id]/events";
import login from "../api_routes/admin/login";
import logout from "../api_routes/admin/logout";
import mediaUpload from "../api_routes/admin/media-upload";
import media from "../api_routes/admin/media";
import mediaDetail from "../api_routes/admin/media/[id]";
import notifications from "../api_routes/admin/notifications";
import notificationDetail from "../api_routes/admin/notifications/[id]";
import adminPhoto from "../api_routes/admin/photos/[key]";
import pipelineConfig from "../api_routes/admin/pipeline-config";
import pipeline from "../api_routes/admin/pipeline";
import preferences from "../api_routes/admin/preferences";
import profileSession from "../api_routes/admin/profile-session";
import profiles from "../api_routes/admin/profiles";
import profileDetail from "../api_routes/admin/profiles/[id]";
import savedViews from "../api_routes/admin/saved-views";
import session from "../api_routes/admin/session";
import settings from "../api_routes/admin/settings";
import adminSubmissions from "../api_routes/admin/submissions";
import adminSubmissionDetail from "../api_routes/admin/submissions/[id]";
import tasks from "../api_routes/admin/tasks";
import taskDetail from "../api_routes/admin/tasks/[id]";
import team from "../api_routes/admin/team";
import copy from "../api_routes/copy";
import cronAdminNotifications from "../api_routes/cron/admin-notifications";
import formSubmissions from "../api_routes/form-submissions";
import submissions from "../api_routes/submissions";
import uploadPhoto from "../api_routes/uploads/photos/[filename]";
import postmarkWebhook from "../api_routes/webhooks/postmark";
import {
  json,
  type ApiRequest,
  type ApiResponse,
} from "../api_routes/_lib/http";

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
