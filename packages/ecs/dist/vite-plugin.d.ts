import type { Plugin } from "vite";
interface ConductPluginOptions {
    /** Additional file patterns to transform (default: files ending with System.ts) */
    include?: RegExp[];
    /** File patterns to exclude from transformation */
    exclude?: RegExp[];
}
/**
 * Vite plugin that applies the Conduct ECS system transformer during development.
 * This enables the ergonomic query.iter() API to work with Vite's dev server.
 */
export declare function conductVitePlugin(options?: ConductPluginOptions): Plugin;
export default conductVitePlugin;
//# sourceMappingURL=vite-plugin.d.ts.map