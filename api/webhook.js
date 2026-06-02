const qs = require('qs');
const { getLeadDetails } = require('../lib/amocrm');
const { sendToMeta } = require('../lib/metaCapi');

// amoCRM stage ID → QualifiedLead event
const QUALIFIED_STAGE_ID = '83679426';

// amoCRM sends application/x-www-form-urlencoded with nested bracket notation
// e.g. leads[status][0][id]=123&leads[status][0][status_id]=83679426
async function parseBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return qs.parse(req.body);
    if (typeof req.body === 'object' && req.body !== null) return req.body;
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

    // amoCRM sends lead status changes under leads[status]
    const statusLeads = body?.leads?.status;
    if (!statusLeads) {
      return res.status(200).json({ message: 'Not a lead status event — skipped' });
    }

    const leadsList = Array.isArray(statusLeads)
      ? statusLeads
      : Object.values(statusLeads);

    for (const lead of leadsList) {
      const leadId = lead.id;
      const statusId = String(lead.status_id);

      console.log(`Received: lead=${leadId} status=${statusId}`);

      if (statusId !== QUALIFIED_STAGE_ID) {
        console.log(`Skipping lead ${leadId} — stage ${statusId} is not QualifiedLead`);
        continue;
      }

      console.log(`QualifiedLead stage matched — processing lead ${leadId}`);

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
