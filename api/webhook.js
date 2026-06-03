const qs = require('qs');
const { getLeadDetails } = require('../lib/amocrm');
const { sendToMeta } = require('../lib/metaCapi');

// amoCRM stage ID → Meta event nomi
const STAGE_MAP = {
  '83679426': 'QualifiedLead',   // Do'konga taklif qilindi
  '83679410': 'ScheduledLead',   // Do'konga keldi
  '142':      'ConvertedLead',   // Sotib oldi
};

async function parseBody(req) {
  if (typeof req.body === 'string') {
    return qs.parse(req.body);
  }

  if (req.body && typeof req.body === 'object') {
    const keys = Object.keys(req.body);
    if (keys.some((k) => k.includes('['))) {
      const queryString = keys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(req.body[k]))}`)
        .join('&');
      return qs.parse(queryString);
    }
    return req.body;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(qs.parse(Buffer.concat(chunks).toString())));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    console.log('Body keys:', Object.keys(body));

    // ─── initial_lead — yangi lead amoCRM ga tushdi ──────────────────────────
    const addedLeads = body?.leads?.add;
    if (addedLeads) {
      const list = Array.isArray(addedLeads)
        ? addedLeads
        : Object.values(addedLeads);

      for (const lead of list) {
        const leadId = lead.id;
        console.log(`New lead ${leadId} → initial_lead`);
        const details = await getLeadDetails(leadId);
        await sendToMeta(details, leadId, 'initial_lead');
        console.log(`Done: initial_lead (lead ${leadId})`);
      }
    }

    // ─── QualifiedLead / ScheduledLead / ConvertedLead — status o'zgardi ─────
    const statusLeads = body?.leads?.status;
    if (statusLeads) {
      const list = Array.isArray(statusLeads)
        ? statusLeads
        : Object.values(statusLeads);

      for (const lead of list) {
        const leadId = lead.id;
        const statusId = String(lead.status_id);
        const eventName = STAGE_MAP[statusId];

        console.log(`Lead ${leadId} → status ${statusId} → ${eventName || 'skip'}`);

        if (!eventName) continue;

        const details = await getLeadDetails(leadId);
        await sendToMeta(details, leadId, eventName);
        console.log(`Done: ${eventName} (lead ${leadId})`);
      }
    }

    if (!addedLeads && !statusLeads) {
      console.log('Relevant event topilmadi — skipped');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
