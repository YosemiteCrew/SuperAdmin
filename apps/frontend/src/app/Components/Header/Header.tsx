"use client";
import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Image from "next/image";
import "./Header.css";

const Header: React.FC = () => {
  return (
    <Navbar expand="lg" className="header-navbar " fixed="top">
      <Container>
        {/* Logo */}
        <Navbar.Brand href="/">
          <Image src="/Images/logo.png" alt="Logo" width={80} height={80} />
        </Navbar.Brand>

        {/* Mobile Toggle Button */}
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <Icon icon="mdi:menu" width="28" height="28" />
        </Navbar.Toggle>

        {/* Navbar Links */}
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto nav-links HeaderNavLink">
            <Nav.Link href="">Home</Nav.Link>
            <Nav.Link href="">About Us</Nav.Link>
            <Nav.Link href="">PMS</Nav.Link>
            <Nav.Link href="">Developers</Nav.Link>
            <Nav.Link href="">Contact Us</Nav.Link>
            <Nav.Link href="">Blog</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
