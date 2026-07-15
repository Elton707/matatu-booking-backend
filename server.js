const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const CONSUMER_KEY = 'iEaI4sAtaZCbzWdnZ8oogLLyMvYeIbdAF37TQG7kzBKVFUe0';
const CONSUMER_SECRET = '2uh4aqgYVfshXRsDmFnskhE7bkc5BUXDBh1cxShmXqZlBlWmAbhAjx2IjGjrjqLv';
const SHORTCODE = '174379';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK_URL = 'https://webhook.site/b351cf7c-2be8-4858-b6d0-14edb5426593';

async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return response.data.access_token;
}

app.post('/stk-push', async (req, res) => {
  try {
    const { phone, amount, ticketNo, route } = req.body;

    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: ticketNo,
        TransactionDesc: `Matatu ticket ${route}`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({
      success: true,
      message: 'STK Push sent to ' + phone,
      checkoutRequestID: stkResponse.data.CheckoutRequestID
    });

  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || 'STK Push failed'
    });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Matatu Booking Backend running', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
