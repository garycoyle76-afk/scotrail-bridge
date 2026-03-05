const axios = require('axios');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Check if the app actually sent an RID
    const { rid } = req.body || {};
    if (!rid) {
      return res.status(400).json({ error: "No RID provided in the request body." });
    }

    // 2. Your Rockshore Credentials
    const auth = Buffer.from('coyleg@ymail.com:Conjas197684###').toString('base64');

    // 3. The Actual Request to National Rail
    const response = await axios.post(
      'https://hsp-prod.rockshore.net/api/v1/serviceDetails',
      { rid: rid },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        timeout: 10000 // Stop waiting after 10 seconds
      }
    );
    
    return res.status(200).json(response.data);

  } catch (error) {
    // This tells us EXACTLY what happened (e.g., Wrong Password or Timeout)
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : error.message;
    
    return res.status(status).json({ 
      error: "Rockshore API Connection Failed", 
      details: message 
    });
  }
};
