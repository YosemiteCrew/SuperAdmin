import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IoNotificationsSharp } from "react-icons/io5";
import { FaCircleExclamation,  FaBell } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import "./Notification.css"

const Notification = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Alert",
      message: "System maintenance scheduled",
      time: "10 min. ago",
      icon: <FaCircleExclamation className="error-icon" />,
    },
    {
      id: 2,
      title: "Success",
      message: "Your profile was updated",
      time: "1 hr ago",
      icon: <FaCheckCircle className="success-icon" />,
    },
    {
      id: 3,
      title: "Reminder",
      message: "Meeting with the team at 3 PM",
      time: "3 hrs ago",
      icon: <FaBell className="reminder-icon" />,
    },
  ]);

  // Toggle notification dropdown
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".Notify")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="NotifyDiv">
      <Link to="#" onClick={toggleNotifications}>
        <IoNotificationsSharp />
        {notifications.length > 0 && <span className="notiBadge">{notifications.length}</span>}
      </Link>

      {showNotifications && (
        <div className="notiinner">
          <ul>
            {notifications.map((noti) => (
              <li key={noti.id}>
                <span>{noti.icon}</span>
                <div>
                  <h4>{noti.title}</h4>
                  <p>{noti.message}</p>
                  <p>{noti.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Notification;
