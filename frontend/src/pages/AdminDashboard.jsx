import React, { useEffect, useState } from "react";
import {
  FaUsersCog,
  FaMoneyBill,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    pendingCommissions: 0,
    confirmed: 0,
  });
  const [ratePercent, setRatePercent] = useState("");
  const [pending, setPending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifs, setShowAllNotifs] = useState(false);

  const [monthly, setMonthly] = useState({
    months: [],
    bookings: [],
    confirmed: [],
    cancelled: [],
  });
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState("");
  const [chartType, setChartType] = useState("line"); // 'line' | 'area' | 'bar'
  const { user } = useAuth();

  // fallback monthly labels + zeros
  const fallbackMonthly = () => {
    const end = new Date();
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      labels.push(d.toLocaleString("en", { month: "short" }));
    }
    setMonthly({
      months: labels,
      bookings: [0, 0, 0, 0, 0, 0],
      confirmed: [0, 0, 0, 0, 0, 0],
      cancelled: [0, 0, 0, 0, 0, 0],
    });
  };

  // load all admin data
  const loadMonthly = async () => {
    try {
      setMonthlyLoading(true);
      setMonthlyError("");
      // overview (metrics)
      const res = await fetch(`${API_URL}/api/admin/overview`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load overview");
      setMetrics(
        data.metrics || {
          totalBookings: 0,
          pendingCommissions: 0,
          confirmed: 0,
        }
      );

      // pending commission bookings
      try {
        const p = await fetch(
          `${API_URL}/api/admin/bookings/pending-commission`,
          { credentials: "include" }
        );
        const pData = await p.json();
        if (p.ok && Array.isArray(pData.bookings)) setPending(pData.bookings);
        else setPending([]);
      } catch (e) {
        setPending([]);
      }

      // notifications
      try {
        const n = await fetch(`${API_URL}/api/admin/notifications`, {
          credentials: "include",
        });
        const nData = await n.json();
        if (n.ok && Array.isArray(nData.notifications))
          setNotifications(nData.notifications);
        else setNotifications([]);
      } catch (e) {
        setNotifications([]);
      }

      // monthly stats
      try {
        const m = await fetch(`${API_URL}/api/admin/stats/monthly`, {
          credentials: "include",
        });
        const mData = await m.json();
        if (m.ok && Array.isArray(mData.months) && mData.months.length > 0) {
          // Ensure arrays exist and lengths match months
          const months = mData.months;
          const bookings = Array.isArray(mData.bookings)
            ? mData.bookings.slice(0, months.length)
            : new Array(months.length).fill(0);
          const confirmed = Array.isArray(mData.confirmed)
            ? mData.confirmed.slice(0, months.length)
            : new Array(months.length).fill(0);
          const cancelled = Array.isArray(mData.cancelled)
            ? mData.cancelled.slice(0, months.length)
            : new Array(months.length).fill(0);
          setMonthly({ months, bookings, confirmed, cancelled });
        } else {
          fallbackMonthly();
        }
      } catch (e) {
        fallbackMonthly();
      }
    } catch (err) {
      const msg = err && err.message ? err.message : "Failed to load data";
      setMonthlyError(msg);
      fallbackMonthly();
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    loadMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update commission rate
  const updateRate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/commission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ratePercent: Number(ratePercent) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update rate");
      toast.success("Commission rate updated");
      setRatePercent("");
    } catch (e) {
      toast.error(e.message || "Failed to update rate");
    }
  };

  // mark a notification as read and update UI
  const markNotifAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to mark read");
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      // fail silently but toast
      toast.error(e.message || "Failed to mark notification as read");
    }
  };

  // confirm pending commission
  const confirmCommission = async (bookingId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/bookings/${bookingId}/commission/confirm`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to confirm");
      toast.success("Commission confirmed");
      setPending((prev) => prev.filter((b) => b._id !== bookingId));
    } catch (e) {
      toast.error(e.message || "Failed to confirm commission");
    }
  };

  // Chart renderer (safe and defensive)
  const renderChart = () => {
    const months = Array.isArray(monthly.months) ? monthly.months : [];
    const bookings = Array.isArray(monthly.bookings)
      ? monthly.bookings
      : new Array(months.length).fill(0);
    const confirmed = Array.isArray(monthly.confirmed)
      ? monthly.confirmed
      : new Array(months.length).fill(0);
    const cancelled = Array.isArray(monthly.cancelled)
      ? monthly.cancelled
      : new Array(months.length).fill(0);

    if (!months.length)
      return <div className="text-gray-500">No chart data</div>;

    // chart settings
    const height = 260;
    const paddingLeft = 44;
    const paddingRight = 24;
    const paddingTop = 24;
    const paddingBottom = 42;
    const chartWidth = Math.max(520, months.length * 90 + 80);
    const chartLeft = paddingLeft;
    const chartRight = chartWidth - paddingRight;
    const chartTop = paddingTop;
    const chartBottom = height - paddingBottom;
    const xStep =
      months.length > 1 ? (chartRight - chartLeft) / (months.length - 1) : 0;

    const allValues = [...bookings, ...confirmed, ...cancelled].map(
      (v) => Number(v) || 0
    );
    const rawMax = Math.max(1, ...allValues);
    // nice rounding
    const pow = Math.pow(10, Math.max(0, Math.floor(Math.log10(rawMax)) - 1));
    const niceMax = Math.ceil(rawMax / pow) * pow;

    const yScale = (v) => {
      const ratio = (Number(v) || 0) / niceMax;
      return chartBottom - ratio * (chartBottom - chartTop);
    };
    const xScale = (i) => chartLeft + i * xStep;

    const series = [
      {
        key: "bookings",
        label: "Bookings",
        values: bookings,
        stroke: "#0ea5e9",
        fill: "rgba(14,165,233,0.08)",
        dot: "#0ea5e9",
      }, // blue
      {
        key: "confirmed",
        label: "Confirmed",
        values: confirmed,
        stroke: "#6366f1",
        fill: "rgba(99,102,241,0.08)",
        dot: "#6366f1",
      }, // indigo
      {
        key: "cancelled",
        label: "Cancelled",
        values: cancelled,
        stroke: "#fb7185",
        fill: "rgba(251,113,133,0.08)",
        dot: "#fb7185",
      }, // rose
    ];

    // helpers to build paths
    const linePath = (vals) =>
      vals
        .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
        .join(" ");
    const areaPath = (vals) => {
      if (!vals.length) return "";
      const top = vals
        .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
        .join(" ");
      return `${top} L ${xScale(vals.length - 1)} ${chartBottom} L ${xScale(
        0
      )} ${chartBottom} Z`;
    };

    if (chartType === "bar") {
      // bar chart: grouped bars per month
      const groupWidth = Math.min(
        48,
        ((chartRight - chartLeft) / months.length) * 0.7
      );
      const barWidth = Math.floor(groupWidth / series.length);
      return (
        <div className="overflow-x-auto">
          <svg
            width={chartWidth}
            height={height}
            role="img"
            aria-label="Monthly bookings bar chart"
          >
            {/* grid lines and ticks */}
            {[0, Math.round(niceMax / 2), niceMax].map((t, idx) => (
              <g key={`grid-${t}`}>
                <line
                  x1={chartLeft}
                  y1={yScale(t)}
                  x2={chartRight}
                  y2={yScale(t)}
                  stroke="#f3f4f6"
                />
                <text
                  x={chartLeft - 8}
                  y={yScale(t) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* axis labels */}
            <line
              x1={chartLeft}
              y1={chartBottom}
              x2={chartRight}
              y2={chartBottom}
              stroke="#e5e7eb"
            />

            {/* bars */}
            {months.map((m, idx) => {
              const centerX = xScale(idx);
              // start offset to center group
              const groupStart = centerX - groupWidth / 2;
              return (
                <g key={`month-${idx}`}>
                  {series.map((s, si) => {
                    const v = Number(s.values[idx] || 0);
                    const bx = groupStart + si * barWidth;
                    const by = yScale(v);
                    const bh = Math.max(2, chartBottom - by);
                    return (
                      <rect
                        key={`${s.key}-${idx}`}
                        x={bx}
                        y={by}
                        width={barWidth - 2}
                        height={bh}
                        fill={s.stroke}
                        rx="3"
                        title={`${s.label} — ${m}: ${v}`}
                      />
                    );
                  })}
                  <text
                    x={centerX}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#4b5563"
                  >
                    {m}
                  </text>
                </g>
              );
            })}

            {/* legend */}
            {series.map((s, i) => (
              <g
                key={`legend-${s.key}`}
                transform={`translate(${chartLeft + i * 160}, 8)`}
              >
                <rect
                  x={0}
                  y={0}
                  width={12}
                  height={12}
                  fill={s.stroke}
                  rx="2"
                />
                <text x={18} y={10} fontSize="12" fill="#374151">
                  {s.label}: {s.values[months.length - 1] || 0}
                </text>
              </g>
            ))}
          </svg>
        </div>
      );
    }

    // line & area charts (SVG)
    return (
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={height}
          role="img"
          aria-label="Monthly bookings chart"
        >
          {/* grid and ticks */}
          {[0, Math.round(niceMax / 2), niceMax].map((t) => (
            <g key={`g-${t}`}>
              <line
                x1={chartLeft}
                y1={yScale(t)}
                x2={chartRight}
                y2={yScale(t)}
                stroke="#f3f4f6"
              />
              <text
                x={chartLeft - 8}
                y={yScale(t) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7280"
              >
                {t}
              </text>
            </g>
          ))}

          {/* axis bottom */}
          <line
            x1={chartLeft}
            y1={chartBottom}
            x2={chartRight}
            y2={chartBottom}
            stroke="#e5e7eb"
          />

          {/* months labels */}
          {months.map((m, i) => (
            <text
              key={`label-${i}`}
              x={xScale(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#4b5563"
            >
              {m}
            </text>
          ))}

          {/* series: area (optional) -> below lines */}
          {series.map((s, idx) => {
            const vals = s.values.map((v) => Number(v) || 0);
            if (chartType === "area") {
              const ap = areaPath(vals);
              return (
                <path
                  key={`area-${s.key}`}
                  d={ap}
                  fill={s.fill}
                  stroke="none"
                />
              );
            }
            return null;
          })}

          {/* lines */}
          {series.map((s) => {
            const vals = s.values.map((v) => Number(v) || 0);
            const lp = linePath(vals);
            return (
              <path
                key={`line-${s.key}`}
                d={lp}
                fill="none"
                stroke={s.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* dots */}
          {series.map((s) =>
            s.values.map((v, i) => (
              <circle
                key={`dot-${s.key}-${i}`}
                cx={xScale(i)}
                cy={yScale(Number(v) || 0)}
                r="3.5"
                fill={s.stroke}
              />
            ))
          )}

          {/* legend */}
          {series.map((s, i) => (
            <g
              key={`lg-${s.key}`}
              transform={`translate(${chartLeft + i * 160}, 8)`}
            >
              <rect x={0} y={0} width={12} height={12} fill={s.stroke} rx="2" />
              <text x={18} y={10} fontSize="12" fill="#374151">
                {s.label}: {s.values[months.length - 1] || 0}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                {(user?.name?.[0] || user?.email?.[0] || "A").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Chart area */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl p-8 mb-10 border border-blue-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Monthly Trends
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Overview of bookings, confirmations & cancellations
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
              >
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="bar">Bar</option>
              </select>

              <button
                onClick={loadMonthly}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-transform active:scale-95"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Chart Area */}
          <div className="w-full rounded-2xl p-6 bg-gradient-to-b from-white to-blue-50 border border-blue-100 shadow-lg relative overflow-hidden">
            {monthlyLoading ? (
              <div className="text-sm text-gray-500 animate-pulse text-center py-12">
                Loading chart…
              </div>
            ) : (
              <div className="relative">
                {/* Optional floating background highlights */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-50 via-white to-blue-50 opacity-30 pointer-events-none rounded-2xl"></div>
                {renderChart()}
              </div>
            )}

            {monthlyError && (
              <div className="text-sm text-red-600 mt-3 text-center">
                {monthlyError}
              </div>
            )}

            {/* Footer/Legend (optional for more style) */}
            <div className="flex justify-end mt-4 text-xs text-gray-500 gap-4">
              <span>📘 Bookings</span>
              <span>✔ Confirmed</span>
              <span>❌ Cancelled</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Total Bookings */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 hover:scale-[1.01]">
            {/* Top Row */}
            <div className="flex items-center justify-between">
              {/* Icon Section */}
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-blue-100 text-blue-600 shadow-inner">
                  <FaUsersCog className="text-2xl" />
                </div>
                {/* Text Content */}
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Total Bookings
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    {metrics.totalBookings}
                  </p>
                </div>
              </div>

              {/* Growth Badge */}
              {/* <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold shadow-sm">
                +12% ↑
              </span> */}
            </div>

            {/* Extra Details Section */}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                This number represents all bookings made within the platform,
                including both confirmed and pending ones.
              </p>
              <p className="text-sm text-gray-500">
                Tracking total bookings gives a clear overview of platform
                activity and demand trends.
              </p>
              <p className="text-sm text-gray-500">
                Updated daily to ensure accuracy across reporting and analytics.
              </p>
            </div>
          </div>

          {/* Commission Pending */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 hover:scale-[1.01]">
            {/* Top Row */}
            <div className="flex items-center justify-between">
              {/* Icon Section */}
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-yellow-100 text-yellow-600 shadow-inner">
                  <FaClock className="text-2xl" />
                </div>
                {/* Text Content */}
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Commission Pending
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    {metrics.pendingCommissions}
                  </p>
                </div>
              </div>

              {/* Growth Badge */}
              {/* <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold shadow-sm">
                +5% ⏳
              </span> */}
            </div>

            {/* Extra Details Section */}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                This value represents commissions that have been earned but are
                not yet paid out.
              </p>
              <p className="text-sm text-gray-500">
                Pending commissions are typically released after validation or a
                set payout cycle.
              </p>
              <p className="text-sm text-gray-500">
                Monitoring this helps forecast upcoming expenses and agent
                earnings.
              </p>
            </div>
          </div>

          {/* Confirmed Bookings */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 hover:scale-[1.01]">
            {/* Top Row */}
            <div className="flex items-center justify-between">
              {/* Icon Section */}
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-blue-100 text-blue-600 shadow-inner">
                  <FaCheckCircle className="text-2xl" />
                </div>
                {/* Text Content */}
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Confirmed Bookings
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    {metrics.confirmed}
                  </p>
                </div>
              </div>

              {/* Growth Badge */}
              {/* <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shadow-sm">
                +8% ↑
              </span> */}
            </div>

            {/* Extra Details Section */}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                This metric shows all bookings that have been verified and
                approved by the system.
              </p>
              <p className="text-sm text-gray-500">
                Tracking confirmed bookings helps monitor business growth and
                customer trust.
              </p>
              <p className="text-sm text-gray-500">
                Updated in real-time to reflect the latest data.
              </p>
            </div>
          </div>
        </div>

        {/* Commission Rate form */}
        <form
          onSubmit={updateRate}
          className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-8 max-w-xl mb-10 border border-blue-200"
        >
          {/* Header */}
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
            <FaMoneyBill className="text-green-600 text-2xl" />
            Update Commission Rate
          </h2>

          {/* Input Group */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Percentage (%)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                placeholder="Enter rate (1 - 99)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter the commission rate to apply for each successful booking.
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition text-white px-6 py-3 rounded-xl font-semibold shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>

        {/* Pending Commissions */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-8 mb-10 border border-blue-200">
          {/* Header */}
          <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
            <FaClock className="text-yellow-500" />
            Pending Commissions
          </h2>

          {/* Content */}
          <div className="space-y-4">
            {pending.length === 0 && (
              <div className="text-gray-500 italic text-sm bg-gray-50 border border-gray-200 rounded-xl p-4">
                No pending commissions.
              </div>
            )}

            {pending.map((b) => (
              <div
                key={b._id}
                className="flex items-center justify-between border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition"
              >
                {/* Commission Info */}
                <div>
                  <div className="font-semibold text-gray-900">
                    {b.property?.title || "No title"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Commission:{" "}
                    <span className="font-medium text-blue-600">
                      RWF{" "}
                      {b.commissionAmount?.toLocaleString?.() ??
                        b.commissionAmount}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => confirmCommission(b._id)}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition text-white px-6 py-2.5 rounded-xl font-medium shadow-md"
                >
                  Confirm
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🔔 Notifications
            </h2>
            {Array.isArray(notifications) && notifications.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium shadow-sm">
                {notifications.filter((n) => !n.isRead).length} Unread
              </span>
            )}
          </div>

          {/* Empty state */}
          {(!Array.isArray(notifications) || notifications.length === 0) && (
            <div className="text-gray-500 text-sm text-center py-4">
              No notifications yet 🎉
            </div>
          )}

          {/* Notifications list */}
          {Array.isArray(notifications) &&
            (showAllNotifs ? notifications : notifications.slice(0, 5)).map(
              (n) => {
                const ts = n.createdAt ? new Date(n.createdAt) : null;
                const diff = ts ? Date.now() - ts.getTime() : 0;
                const mins = Math.floor(diff / 60000);
                const hours = Math.floor(mins / 60);
                const days = Math.floor(hours / 24);
                const rel = ts
                  ? days > 0
                    ? `${days}d ago`
                    : hours > 0
                    ? `${hours}h ago`
                    : mins > 0
                    ? `${mins}m ago`
                    : "just now"
                  : "";
                const showNew = !n.isRead && diff < 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={n._id}
                    className={`p-4 rounded-xl border mb-3 transition-all duration-300 hover:shadow-md ${
                      !n.isRead
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        {/* Title + New badge */}
                        <div className="font-semibold text-gray-800 flex items-center gap-2">
                          {n.title}
                          {showNew && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs shadow-sm">
                              New
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        <div className="text-sm text-gray-600 whitespace-pre-line mt-1 leading-relaxed">
                          {n.message}
                        </div>

                        {/* Property info */}
                        {n.property?.title && (
                          <div className="text-xs mt-2 text-gray-500 flex items-center gap-1">
                            <span>🏠</span>
                            <span>
                              Property:{" "}
                              <span className="font-medium text-gray-700">
                                {n.property.title}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Time + Mark as read */}
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className="text-xs text-gray-400"
                          title={ts ? ts.toLocaleString() : ""}
                        >
                          {rel}
                        </span>
                        {!n.isRead && (
                          <button
                            onClick={() => markNotifAsRead(n._id)}
                            className="text-blue-600 text-xs hover:underline font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}

          {/* Read more / Show less */}
          {Array.isArray(notifications) && notifications.length > 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllNotifs((s) => !s)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                {showAllNotifs ? "Show Less" : "Read More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
