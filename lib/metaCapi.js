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
  const token = process.env.META_ACCESS_TOKEN;
  const eventTime = Math.floor(Date.now() / 1000);

  const userData = {};
  if (phone)  userData.ph = [hashPhone(phone)];
  if (fn)     userData.fn = [hashText(fn)];
  if (ln)     userData.ln = [hashText(ln)];
  if (leadId) userData.lead_id = String(leadId);

  console.log(`Sending to Meta: ph=${!!phone}, fn=${!!fn}, ln=${!!ln}, lead_id=${leadId}`);

  const payload = {
    data: [
      {
        event_name: 'QualifiedLead',
        event_time: eventTime,
        action_source: 'system_generated',
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'amoCRM',
        },
        user_data: userData,
      },
    ],
  };

  // URL encode qilish — token ichida + = / bo'lishi mumkin
  const url = new URL(ENDPOINT);
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Meta CAPI error: ${JSON.stringify(result)}`);
  }

  console.log(`Meta CAPI → QualifiedLead yuborildi (lead ${leadId}):`, JSON.stringify(result));
  return result;
}

module.exports = { sendToMeta };
