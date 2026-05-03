/**
 * Directory-level data for src/_artists/*.md.
 *
 * Each markdown file paginates over [da, en] → produces 2 pages:
 *   /artister/<slug>/        (DA)
 *   /en/artists/<slug>/      (EN)
 *
 * The `slug` comes from each markdown's own front matter.
 */
export default {
  layout: "layouts/artist.njk",
  tags: ["artist"],
  pagination: {
    data: "siteLocales",
    size: 1,
    alias: "lang",
  },
  siteLocales: ["da", "en"],
  permalink: function (data) {
    const slug = data.slug;
    const lang = data.lang;
    if (lang === "en") return `/en/artists/${slug}/`;
    return `/artister/${slug}/`;
  },
  eleventyComputed: {
    title: function (data) {
      return data.title || `${data.name} · Ink & Art Copenhagen`;
    },
  },
};
