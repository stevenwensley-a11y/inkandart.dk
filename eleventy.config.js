import { EleventyI18nPlugin } from "@11ty/eleventy";

export default function(eleventyConfig) {
  /* ----- Passthrough copy ----- */
  eleventyConfig.addPassthroughCopy("src/_assets");
  eleventyConfig.addPassthroughCopy({ "src/_assets/img/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/_assets/img/apple-touch-icon.png": "apple-touch-icon.png" });

  /* ----- I18n plugin (built-in) ----- */
  eleventyConfig.addPlugin(EleventyI18nPlugin, {
    defaultLanguage: "da",
    errorMode: "strict"
  });

  /* ----- Custom translation filter ----- */
  // Usage: {{ "nav.walkIn" | t(lang) }}
  // Reads from _data/i18n.json — keys are dot-paths.
  eleventyConfig.addFilter("t", function (key, lang) {
    const i18n = this.ctx?.i18n || this.context?.environments?.globals?.i18n;
    const langCode = lang || this.ctx?.lang || "da";
    if (!i18n || !key) return key;
    const value = key.split(".").reduce((acc, part) => acc?.[part], i18n);
    if (!value) return key;
    if (typeof value === "string") return value;
    return value[langCode] ?? value.da ?? key;
  });

  /* ----- Date filters ----- */
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString());

  eleventyConfig.addFilter("date", (date, format) => {
    const d = (date === "now" || !date) ? new Date() : new Date(date);
    if (format === "%Y" || format === "Y") return String(d.getFullYear());
    return d.toISOString();
  });

  /* ----- Helper: language-of-page (DA = "da", anything under /en/ = "en") ----- */
  eleventyConfig.addFilter("pageLang", (url) => {
    if (typeof url !== "string") return "da";
    return url.startsWith("/en/") || url === "/en" ? "en" : "da";
  });

  /* ----- Helper: sister URL (lang-toggle target) ----- */
  // /                       → /en/
  // /walk-in/               → /en/walk-in/
  // /artister/              → /en/artists/
  // /artister/simone/       → /en/artists/simone/
  // /privatlivspolitik/     → /en/privacy/
  // /en/...                 → DA equivalent
  eleventyConfig.addFilter("sisterUrl", (url) => {
    if (!url) return "/";
    const map = {
      "/":                      "/en/",
      "/walk-in/":              "/en/walk-in/",
      "/artister/":             "/en/artists/",
      "/privatlivspolitik/":    "/en/privacy/",
      "/404.html":              "/en/404.html"
    };
    if (map[url]) return map[url];
    // Reverse map
    const rev = Object.fromEntries(Object.entries(map).map(([a, b]) => [b, a]));
    if (rev[url]) return rev[url];
    // Artist deep-link: /artister/simone/ → /en/artists/simone/
    const daMatch = url.match(/^\/artister\/([^/]+)\/$/);
    if (daMatch) return `/en/artists/${daMatch[1]}/`;
    const enMatch = url.match(/^\/en\/artists\/([^/]+)\/$/);
    if (enMatch) return `/artister/${enMatch[1]}/`;
    return "/";
  });

  /* ----- Artist collection ----- */
  // src/_artists/*.md → collections.artists
  eleventyConfig.addCollection("artists", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/_artists/*.md").sort((a, b) => {
      const sa = a.data.sortOrder ?? 99;
      const sb = b.data.sortOrder ?? 99;
      return sa - sb;
    });
  });

  /* ----- Build watcher ----- */
  eleventyConfig.addWatchTarget("src/_data/i18n.json");
  eleventyConfig.addWatchTarget("src/_artists/");

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
