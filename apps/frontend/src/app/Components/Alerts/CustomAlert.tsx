// components/Alerts/Alerts.tsx
import React from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type AlertType = "success" | "error" | "warning";

interface AlertMessageProps {
  type: AlertType;
  title: string;
  message: string;
}

const CustomAlert: React.FC<AlertMessageProps> = ({ type, title, message }) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-green-600" />;
      case "error":
        return <AlertCircle className="text-red-600" />;
      case "warning":
        return <Info className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "";
    }
  };

  return (
    <div className={`p-4 rounded-lg flex items-start gap-3 ${getColorClass()}`}>
      <div className="pt-1">{getIcon()}</div>
      <div>
        <strong className="block font-medium">{title}</strong>
        <p className="text-sm">{message}</p>
      </div>
      <button className="ml-auto text-xl text-gray-500 hover:text-black">
        <X size={16} />
      </button>
    </div>
  );
};

export default CustomAlert;
