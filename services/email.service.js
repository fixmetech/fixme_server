const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Method to manually reinitialize the transporter
  reinitialize() {
    console.log('Manually reinitializing email service...');
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      console.log('Initializing email transporter...');
      console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
      console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('Email credentials not found in environment variables');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail', // You can change this to other services
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter verification failed:', error);
          this.transporter = null; // Reset transporter if verification fails
        } else {
          console.log('Email service initialized successfully');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      // Try to reinitialize if transporter is null
      if (!this.transporter) {
        console.log('Transporter not available, attempting to reinitialize...');
        this.initializeTransporter();
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!this.transporter) {
          throw new Error('Email transporter not initialized');
        }
      }

      const mailOptions = {
        from: {
          name: 'FixMe Platform',
          address: process.env.EMAIL_USER
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Registration approval email
  generateApprovalEmail(technicianName, badgeType) {
    const subject = '🎉 Your FixMe Registration Has Been Approved!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .badge { display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f1f1; border-radius: 5px; }
          .success-icon { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Congratulations!</h1>
            <p>Your FixMe registration has been approved</p>
          </div>
          
          <div class="content">
            <h2>Welcome to FixMe, ${technicianName}! 🛠️</h2>
            
            <p>Great news! Your registration as a technician on the FixMe platform has been <strong>approved</strong>.</p>
            
            <div class="badge">Badge Type: ${this.getBadgeDisplayName(badgeType)}</div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>✅ You can now log in to your FixMe account</li>
              <li>📱 Download the FixMe mobile app</li>
              <li>🔔 Start receiving service requests in your area</li>
              <li>💰 Begin earning by helping customers</li>
            </ul>
            
            <h3>Getting Started:</h3>
            <ol>
              <li>Log in to your account using your registered email and password</li>
              <li>Complete your profile setup</li>
              <li>Set your availability and service areas</li>
              <li>Start accepting service requests!</li>
            </ol>
            
            <a href="#" class="button">Login to Your Account</a>
            
            <p><strong>Important:</strong> Please keep your profile updated and maintain high service quality to retain your badge status.</p>
          </div>
          
          <div class="footer">
            <p>Welcome to the FixMe family! 🎉</p>
            <p>If you have any questions, contact us at support@fixme.com</p>
            <p>&copy; 2025 FixMe Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  // Registration rejection email
  generateRejectionEmail(technicianName, rejectionReason) {
    const subject = 'FixMe Registration Status Update';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Status</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f1f1; border-radius: 5px; }
          .info-icon { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="info-icon">ℹ️</div>
            <h1>Registration Update</h1>
            <p>Regarding your FixMe application</p>
          </div>
          
          <div class="content">
            <h2>Hello ${technicianName},</h2>
            
            <p>Thank you for your interest in joining the FixMe platform as a technician.</p>
            
            <p>After careful review, we are unable to approve your registration at this time.</p>
            
            <div class="reason-box">
              <h3>📋 Reason for rejection:</h3>
              <p><strong>${this.getRejectionReasonText(rejectionReason)}</strong></p>
            </div>
            
            <h3>What can you do next?</h3>
            <ul>
              <li>📄 Review and update your documents if needed</li>
              <li>🎓 Obtain additional certifications or experience</li>
              <li>📞 Contact our support team for guidance</li>
              <li>🔄 Reapply once you've addressed the issues</li>
            </ul>
            
            <p>We encourage you to address the mentioned concerns and reapply in the future. Our goal is to maintain high service quality on the platform.</p>
            
            <a href="#" class="button">Contact Support</a>
          </div>
          
          <div class="footer">
            <p>Thank you for your understanding.</p>
            <p>For questions, contact us at support@fixme.com</p>
            <p>&copy; 2025 FixMe Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  // Interview scheduled email
  generateInterviewEmail(technicianName, interviewData) {
    const subject = '📅 Interview Scheduled - FixMe Registration';
    
    const interviewDate = new Date(interviewData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Scheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .interview-details { background: white; border: 2px solid #4facfe; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .button { display: inline-block; background: #4facfe; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f1f1; border-radius: 5px; }
          .calendar-icon { font-size: 48px; margin-bottom: 20px; }
          .important-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="calendar-icon">📅</div>
            <h1>Interview Scheduled</h1>
            <p>Your FixMe registration interview</p>
          </div>
          
          <div class="content">
            <h2>Hello ${technicianName},</h2>
            
            <p>An interview has been scheduled for your FixMe technician registration. This is an important step in the verification process.</p>
            
            <div class="interview-details">
              <h3>📋 Interview Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">📅 Date:</span>
                <span class="detail-value">${interviewDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">⏰ Time:</span>
                <span class="detail-value">${interviewData.timeSlot}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">⏱️ Duration:</span>
                <span class="detail-value">${interviewData.duration} minutes</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">💼 Type:</span>
                <span class="detail-value">${interviewData.type === 'online' ? '💻 Online Interview' : '🏢 Physical Interview'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">👤 Interviewer:</span>
                <span class="detail-value">${interviewData.interviewerName}</span>
              </div>
              
              ${interviewData.type === 'online' ? `
                <div class="detail-row">
                  <span class="detail-label">🔗 Platform:</span>
                  <span class="detail-value">${interviewData.platform.charAt(0).toUpperCase() + interviewData.platform.slice(1)}</span>
                </div>
                ${interviewData.meetingLink ? `
                  <div class="detail-row">
                    <span class="detail-label">🔗 Meeting Link:</span>
                    <span class="detail-value"><a href="${interviewData.meetingLink}" target="_blank">Join Meeting</a></span>
                  </div>
                ` : ''}
              ` : `
                <div class="detail-row">
                  <span class="detail-label">📍 Location:</span>
                  <span class="detail-value">${interviewData.physicalLocation}</span>
                </div>
              `}
              
              ${interviewData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Notes:</span>
                  <span class="detail-value">${interviewData.notes}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="important-note">
              <h3>⚠️ Important Information:</h3>
              <ul>
                <li>Please be available 10 minutes before the scheduled time</li>
                <li>Have your documents and certifications ready for review</li>
                <li>Ensure stable internet connection for online interviews</li>
                <li>Contact us immediately if you cannot attend</li>
              </ul>
            </div>
            
            <h3>What to expect:</h3>
            <ul>
              <li>📄 Document verification</li>
              <li>🛠️ Technical skills assessment</li>
              <li>💼 Experience discussion</li>
              <li>❓ Q&A session</li>
            </ul>
            
            ${interviewData.type === 'online' && interviewData.meetingLink ? 
              `<a href="${interviewData.meetingLink}" class="button">Join Interview</a>` :
              '<a href="#" class="button">Contact Support</a>'
            }
          </div>
          
          <div class="footer">
            <p>Good luck with your interview! 🍀</p>
            <p>For questions, contact us at support@fixme.com</p>
            <p>&copy; 2025 FixMe Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  getBadgeDisplayName(badgeType) {
    const badges = {
      'professional': 'Verified Professional',
      'experience': 'Verified by Experience',
      'probation': 'On Probation'
    };
    return badges[badgeType] || badgeType;
  }

  getRejectionReasonText(reason) {
    const reasons = {
      'incomplete_documents': 'Incomplete or missing required documents',
      'invalid_credentials': 'Invalid or unverifiable credentials',
      'failed_verification': 'Failed background or identity verification',
      'insufficient_experience': 'Insufficient relevant work experience',
      'other': 'Application did not meet platform requirements'
    };
    return reasons[reason] || reason;
  }

  // Generic email sender for custom content
  async sendCustomEmail(to, subject, content) {
    return await this.sendEmail(to, subject, content);
  }

  // Registration approval
  async sendApprovalEmail(technicianEmail, technicianName, badgeType) {
    const { subject, html } = this.generateApprovalEmail(technicianName, badgeType);
    return await this.sendEmail(technicianEmail, subject, html);
  }

  // Registration rejection
  async sendRejectionEmail(technicianEmail, technicianName, rejectionReason) {
    const { subject, html } = this.generateRejectionEmail(technicianName, rejectionReason);
    return await this.sendEmail(technicianEmail, subject, html);
  }

  // Interview scheduled
  async sendInterviewEmail(technicianEmail, technicianName, interviewData) {
    const { subject, html } = this.generateInterviewEmail(technicianName, interviewData);
    return await this.sendEmail(technicianEmail, subject, html);
  }
}

module.exports = new EmailService();