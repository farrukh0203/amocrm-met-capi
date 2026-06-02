const qs = require('qs');
const { getLeadDetails } = require('../lib/amocrm');
const { sendToMeta } = require('../lib/metaCapi');

const QUALIFIED_STAGE_ID = '83679426';

// amoCRM sends application/x-www-form-urlencoded with nested bracket notation
// e.g. leads[status][0][id]=123&leads[status][0][status_id]=83679426
// Vercel may pre-parse this into flat keys: { 'leads[status][0][id]': '123' }
// We detect this and re-parse with qs to get proper nested structure
async function parseBody(req) {
  if (typeof req.body === 'string') {
    return qs.parse(req.body);
  }

  if (req.body && typeof req.body === 'object') {
    const keys = Object.keys(req.body);
    // Vercel flat-parsed bracket notation — re-parse with qs
    if (keys.some((k) => k.includes('['))) {
      const queryString = keys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(req.body[k]))}`)
        .join('&');
      return qs.parse(queryString);
    }
    return req.body;
  }

  // Read from raw stream
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

    // Debug logging — ko'rinishi uchun
    console.log('Body keys:', Object.keys(body));
    console.log('leads:', JSON.stringify(body?.leads));

    const statusLeads = body?.leads?.status;
    if (!statusLeads) {
      console.log('No leads.status in body — skipped');
      return res.status(200).json({ message: 'Not a lead status event — skipped' });
    }

    const list = Array.isArray(statusLeads)
      ? statusLeads
      : Object.values(statusLeads);

    for (const lead of list) {
      const leadId = lead.id;
      const statusId = String(lead.status_id);

      console.log(`Lead ${leadId} → status ${statusId}`);

      if (statusId !== QUALIFIED_STAGE_ID) {
        console.log(`Skipping: stage ${statusId} is not QualifiedLead`);
        continue;
      }

      console.log(`QualifiedLead matched — processing lead ${leadId}`);

      const details = await getLeadDetails(leadId);
      await sendToMeta(details, leadId);

      console.log(`Done: lead ${leadId} sent to Meta CAPI`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
