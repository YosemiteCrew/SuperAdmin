"use client";
import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { FaPaperclip, FaEnvelope } from "react-icons/fa";
import "./RejectModal.css";

interface RejectModalProps {
  show: boolean;
  onHide: () => void;
  businessName: string;
  onReject: (message: string, attachments: File[]) => void;
  loading?: boolean;
}

const RejectModal: React.FC<RejectModalProps> = ({
  show,
  onHide,
  businessName,
  onReject,
  loading = false,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (message.trim()) {
      onReject(message, attachments);
    }
  };

  const handleClose = () => {
    setMessage("");
    setAttachments([]);
    setSelectedFiles([]);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Reject Profile Verification</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="reject-instruction">
          <p>
            You're rejecting the profile verification request for <strong>{businessName}</strong>. 
            Please let the user know why their profile couldn't be approved. Your message will be 
            shared with them for clarification and resubmission.
          </p>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Your Message to {businessName}</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              placeholder="Briefly explain the reason for rejection..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="message-textarea"
            />
          </Form.Group>

          <div className="attachment-section">
            <label className="attachment-label">
              <FaPaperclip className="paperclip-icon" />
              <span>Attach files</span>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="attached-files">
              <h6>Attached Files:</h6>
              {attachments.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="remove-file-btn"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="dark"
          onClick={handleSubmit}
          disabled={loading || !message.trim()}
          className="send-message-btn"
        >
          <FaEnvelope className="envelope-icon" />
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RejectModal; 