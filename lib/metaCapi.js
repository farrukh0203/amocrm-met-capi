const { hashPhone } = require('./hash');
const { createHash } = require('crypto');

const DATASET_ID = '1504265268073912';
const API_VERSION = 'v25.0';
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${DATASET_ID}/events`;

function hashText(value) {
  if (!value) return null;
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

// eventName: 'initial_lead' yoki 'QualifiedLead'
async function sendToMeta({ fn, ln, phone, fbLeadId }, leadId, eventName) {
  const token = (process.env.META_ACCESS_TOKEN || '').trim();
  const eventTime = Math.floor(Date.now() / 1000);

  const userData = {};
  if (phone)    userData.ph      = [hashPhone(phone)];
  if (fn)       userData.fn      = [hashText(fn)];
  if (ln)       userData.ln      = [hashText(ln)];
  userData.country = [hashText('uz')];

  if (fbLeadId) {
    userData.lead_id = fbLeadId;
  } else if (leadId) {
    userData.lead_id = String(leadId);
  }

  console.log(`Sending to Meta [${eventName}]: ph=${!!phone}, fn=${!!fn}, fb_lead_id=${!!fbLeadId}`);

  const payload = {
    access_token: token,
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        action_source: 'system_generated',
        event_id: `${eventName.toLowerCase()}_${leadId}`,
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
    throw new Error(`Meta CAPI error [${eventName}]: ${JSON.stringify(result)}`);
  }

  console.log(`Event yuborildi [${eventName}] (lead ${leadId}):`, JSON.stringify(result));
  return result;
}

module.exports = { sendToMeta };
