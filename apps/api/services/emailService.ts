import AWS from 'aws-sdk';
import fs from 'fs';

// AWS SES Config
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

interface Attachment {
  filename: string;
  path: string;
  contentType: string;
}

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Attachment[];
}

export const sendEmailWithAttachments = async (params: EmailParams): Promise<void> => {
  try {
    const { to, subject, htmlBody, textBody, attachments } = params;

    // If there are attachments, use sendRawEmail
    if (attachments && attachments.length > 0) {
      const rawMessage = await createRawMessageWithAttachments(to, subject, htmlBody, textBody || '', attachments);
      
      const rawEmailParams = {
        RawMessage: {
          Data: rawMessage
        }
      };

      await ses.sendRawEmail(rawEmailParams).promise();
    } else {
      // For emails without attachments, use regular sendEmail
      const emailParams: any = {
        Source: process.env.AWS_MAIL_DRIVER!,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: htmlBody,
            },
          },
        },
      };

      // Add text body if provided
      if (textBody) {
        emailParams.Message.Body.Text = {
          Data: textBody,
        };
      }

      await ses.sendEmail(emailParams).promise();
    }

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const createRawMessageWithAttachments = async (
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
  attachments: Attachment[]
): Promise<string> => {
  const boundary = `boundary_${Date.now()}`;
  const message: string[] = [];

  // Email headers
  message.push(`From: ${process.env.AWS_MAIL_DRIVER}`);
  message.push(`To: ${to}`);
  message.push(`Subject: ${subject}`);
  message.push(`MIME-Version: 1.0`);
  message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  message.push('');

  // Text part
  message.push(`--${boundary}`);
  message.push('Content-Type: text/plain; charset=UTF-8');
  message.push('Content-Transfer-Encoding: 7bit');
  message.push('');
  message.push(textBody);
  message.push('');

  // HTML part
  message.push(`--${boundary}`);
  message.push('Content-Type: text/html; charset=UTF-8');
  message.push('Content-Transfer-Encoding: 7bit');
  message.push('');
  message.push(htmlBody);
  message.push('');

  // Attachments
  for (const attachment of attachments) {
    try {
      const fileContent = fs.readFileSync(attachment.path);
      const base64Content = fileContent.toString('base64');

      message.push(`--${boundary}`);
      message.push(`Content-Type: ${attachment.contentType}; name="${attachment.filename}"`);
      message.push('Content-Transfer-Encoding: base64');
      message.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      message.push('');
      message.push(base64Content);
      message.push('');
    } catch (fileError) {
      console.error(`Error reading attachment ${attachment.filename}:`, fileError);
      // Continue with other attachments
    }
  }

  message.push(`--${boundary}--`);

  return message.join('\r\n');
};

// Approval Email
export const sendApprovalEmail = async ({
  to,
  businessName,
  attachments = [],
}: {
  to: string;
  businessName: string;
  attachments?: any[];
}): Promise<void> => {
  const subject = `Profile Verification Approved - ${businessName}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Profile Verification Approved</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .approval-box { background-color: white; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
        .next-steps { background-color: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .attachments { margin-top: 20px; }
        .attachment-item { background-color: white; padding: 10px; margin: 5px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Profile Verification Approved!</h1>
        </div>
        
        <div class="content">
          <p>Dear <strong>${businessName}</strong>,</p>
          
          <div class="approval-box">
            <h2>Congratulations! Your profile has been verified successfully.</h2>
            <p>We are pleased to inform you that your business profile verification request has been approved. Your account is now fully active and ready to use.</p>
          </div>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>You can now access all features of your account</li>
              <li>Start managing your business profile</li>
              <li>Connect with customers and grow your business</li>
              <li>Explore our platform's full capabilities</li>
            </ul>
          </div>
          
          ${attachments.length > 0 ? `
            <div class="attachments">
              <h3>Additional Documents:</h3>
              ${attachments.map(file => `
                <div class="attachment-item">
                  <strong>${file.filename}</strong> (${formatFileSize(file.size)})
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <p>If you have any questions or need assistance, our support team is here to help.</p>
          
          <p>Welcome aboard!<br>
          <strong>Yosemite Crew Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Profile Verification Approved
    
    Dear ${businessName},
    
    Congratulations! Your profile has been verified successfully.
    
    We are pleased to inform you that your business profile verification request has been approved. Your account is now fully active and ready to use.
    
    What's Next?
    - You can now access all features of your account
    - Start managing your business profile
    - Connect with customers and grow your business
    - Explore our platform's full capabilities
    
    ${attachments.length > 0 ? `
    Additional Documents:
    ${attachments.map(file => `- ${file.filename} (${formatFileSize(file.size)})`).join('\n')}
    ` : ''}
    
    If you have any questions or need assistance, our support team is here to help.
    
    Welcome aboard!
    Yosemite Crew Team
  `;

  // Prepare attachments for email
  const emailAttachments: Attachment[] = attachments.map(file => ({
    filename: file.filename,
    path: file.path,
    contentType: file.mimetype,
  }));

  await sendEmailWithAttachments({
    to,
    subject,
    htmlBody,
    textBody,
    attachments: emailAttachments,
  });
};

// Rejection Email
export const sendRejectionEmail = async ({
  to,
  businessName,
  message,
  attachments = [],
}: {
  to: string;
  businessName: string;
  message: string;
  attachments?: any[];
}): Promise<void> => {
  const subject = `Profile Verification Rejected - ${businessName}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Profile Verification Rejected</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .reason-box { background-color: white; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
        .next-steps { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .attachments { margin-top: 20px; }
        .attachment-item { background-color: white; padding: 10px; margin: 5px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Profile Verification Rejected</h1>
        </div>
        
        <div class="content">
          <p>Dear <strong>${businessName}</strong>,</p>
          
          <p>We regret to inform you that your profile verification request has been rejected.</p>
          
          <div class="reason-box">
            <h3>Reason for Rejection:</h3>
            <p>${message}</p>
          </div>
          
          <div class="next-steps">
            <h3>Next Steps:</h3>
            <ul>
              <li>Review the feedback provided above</li>
              <li>Make the necessary corrections to your profile</li>
              <li>Resubmit your verification request</li>
              <li>Contact support if you need clarification</li>
            </ul>
          </div>
          
          ${attachments.length > 0 ? `
            <div class="attachments">
              <h3>Supporting Documents:</h3>
              ${attachments.map(file => `
                <div class="attachment-item">
                  <strong>${file.filename}</strong> (${formatFileSize(file.size)})
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>
          <strong>Yosemite Crew Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Profile Verification Rejected
    
    Dear ${businessName},
    
    We regret to inform you that your profile verification request has been rejected.
    
    Reason for Rejection:
    ${message}
    
    Next Steps:
    - Review the feedback provided above
    - Make the necessary corrections to your profile
    - Resubmit your verification request
    - Contact support if you need clarification
    
    ${attachments.length > 0 ? `
    Supporting Documents:
    ${attachments.map(file => `- ${file.filename} (${formatFileSize(file.size)})`).join('\n')}
    ` : ''}
    
    If you have any questions or need clarification, please don't hesitate to contact our support team.
    
    Best regards,
    Yosemite Crew Team
  `;

  // Prepare attachments for email
  const emailAttachments: Attachment[] = attachments.map(file => ({
    filename: file.filename,
    path: file.path,
    contentType: file.mimetype,
  }));

  await sendEmailWithAttachments({
    to,
    subject,
    htmlBody,
    textBody,
    attachments: emailAttachments,
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 