// Email template configurations and utilities
const emailTemplates = {
  // Base styles for all emails
  baseStyles: `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .content { 
      padding: 40px 30px; 
    }
    .footer { 
      background: #f8f9fa; 
      text-align: center; 
      padding: 30px; 
      color: #6c757d;
      border-top: 1px solid #dee2e6;
    }
    .button { 
      display: inline-block; 
      background: #667eea; 
      color: white !important; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 20px 0;
      font-weight: 600;
      text-align: center;
    }
    .button:hover {
      background: #5a6fd8;
    }
    .badge { 
      display: inline-block; 
      background: #28a745; 
      color: white; 
      padding: 8px 16px; 
      border-radius: 20px; 
      font-weight: 600; 
      font-size: 14px;
      margin: 15px 0; 
    }
    .important-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box {
      background: #cce7ff;
      border-left: 4px solid #007bff;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #dee2e6;
    }
    .details-table th {
      background: #f8f9fa;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
    }
    .details-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #dee2e6;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    h1 { margin: 0 0 10px 0; font-size: 28px; }
    h2 { color: #495057; margin: 0 0 20px 0; }
    h3 { color: #495057; margin: 25px 0 15px 0; }
    p { margin: 0 0 15px 0; }
    ul, ol { margin: 0 0 15px 0; padding-left: 20px; }
    li { margin: 5px 0; }
    .icon { font-size: 48px; margin: 0 0 15px 0; }
    .text-center { text-align: center; }
    .text-muted { color: #6c757d; }
    .mb-0 { margin-bottom: 0; }
  `,

  // Company information
  company: {
    name: 'FixMe Platform',
    supportEmail: 'support@fixme.com',
    website: 'https://fixme.com',
    address: '123 Tech Street, Digital City, DC 12345'
  },

  // Common email sections
  footer: `
    <div class="footer">
      <p class="mb-0"><strong>FixMe Platform</strong></p>
      <p class="text-muted mb-0">Connecting skilled technicians with customers</p>
      <p class="text-muted">For support, contact us at support@fixme.com</p>
      <p class="text-muted">&copy; 2025 FixMe Platform. All rights reserved.</p>
    </div>
  `
};

module.exports = emailTemplates;