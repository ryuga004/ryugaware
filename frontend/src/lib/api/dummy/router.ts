import type { HttpMethod, QueryParams } from "../types";

export interface RouteContext {
  params: Record<string, string>;
  query: QueryParams;
  body: unknown;
}

export interface Route {
  method: HttpMethod;
  /** Express-style path, e.g. `/websites/:id`. */
  path: string;
  handler: (ctx: RouteContext) => Promise<unknown> | unknown;
}

interface CompiledRoute extends Route {
  regex: RegExp;
  keys: string[];
}

const routes: CompiledRoute[] = [];

export function registerRoutes(list: Route[]) {
  for (const route of list) {
    const keys: string[] = [];
    const pattern = route.path.replace(/\/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      keys.push(key);
      return "/([^/]+)";
    });
    routes.push({ ...route, regex: new RegExp(`^${pattern}/?$`), keys });
  }
}

export function matchRoute(method: HttpMethod, url: string) {
  const path = url.split("?")[0];
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.regex.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    return { route, params };
  }
  return null;
}
