const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const html = (await axios.get('https://www.hind.ee/p/iluuisud-roces-paradise-blade-450635-01-44/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })).data;

  // Extract the price-graph script URL from the page
  const $ = cheerio.load(html);
  const scriptContent = $.html('#section-price-history script');
  const match = scriptContent.match(/getScript\("([^"]+)"/);
  if (!match) { console.log('No price-graph script found'); return; }
  const graphUrl = match[1].replace(/&amp;/g, '&');
  console.log('Graph URL:', graphUrl);

  const resp = await axios.get(graphUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log('Response (first 3000 chars):');
  console.log(String(resp.data).slice(0, 3000));
})();
