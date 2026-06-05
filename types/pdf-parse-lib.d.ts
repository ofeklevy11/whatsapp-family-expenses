/**
 * The deep entry point `pdf-parse/lib/pdf-parse.js` is imported directly to
 * skip the package's index-level debug harness (which reads a test PDF when
 * `module.parent` is falsy — problematic under bundlers). It shares the same
 * call signature as the package root, so we reuse those types.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdf from "pdf-parse";
  export default pdf;
}
