"use client";
import React, { useEffect, useState } from "react";
import "./DataTable.css";
import GenericTable from "../GenericTable/GenericTable";
import { Button, Spinner } from "react-bootstrap";
import { FaEye } from "react-icons/fa6";
import axios from "axios";

type PendingVerfyTableProps = {
  type: string;
};

type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};

type PendingVerificationItem = {
  _id: string;
  name: string;
  place: string;
  country: string;
  profile: string;
  since: string;
  isVerified: number;
};

const columns: Column<PendingVerificationItem>[] = [
  {
    label: "Practice Name",
    key: "name",
    render: (item) => <p className="name">{item.name}</p>,
  },
  {
    label: "Region",
    key: "region",
    render: (item) => (
      <div>
        <p>{item.place}</p>
        <span>{item.country}</span>
      </div>
    ),
  },
  {
    label: "Profile Completion",
    key: "profile",
    render: (item) => <p>{item.profile}</p>,
  },
  {
    label: "Pending Since",
    key: "since",
    render: (item) => <p>{item.since}</p>,
  },
  {
    label: "Actions",
    key: "actions",
    render: (item) => (
      <div className="action-btn-col">
        <Button
          className="circle-btn view"
          title="View"
          //onClick={() => console.log("View", item)}
          onClick={() => {
            // Navigate to business details page
            window.location.href = `/business-details/${item._id}`;
          }}
        >
          <FaEye size={24} />
        </Button>
      </div>
    ),
  },
];

const PendingVerfyTable: React.FC<PendingVerfyTableProps> = ({ type }) => {
  const [fullData, setFullData] = useState<PendingVerificationItem[]>([]);
  const [visibleData, setVisibleData] = useState<PendingVerificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchPendingData = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/pendingVerifications`,
        {
          businessType: type,
          countOnly: "no",
        }
      );

      const transformed = (response.data.data || []).map((item: any) => ({
        _id: item._id,
        name: item.profileData?.businessName || "N/A",
        place: item.profileData?.city || "Unknown",
        country: item.profileData?.country || "Unknown",
        profile: item.profileData?.progress
          ? `${item.profileData.progress}%`
          : "0%",
        since: formatTimeSince(item.createdAt),
      }));

      setFullData(transformed);
      setVisibleData(transformed.slice(0, 2)); // Initially show 2 items
    } catch (error) {
      console.error("Error fetching pending data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeSince = (createdAt: string): string => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diff = now - created;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  useEffect(() => {
    fetchPendingData();
  }, [type]);

  const handleSeeAll = () => {
    setVisibleData(fullData);
    setShowAll(true);
  };

  return (
    <div className="table-wrapper">
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <GenericTable data={visibleData} columns={columns as any} bordered={false} />
          {fullData.length > 2 && !showAll && (
            <div className="table-footerBtn">
              <Button onClick={handleSeeAll}>See All</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingVerfyTable;
