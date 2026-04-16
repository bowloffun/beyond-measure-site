const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, customerEmail, customerName, csaDates } = JSON.parse(event.body);

    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.detail || undefined,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://beyondmeasureflowers.com'}?payment=success`,
      cancel_url: `${event.headers.origin || 'https://beyondmeasureflowers.com'}?payment=cancelled`,
      customer_email: customerEmail || undefined,
      metadata: {
        customer_name: customerName || '',
        csa_dates: csaDates || '',
      },
      shipping_address_collection: undefined,
      custom_fields: [
        {
          key: 'pickup_day',
          label: { type: 'custom', custom: 'Preferred Pickup Day' },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Tuesday', value: 'tuesday' },
              { label: 'Friday', value: 'friday' },
              { label: 'Saturday', value: 'saturday' },
            ],
          },
        },
      ],
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
