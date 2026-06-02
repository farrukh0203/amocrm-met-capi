// GET /api/test → deployment va environment variables tekshirish uchun
module.exports = async function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      AMOCRM_TOKEN: !!process.env.AMOCRM_TOKEN,
    },
  });
};
