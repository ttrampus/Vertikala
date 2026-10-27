// /feed — a bare alias for /feed.xml, so the main feed answers at both URLs
// (the slo-alp.com example, gore-ljudje.net/feed, uses the extension-less form).
export { onRequest } from "../feed.xml.js";
