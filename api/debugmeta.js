// Token to'g'ri yoki yo'qligini tekshirish uchun
module.exports = async function handler(req, res) {
  const token = (process.env.META_ACCESS_TOKEN || '').trim();

  // Meta graph API ga token bilan so'rov — valid bo'lsa javob qaytaradi
  const graphRes = await fetch(
    `https://graph.facebook.com/v25.0/me?access_token=${encodeURIComponent(token)}`
  );
  const graphData = await graphRes.json();

  // CAPI endpointga minimal test so'rov
  const capiRes = await fetch(`https://graph.facebook.com/v25.0/1504265268073912/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      data: [{
        event_name: 'QualifiedLead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        custom_data: { event_source: 'crm', lead_event_source: 'amoCRM' },
        user_data: { lead_id: 'test123' }
      }]
    })
  });
  const capiData = await capiRes.json();

  return res.status(200).json({
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 8) + '...',
    graphApiTest: graphData,
    capiTest: capiData
  });
};
