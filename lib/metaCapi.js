const { hashEmail, hashPhone } = require('./hash');

const DATASET_ID = '1504265268073912';
const API_VERSION = 'v25.0';
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${DATASET_ID}/events`;

async function sendToMeta({ email, phone }, leadId) {
  const token = process.env.META_ACCESS_TOKEN;
  const eventTime = Math.floor(Date.now() / 1000);

  // Build user_data with only available fields
  const userData = {};
  if (email) userData.em = [hashEmail(email)];
  if (phone) userData.ph = [hashPhone(phone)];
  if (leadId) userData.lead_id = String(leadId);

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

  const res = await fetch(`${ENDPOINT}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Meta CAPI error: ${JSON.stringify(result)}`);
  }

  console.log(`Meta CAPI → QualifiedLead sent (lead ${leadId}):`, JSON.stringify(result));
  return result;
}

module.exports = { sendToMeta };
