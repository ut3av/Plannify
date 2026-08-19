import { lazy } from "react";

/**
 * Enhanced React.lazy with automatic chunk retry and stale cache recovery.
 * Resolves ChunkLoadError when Webpack dev server recompiles chunks or when new bundle versions are deployed.
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} componentImport
 * @param {string} [componentName]
 * @returns {React.LazyExoticComponent<React.ComponentType<any>>}
 */
export function lazyWithRetry(componentImport, componentName = "Module") {
  return lazy(async () => {
    const storageKey = `chunk_retry_${componentName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const hasRefreshed = sessionStorage.getItem(storageKey) === "true";

    try {
      const module = await componentImport();
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error) {
      const isChunkError =
        error?.name === "ChunkLoadError" ||
        /loading chunk/i.test(error?.message || "") ||
        /failed to fetch dynamically imported module/i.test(error?.message || "") ||
        /error loading dynamically imported module/i.test(error?.message || "");

      if (isChunkError) {
        console.warn(
          `[Plannify LazyLoader] Dynamic chunk load failed for ${componentName}. Initiating auto-recovery...`,
          error
        );

        // First retry attempt with a slight delay
        try {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const retryModule = await componentImport();
          sessionStorage.removeItem(storageKey);
          return retryModule;
        } catch (retryError) {
          // If retry fails and page hasn't reloaded yet, force reload to fetch latest bundle manifest
          if (!hasRefreshed) {
            sessionStorage.setItem(storageKey, "true");
            window.location.reload();
            return new Promise(() => {}); // Hold suspense until page reload occurs
          }
        }
      }

      throw error;
    }
  });
}
