const axios = require('axios');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { rid } = req.body;
  const auth = Buffer.from('coyleg@ymail.com:Conjas197684###').toString('base64');

  try {
    const response = await axios.post('https://hsp-prod.rockshore.net/api/v1/serviceDetails', 
      { rid }, 
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` } }
    );
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Bridge Failed", details: error.message });
  }
}

