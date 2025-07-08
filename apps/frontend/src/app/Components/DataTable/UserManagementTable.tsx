"use client";
import React, { useState } from "react";
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button, Col, Dropdown, Form, Modal, Row } from 'react-bootstrap'
import { FaEye } from 'react-icons/fa6';
import { MdCancel, MdDelete, MdModeEdit } from 'react-icons/md';
import { RiDeleteBinLine } from 'react-icons/ri';
import { BsThreeDotsVertical } from 'react-icons/bs';
import type { ModalProps } from 'react-bootstrap';
import { FormInput } from '@/app/Pages/CRMPage/CRMBusinessLead/CRMBusinessLead';

// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};

type UserManagementItem = {
  name: string;
  permission: string;
  time: string;
  date: string;
  statusaction: string;
};

// Sample Data
const User: UserManagementItem[] = [
  {
    name: "Hannah Walker",
    permission: "CRM, CMS, Finance, User Management",
    time: "10:15 AM",
    date: "24 July 2025",
    statusaction: "",
  },
  {
    name: "Emma Thompson",
    permission: "CRM, CMS, Finance, User Management",
    time: "10:15 AM",
    date: "24 July 2025",
    statusaction: "Suspend",
  },
  {
    name: "Steve Whitman",
    permission: "CRM, CMS, Finance, User Management",
    time: "10:15 AM",
    date: "24 July 2025",
    statusaction: "Suspend",
  },
];

// ✅ Define your modal
function DeleteModal(props: ModalProps) {
  return (
    <Modal {...props} aria-labelledby="contained-modal-title-vcenter" centered className='UserDeleteModal'>
      <Modal.Body>
        <div className="delteTexed">
          <h2>Delete Account</h2>
          <h6>Are you sure you want to delete the account of admin@yosemitecrew.com?</h6>
        </div>
        <div className="ModalFtBtn">
          <Button onClick={props.onHide}><MdCancel/> Cancel</Button>
          <Button className='fill' onClick={props.onHide}><MdDelete /> Delete Account</Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function EditModal(props: ModalProps) {

  const [name, setName] = useState("")

  const [features, setFeatures] = useState([
    { name: "Customer Relationship Management", enabled: true, disabled: false },
    { name: "Content Management System", enabled: true, disabled: false },
    { name: "Analytics & Reporting", enabled: false, disabled: true },
    { name: "Finance & Earnings Management", enabled: true, disabled: false },
    { name: "Support Management", enabled: false, disabled: true },
    { name: "User Management", enabled: true, disabled: false },
    { name: "Communication Management", enabled: false, disabled: true },
  ]);

  const handleToggle = (index: number) => {
    const updated = [...features];
    updated[index].enabled = !updated[index].enabled;
    setFeatures(updated);
  };



  return (
    <Modal {...props} aria-labelledby="contained-modal-title-vcenter"centered className='UserEditModal'>
      <Modal.Body>

        <div className="EditUserBasic">
          <h6>Basic Details</h6>
          <Form>
            <Row>
              <Col md={6}><FormInput readonly={false} intype="text" inname="name" value={name} inlabel="First Name" onChange=   {(e) => setName(e.target.value)} /></Col>
              <Col md={6}><FormInput readonly={false} intype="text" inname="name" value={name} inlabel="Last Name" onChange={(e) => setName(e.target.value)} /></Col>
            </Row>
            <Row>
              <Col md={12}>
                <FormInput readonly={false} intype="email" inname="name" value={name} inlabel="Enter your email" onChange=   {(e) => setName(e.target.value)} />
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <FormInput readonly={false} intype="number" inname="name" value={name} inlabel="Phone number" onChange=   {(e) => setName(e.target.value)} />
              </Col>
            </Row>
          </Form>
        </div>

        <div className="EditUserPermission">
          <h6>Permissions</h6>
          <div className="PermissionToggleDiv">

            {features.map((feature, index) => (
              <div key={index} className="featureItem">
                <span
                  className={`$"featureName ${
                    feature.disabled ? "disabled" : ""
                  }`}>
                  {feature.name}
                </span>
                <Form.Check
                  type="switch"
                  id={`switch-${index}`}
                  checked={feature.enabled}
                  disabled={feature.disabled}
                  onChange={() => handleToggle(index)}
                />
              </div>
            ))}





          </div>


        </div>
        



      </Modal.Body>
    </Modal>
  );
}
function ViewModal(props: ModalProps) {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Modal heading
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>View Confirmation</h4>
        <p>
          Are you sure you want to delete this item?
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onHide}>Cancel</Button>
        <Button variant="danger" onClick={props.onHide}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}

function UserManagementTable() {
  const [viewmodalShow, setViewModalShow] = React.useState(false);
  const [editmodalShow, setEditModalShow] = React.useState(false);
  const [deltemodalShow, setDelteModalShow] = React.useState(false);

  // ✅ Move your columns INSIDE the component
  const columns: Column<UserManagementItem>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => <p className="name">{item.name}</p>,
    },
    {
      label: "Permissions",
      key: "permissions",
      render: (item) => <p className="name">{item.permission}</p>,
    },
    {
      label: "Last Login",
      key: "login",
      render: (item) => (
        <div>
          <p>{item.time}</p>
          <span>{item.date}</span>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <>
          {item.statusaction === "Suspend" ? (
            <div className="btndropdown">
              <Button title="Suspend" className="grey">Suspend</Button>
              <div className="action-dropdown">
                <Dropdown align="end">
                  <Dropdown.Toggle as="span" className="custom-toggle">
                    <BsThreeDotsVertical className="menu-icon" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item>Edit</Dropdown.Item>
                    <Dropdown.Item>Save</Dropdown.Item>
                    <Dropdown.Item>Delete</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          ) : (
            <div className="btndropdown">
              <Button title="Active">Active</Button>
              <div className="action-dropdown">
                <Dropdown align="end">
                  <Dropdown.Toggle as="span" className="custom-toggle">
                    <BsThreeDotsVertical className="menu-icon" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item>Edit</Dropdown.Item>
                    <Dropdown.Item>Save</Dropdown.Item>
                    <Dropdown.Item>Delete</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          )}
        </>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      render: () => (
        <div className="action-btn-col Actionflex">
          <Button className="circle-btn view" onClick={() => setViewModalShow(true)}>
            <FaEye size={24} />
          </Button>
          <Button className="circle-btn view" onClick={() => setEditModalShow(true)}>
            <MdModeEdit size={24} />
          </Button>
          <Button className="circle-btn view" onClick={() => setDelteModalShow(true)}>
            <RiDeleteBinLine size={24} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="table-wrapper">
        <GenericTable data={User} columns={columns} bordered={false} />
      </div>

      <DeleteModal show={deltemodalShow} onHide={() => setDelteModalShow(false)} />
      <EditModal show={editmodalShow} onHide={() => setEditModalShow(false)} />
      <ViewModal show={viewmodalShow} onHide={() => setViewModalShow(false)} />
    </>
  );
}

export default UserManagementTable;
