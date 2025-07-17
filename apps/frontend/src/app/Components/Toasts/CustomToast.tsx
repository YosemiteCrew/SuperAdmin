// components/Toasts/CustomToast.tsx
import React from "react";
import { MdCheckCircle, MdError, MdInfo } from "react-icons/md";

interface CustomToastProps {
  title: string;
  message: string;
  type: "success" | "error" | "info";
}

const CustomToast: React.FC<CustomToastProps> = ({ title, message, type }) => {
  let icon;

  switch (type) {
    case "success":
      icon = <MdCheckCircle color="green" size={24} />;
      break;
    case "error":
      icon = <MdError color="red" size={24} />;
      break;
    case "info":
    default:
      icon = <MdInfo color="blue" size={24} />;
      break;
  }

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <div>{icon}</div>
      <div>
        <strong>{title}</strong>
        <div>{message}</div>
      </div>
    </div>
  );
};

export default CustomToast;
