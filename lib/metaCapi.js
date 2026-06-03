const { hashPhone } = require('./hash');
const { createHash } = require('crypto');

const DATASET_ID = '1504265268073912';
const API_VERSION = 'v25.0';
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${DATASET_ID}/events`;

function hashText(value) {
  if (!value) return null;
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

async function sendToMeta({ fn, ln, phone }, leadId) {
  const token = (process.env.META_ACCESS_TOKEN || '').trim();
  const eventTime = Math.floor(Date.now() / 1000);

  const userData = {};
  if (phone)  userData.ph      = [hashPhone(phone)];
  if (fn)     userData.fn      = [hashText(fn)];
  if (ln)     userData.ln      = [hashText(ln)];
  if (leadId) userData.lead_id = String(leadId);

  // Country — hamma leadlar Uzbekistondan
  userData.country = [hashText('uz')];

  console.log(`Sending to Meta: ph=${!!phone}, fn=${!!fn}, ln=${!!ln}, country=uz`);

  const payload = {
    access_token: token,
    data: [
      {
        event_name: 'QualifiedLead',
        event_time: eventTime,
        action_source: 'system_generated',
        // Deduplication — bir xil leadId uchun Meta ikki marta hisoblamaydi
        event_id: `qualifiedlead_${leadId}`,
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'amoCRM',
        },
        user_data: userData,
      },
    ],
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Meta CAPI error: ${JSON.stringify(result)}`);
  }

  console.log(`QualifiedLead yuborildi (lead ${leadId}):`, JSON.stringify(result));
  return result;
}

module.exports = { sendToMeta };
