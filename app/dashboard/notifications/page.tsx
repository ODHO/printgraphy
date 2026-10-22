"use client";

import { useEffect, useState } from "react";
import CustomerSidebar from "@/components/CustomerSidebar";

interface NotificationItem {
  id: string;
  title: string;
  orderNumber: string;
  timeAgo: string;
  isRead?: boolean;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Order Confirmation",
    orderNumber: "1T905GV34",
    timeAgo: "15 hours ago",
  },
  {
    id: "notif-2",
    title: "Order Confirmation",
    orderNumber: "1T905GV34",
    timeAgo: "15 hours ago",
  },
  {
    id: "notif-3",
    title: "Order Confirmation",
    orderNumber: "1T905GV34",
    timeAgo: "15 hours ago",
  },
  {
    id: "notif-4",
    title: "Order Confirmation",
    orderNumber: "1T905GV34",
    timeAgo: "15 hours ago",
  },
  {
    id: "notif-5",
    title: "Order Confirmation",
    orderNumber: "1T905GV34",
    timeAgo: "15 hours ago",
  },
];

function getTimeAgo(dateString?: string) {
  if (!dateString) return "15 hours ago";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(defaultNotifications);

  useEffect(() => {
    fetch("/api/orders?limit=5")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
          const liveNotifs: NotificationItem[] = data.orders.map((ord: any) => ({
            id: ord._id || ord.orderNumber,
            title: "Order Confirmation",
            orderNumber: ord.orderNumber || "1T905GV34",
            timeAgo: getTimeAgo(ord.createdAt),
          }));

          // Fill up to at least 5 with defaults if needed
          const combined = [...liveNotifs];
          while (combined.length < 5) {
            combined.push({
              id: `default-${combined.length + 1}`,
              title: "Order Confirmation",
              orderNumber: "1T905GV34",
              timeAgo: "15 hours ago",
            });
          }
          setNotifications(combined);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Left Customer Sidebar */}
          <CustomerSidebar activeItem="Notifications" />

          {/* Right Main Content */}
          <main className="flex-1 w-full min-w-0">
            <h1 className="text-2xl sm:text-[32px] font-extrabold text-zinc-900 tracking-tight mb-6 sm:mb-8">
              Notifications
            </h1>

            {/* List of Notification Cards */}
            <div className="space-y-4">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#fff1eb] rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-start gap-4 sm:gap-5 transition-all hover:bg-[#fff7f3]"
                >
                  {/* Sky blue icon container */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#e74b2d] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  {/* Body text */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1 leading-snug">
                      {item.title}
                    </h2>
                    <p className="text-xs sm:text-[13px] md:text-sm text-zinc-600 leading-relaxed">
                      We&apos;re excited to confirm that your order{" "}
                      <span className="font-semibold text-zinc-800">
                        #{item.orderNumber}
                      </span>{" "}
                      has been successfully placed with{" "}
                      <span className="font-semibold text-zinc-800">
                        PrintGraphi!
                      </span>{" "}
                      Expect updates soon.
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs sm:text-[13px] text-zinc-400 font-normal self-start whitespace-nowrap pt-0.5">
                    {item.timeAgo}
                  </span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
