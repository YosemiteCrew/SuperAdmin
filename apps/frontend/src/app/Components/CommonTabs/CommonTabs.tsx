"use client";
import React, { useState } from "react";
import { Tabs, Tab, Dropdown, Button } from 'react-bootstrap';
import "./CommonTabs.css";
import { FaPlus } from "react-icons/fa";

interface TabData {
  eventKey: string;
  title: string;
  content: React.ReactNode;
  count?: React.ReactNode; // optional
}

interface CommonTabsProps {
  tabs: TabData[];
  defaultActiveKey?: string;
  showStatusSelect?: boolean; // 👈 optional
  showCreateButton?: boolean; // 👈 new parameter
  createButtonText?: string; // �� custom button text
  onCreateClick?: () => void; // 👈 create button click handler
  onFilterChange?: (value: "30" | "60" | "90") => void;
}

const statusOptions = [
  { label: "Last 30 Days", value: "30" },
  { label: "Last 60 Days", value: "60" },
  { label: "Last 90 Days", value: "90" },
];

const CommonTabs = ({ 
  tabs, 
  defaultActiveKey, 
  showStatusSelect = false, 
  showCreateButton = false,
  createButtonText = "Create New",
  onCreateClick,
  onFilterChange 
}: CommonTabsProps) => {
  const [status, setStatus] = useState<string>('30');

  const handleDropdownSelect = (eventKey: string | null) => {
    if (eventKey === "30" || eventKey === "60" || eventKey === "90") {
      setStatus(eventKey);
      onFilterChange?.(eventKey); // 👈 Call parent handler if exists
    }
  };

  const handleCreateClick = () => {
    onCreateClick?.();
  };

  return (
    <div className="LinesTabsSec">
      <Tabs defaultActiveKey={defaultActiveKey || tabs[0].eventKey} className="linesTabs ">
        {tabs.map((tab) => (
          <Tab eventKey={tab.eventKey} title={<>{tab.title}{tab.count && (<span className="tab-count-badge">{tab.count}</span>)}</> } key={tab.eventKey}>
            {tab.content}
          </Tab>
        ))}
      </Tabs>

      {showStatusSelect && (
        <div className="SelectStatus">
          <Dropdown onSelect={handleDropdownSelect}>
            <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
              {statusOptions.find(opt => opt.value === status)?.label || "Last 30 Days"}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {statusOptions.map((opt) => (
                <Dropdown.Item
                  eventKey={opt.value}
                  key={opt.value} // ✅ use unique string as key
                  active={status === opt.value}
                >
                  {opt.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      )}

      {showCreateButton && (
        <div className="SelectStatus">
          <Button 
          className="create-new-btn"
          onClick={handleCreateClick}
          variant="primary"
        >
          <FaPlus className="create-icon" />
          {createButtonText}
        </Button>
        </div>
        
      )}
    </div>
  );
};

export default CommonTabs;
