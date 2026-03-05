const axios = require('axios');

module.exports = async (req, res) => {
  // 1. Tell the phone it's okay to receive this data
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Get the "RID" (Train ID) from your app
  const { rid } = req.body || {};

  // 3. The secret password (Basic Auth)
  const auth = Buffer.from('coyleg@ymail.com:Conjas197684###').toString('base64');

  try {
    // 4. Send the request to National Rail
    const response = await axios.post(
      'https://hsp-prod.rockshore.net/api/v1/serviceDetails',
      { rid: rid },
      { headers: { 'Authorization': `Basic ${auth}` } }
    );
    // 5. Send the train data back to your phone
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Fail", message: error.message });
  }
};
