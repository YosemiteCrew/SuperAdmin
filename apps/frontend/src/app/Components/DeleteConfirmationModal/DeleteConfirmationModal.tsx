"use client";
import React from "react";
import { Modal, Button } from 'react-bootstrap';
import { FaTimes, FaTrash } from 'react-icons/fa';
import "./DeleteConfirmationModal.css";

interface DeleteConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  loading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  show,
  onHide,
  onConfirm,
  itemName,
  itemType = "Assessment",
  loading = false
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete {itemType}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="delete-confirmation-content">
          <p className="confirmation-text">
            Are you sure you want to delete the {itemType}:
          </p>
          <div className="item-name">{itemName}</div>
          <p className="warning-text">
            This action cannot be undone. All data associated with this {itemType.toLowerCase()} will be permanently removed.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={loading}>
          <FaTimes className="me-2" />
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          <FaTrash className="me-2" />
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmationModal; 