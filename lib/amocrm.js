const BASE_URL = 'https://kidsmall.amocrm.ru/api/v4';

// 429 bo'lsa kutib qayta uradi (max 3 urinish)
async function amocrmFetch(path, attempt = 1) {
  const token = process.env.AMOCRM_TOKEN;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    if (attempt >= 3) {
      throw new Error(`amoCRM rate limit: ${path} (3 urinishdan keyin ham 429)`);
    }
    const waitMs = attempt * 2000; // 2s, 4s
    console.log(`amoCRM 429 — ${waitMs / 1000}s kutilmoqda (urinish ${attempt}/3)`);
    await new Promise((r) => setTimeout(r, waitMs));
    return amocrmFetch(path, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`amoCRM [${path}] → ${res.status}: ${text}`);
  }

  return res.json();
}

function splitName(fullName) {
  if (!fullName) return { fn: null, ln: null };
  const parts = fullName.trim().split(/\s+/);
  const fn = parts[0]?.toLowerCase() ?? null;
  const ln = parts.length > 1 ? parts.slice(1).join(' ').toLowerCase() : null;
  return { fn, ln };
}

async function getLeadDetails(leadId) {
  const lead = await amocrmFetch(`/leads/${leadId}?with=contacts`);
  const contacts = lead?._embedded?.contacts ?? [];

  if (!contacts.length) {
    console.log(`Lead ${leadId}: kontakt topilmadi`);
    return { fn: null, ln: null, phone: null };
  }

  const contact = await amocrmFetch(`/contacts/${contacts[0].id}`);
  const fields = contact?.custom_fields_values ?? [];

  let phone = null;
  for (const field of fields) {
    if (field.field_code === 'PHONE' && !phone) {
      phone = field.values?.[0]?.value ?? null;
    }
  }

  const { fn, ln } = splitName(contact.name);
  console.log(`Lead ${leadId}: name="${contact.name}", phone=${phone ? 'bor' : 'yo\'q'}`);
  return { fn, ln, phone };
}

module.exports = { getLeadDetails };
