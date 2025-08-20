"use client";
import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { X } from "lucide-react";
import { FaChevronLeft, FaChevronRight, FaCheck } from "react-icons/fa";
import "./PublishLaterModal.css"; // make sure the file name matches exactly

interface PublishLaterModalProps {
  show: boolean;
  onHide: () => void;
  onSchedule: (date: Date) => void;
  loading?: boolean;
}

const PublishLaterModal: React.FC<PublishLaterModalProps> = ({
  show,
  onHide,
  onSchedule,
  loading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("13:00");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // --- time slots (10:00–17:30 in 30 min steps)
  const timeSlots = React.useMemo(() => {
    const out: string[] = [];
    for (let h = 0; h <= 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, []);

  // --- calendar grid (6 weeks)
  const calendarDays = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay()); // back to Sunday

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isCurrentMonth = d.getMonth() === month;
      const isToday = d.toDateString() === today.toDateString();
      const isSelected = d.toDateString() === selectedDate.toDateString();
      const isPast = d < today;
      days.push({ date: d, isCurrentMonth, isToday, isSelected, isPast });
    }
    return days;
  }, [currentMonth, selectedDate]);

  const handleDateSelect = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d >= today) setSelectedDate(d);
  };

  const handleMonth = (delta: number) =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hh}:${String(m).padStart(2, "0")} ${period}`;
  };

  const isScheduleDisabled = () => {
    const [h, m] = selectedTime.split(":").map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h, m, 0, 0);
    return dt <= new Date();
  };

  const handleSchedule = () => {
    const [h, m] = selectedTime.split(":").map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h, m, 0, 0);
    onSchedule(dt);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      dialogClassName="publish-modal"
      contentClassName="publish-modal-content"
      backdrop="static"
    >
      <div className="pm-header">
        <div className="pm-title">Set Publish Time</div>
        <button className="pm-close-btn" onClick={onHide}>
          <X />
        </button>
      </div>

      <div className="pm-body">
        {/* Left: Date */}
        <div className="pm-col">
          <div className="pm-section-title">Select Date</div>

          <div className="calendar-container">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={() => handleMonth(-1)}>
                <FaChevronLeft />
              </button>
              <span className="calendar-month">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button className="calendar-nav-btn" onClick={() => handleMonth(1)}>
                <FaChevronRight />
              </button>
            </div>

            <div className="calendar-days">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d} className="calendar-day-header">
                  {d}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((day, i) => (
                <button
                  key={i}
                  className={[
                    "calendar-day",
                    !day.isCurrentMonth ? "other-month" : "",
                    day.isToday ? "today" : "",
                    day.isSelected ? "selected" : "",
                    day.isPast ? "past" : "",
                  ].join(" ")}
                  onClick={() => handleDateSelect(day.date)}
                  disabled={day.isPast}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Time */}
        <div className="pm-col">
          <div className="pm-section-title">Select Time</div>
          <div className="time-slots">
            {timeSlots.map((t) => (
              <button
                key={t}
                className={`time-slot ${selectedTime === t ? "selected" : ""}`}
                onClick={() => setSelectedTime(t)}
              >
                {formatTime(t)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pm-footer">
        <button
          className="pm-schedule-btn"
          onClick={handleSchedule}
          disabled={isScheduleDisabled() || loading}
        >
          Schedule <FaCheck />
        </button>
      </div>
    </Modal>
  );
};

export default PublishLaterModal;
