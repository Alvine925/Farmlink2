interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const LOGO_URL = 'https://cdn-icons-png.flaticon.com/512/2913/2913520.png'; // Generic leaf icon

const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1c1917;
      margin: 0;
      padding: 40px 20px;
      background-color: #fafaf9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 24px;
      border: 1px solid #e7e5e4;
    }
    .logo {
      width: 48px;
      height: 48px;
      margin-bottom: 32px;
    }
    .content {
      font-size: 16px;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e7e5e4;
      font-size: 12px;
      color: #78716c;
    }
    .brand {
      color: #047857;
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 8px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${LOGO_URL}" alt="Tellus" class="logo">
    <span class="brand">Tellus</span>
    <div class="content">${content}</div>
    <div class="footer">
      &copy; 2026 Tellus Marketplace. All rights reserved.<br>
      Empowering farmers and buyers through direct trade.
    </div>
  </div>
</body>
</html>
`;

export const sendEmail = async (params: EmailParams) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        html: getEmailTemplate(params.text),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

export const sendOrderNotificationToFarmer = async (farmerEmail: string, orderId: string, amount: number, buyerName: string) => {
  const subject = `New Order Received! (#${orderId.slice(0, 6)})`;
  const text = `Hello,

You have received a new order on Tellus!

Order ID: #${orderId.slice(0, 6)}
Buyer: ${buyerName}
Total Amount: $${amount.toFixed(2)}

Please log in to your dashboard to view the full details and accept the order.

Best regards,
The Tellus Team`;

  return sendEmail({ to: farmerEmail, subject, text });
};

export const sendOrderStatusUpdateToBuyer = async (buyerEmail: string, orderId: string, status: string, farmerName: string) => {
  const subject = `Order Update: #${orderId.slice(0, 6)}`;
  const statusText = status === 'accepted' ? 'accepted and is being processed' :
                     status === 'fulfilled' ? 'fulfilled and is on its way' :
                     status === 'completed' ? 'completed' :
                     status === 'declined' ? 'declined' : status;

  const text = `Hello,

Your order from ${farmerName} has been ${statusText}.

Order ID: #${orderId.slice(0, 6)}
New Status: ${status.toUpperCase()}

You can track your order progress in your dashboard.

Best regards,
The Tellus Team`;

  return sendEmail({ to: buyerEmail, subject, text });
};

export const sendOrderConfirmationToBuyer = async (buyerEmail: string, orderId: string, amount: number, farmerName: string) => {
  const subject = `Order Confirmation: #${orderId.slice(0, 6)}`;
  const text = `Hello,

Thank you for your order on Tellus!

Order ID: #${orderId.slice(0, 6)}
Farmer: ${farmerName}
Total Amount: $${amount.toFixed(2)}

Your order has been sent to the farmer for approval. You will receive another update once the farmer accepts your order.

You can track your order progress in your dashboard.

Best regards,
The Tellus Team`;

  return sendEmail({ to: buyerEmail, subject, text });
};
