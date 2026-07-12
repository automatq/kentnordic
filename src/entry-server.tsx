import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { StaticRouter } from "react-router-dom";
import AppServer from "@/AppServer";
import { site } from "@/config/site";
import { CopyProvider } from "@/copy/CopyProvider";

export function render(url: string) {
  const helmetContext: {
    helmet?: {
      title: { toString(): string };
      meta: { toString(): string };
      link: { toString(): string };
      script: { toString(): string };
    };
  } = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext as any}>
      <CopyProvider>
        <StaticRouter location={url}>
          <AppServer />
        </StaticRouter>
      </CopyProvider>
    </HelmetProvider>,
  );

  return {
    html,
    helmet: helmetContext.helmet,
  };
}

export const siteUrl = site.url;
