const BASE_URL = 'https://kidsmall.amocrm.ru/api/v4';

async function amocrmFetch(path) {
  const token = process.env.AMOCRM_TOKEN;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`amoCRM [${path}] → ${res.status}: ${text}`);
  }

  return res.json();
}

// Fetch lead + its contact's email and phone
async function getLeadDetails(leadId) {
  // Step 1: Get lead with embedded contacts list
  const lead = await amocrmFetch(`/leads/${leadId}?with=contacts`);
  const contacts = lead?._embedded?.contacts ?? [];

  if (!contacts.length) {
    console.log(`Lead ${leadId}: no contacts found`);
    return { email: null, phone: null };
  }

  // Step 2: Get first contact's full details
  const contact = await amocrmFetch(`/contacts/${contacts[0].id}`);
  const fields = contact?.custom_fields_values ?? [];

  let email = null;
  let phone = null;

  // amoCRM standard field codes for email and phone
  for (const field of fields) {
    if (field.field_code === 'EMAIL' && !email) {
      email = field.values?.[0]?.value ?? null;
    }
    if (field.field_code === 'PHONE' && !phone) {
      phone = field.values?.[0]?.value ?? null;
    }
  }

  console.log(`Lead ${leadId}: email=${email ? 'found' : 'missing'}, phone=${phone ? 'found' : 'missing'}`);
  return { email, phone };
}

module.exports = { getLeadDetails };
