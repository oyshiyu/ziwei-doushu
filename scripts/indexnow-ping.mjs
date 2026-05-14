const key = process.env.INDEXNOW_KEY;
const host = process.env.INDEXNOW_HOST || process.env.NEXT_PUBLIC_SITE_HOST;

if (!key || !host) {
  console.log("IndexNow skipped: INDEXNOW_KEY and INDEXNOW_HOST are not configured.");
  process.exit(0);
}

const normalizedHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
const urlList = [`https://${normalizedHost}/`];

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    host: normalizedHost,
    key,
    keyLocation: `https://${normalizedHost}/${key}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  throw new Error(`IndexNow ping failed: ${response.status} ${response.statusText}`);
}

console.log(`IndexNow ping submitted for ${normalizedHost}.`);
