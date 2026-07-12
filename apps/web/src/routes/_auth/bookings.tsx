import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  X,
  Building,
  AlertTriangle,
  CheckCircle,
  LayoutGrid,
  CalendarDays,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@odoo-hackathon-2026/ui/components/motion/loader";

import { orpc } from "@/utils/orpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@odoo-hackathon-2026/ui/components/motion/select";
import { BottomSheet } from "@odoo-hackathon-2026/ui/components/motion/bottom-sheet";
import { WheelPicker } from "@odoo-hackathon-2026/ui/components/motion/wheel-picker";

export const Route = createFileRoute("/_auth/bookings")({
  component: RouteComponent,
});

type ViewMode = "kanban" | "calendar";

// Helper to get week dates (Mon to Sun) based on selected date
const getWeekDays = (currentDateStr: string) => {
  const current = new Date(currentDateStr);
  const day = current.getDay(); // 0 is Sun, 1 is Mon, etc.
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(current.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

function RouteComponent() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalAssetId, setModalAssetId] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Queries
  const { data: employee } = useQuery(orpc.employee.current.queryOptions());
  const { data: assets } = useQuery(orpc.asset.list.queryOptions());
  const { data: departments } = useQuery(orpc.department.list.queryOptions());

  // Filter bookable assets
  const bookableAssets = useMemo(() => {
    return assets?.filter((a) => a.isBookable) || [];
  }, [assets]);

  // Set default bookable asset if none selected
  useMemo(() => {
    if (bookableAssets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(bookableAssets[0].id);
    }
  }, [bookableAssets, selectedAssetId]);

  // Calculate week dates if in calendar view
  const weekDays = useMemo(() => {
    return getWeekDays(selectedDate);
  }, [selectedDate]);

  // Fetch bookings based on active view mode
  const listParams = useMemo(() => {
    if (viewMode === "calendar") {
      return {
        assetId: selectedAssetId,
        date: weekDays[0],
        endDate: weekDays[6],
      };
    } else {
      return {
        assetId: null,
        date: selectedDate,
        endDate: selectedDate,
      };
    }
  }, [viewMode, selectedAssetId, selectedDate, weekDays]);

  const { data: bookings, refetch: refetchBookings } = useQuery({
    ...orpc.booking.list.queryOptions({ input: listParams }),
    enabled: bookableAssets.length > 0,
  });

  const cancelBookingMutation = useMutation(orpc.booking.cancel.mutationOptions());

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBookingMutation.mutateAsync({ bookingId });
      toast.success("Booking cancelled successfully");
      refetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel booking");
    }
  };

  // Group today's bookings by assetId for Kanban view
  const bookingsByAsset = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookableAssets.forEach((a) => {
      map[a.id] = [];
    });
    bookings?.forEach((b) => {
      if (map[b.assetId]) {
        map[b.assetId]?.push(b);
      }
    });
    return map;
  }, [bookings, bookableAssets]);

  // Group selected resource's bookings by day for Calendar view
  const bookingsByDay = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    weekDays.forEach((day) => {
      map[day] = [];
    });
    bookings?.forEach((b) => {
      const bDate = new Date(b.startTime).toISOString().split("T")[0];
      if (map[bDate]) {
        map[bDate].push(b);
      }
    });
    return map;
  }, [bookings, weekDays]);

  const selectedAsset = useMemo(() => {
    return bookableAssets.find((a) => a.id === selectedAssetId) || null;
  }, [bookableAssets, selectedAssetId]);

  const formattedDateLabel = useMemo(() => {
    const dateObj = new Date(`${selectedDate}T00:00:00`);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDate]);

  // Navigate dates
  const handlePrevDate = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    if (viewMode === "calendar") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDate = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    if (viewMode === "calendar") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const openBookModal = (assetId: string) => {
    setModalAssetId(assetId);
    setShowBookingModal(true);
  };

  const canCancel = (b: any) => {
    if (!employee) return false;
    return (
      b.bookedById === employee.id ||
      employee.role === "ADMIN" ||
      employee.role === "ASSET_MANAGER"
    );
  };

  return (
    <div className="p-6 space-y-6 min-h-screen pb-16 bg-neutral-950 text-neutral-100 mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-400" />
            Resource Bookings
          </h1>
          <p className="text-xs text-neutral-500 max-w-xl">
            Book shared meeting rooms, equipment, or vehicles with automated scheduling overlap conflicts protection.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-xl self-start">
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-colors ${
              viewMode === "kanban"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Resource Kanban
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition-colors ${
              viewMode === "calendar"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Weekly Calendar
          </button>
        </div>
      </div>

      {bookableAssets.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-3xl p-12 text-center text-sm text-neutral-500 flex flex-col items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-neutral-700 animate-pulse" />
          <p>No bookable resources registered in your organization yet.</p>
          <p className="text-xs text-neutral-600 max-w-md">
            Ask an Administrator or Asset Manager to register a resource and check the "Allow booking as shared resource" option.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Calendar Controls & Quick Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl shadow-sm">
            {/* Left: Date navigation */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrevDate}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-neutral-855 hover:border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleToday}
                className="h-9 px-3 rounded-xl border border-neutral-855 hover:border-neutral-800 bg-neutral-950 text-xs font-semibold text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextDate}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-neutral-855 hover:border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              {/* Premium bottom sheet trigger */}
              <button
                onClick={() => setShowDatePicker(true)}
                className="h-9 px-3.5 rounded-xl border border-neutral-855 hover:border-neutral-800 bg-neutral-950 text-xs font-semibold text-neutral-200 hover:text-neutral-100 transition-colors cursor-pointer flex items-center gap-2"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-neutral-400" />
                <span>
                  {viewMode === "calendar"
                    ? `${new Date(`${weekDays[0]}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(`${weekDays[6]}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : formattedDateLabel}
                </span>
              </button>
            </div>

            {/* Right: Specific filters based on view */}
            <div className="flex items-center gap-3">
              {viewMode === "calendar" && (
                <div className="w-56 flex items-center gap-2.5">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase shrink-0">Resource:</span>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger className="w-full h-9 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 outline-none hover:border-neutral-750 transition-colors">
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto w-full">
                      {bookableAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {viewMode === "kanban" && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    {bookableAssets.length} Bookable Resources Today
                  </span>
                </div>
              )}

              {/* Main book trigger */}
              <button
                onClick={() => openBookModal(viewMode === "calendar" ? selectedAssetId : bookableAssets[0]?.id)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold hover:bg-neutral-200 transition-colors select-none cursor-pointer active:scale-[0.96]"
              >
                <Plus className="h-3.5 w-3.5" />
                Book slots
              </button>
            </div>
          </div>

          {/* VIEW: KANBAN COLUMNS */}
          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto pb-4">
              {bookableAssets.map((asset) => {
                const assetBookings = bookingsByAsset[asset.id] || [];
                return (
                  <div
                    key={asset.id}
                    className="flex flex-col bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4.5 min-w-[280px] max-h-[640px] shadow-sm relative group/col"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-850 mb-3.5">
                      <div className="space-y-0.5 pr-2 min-w-0">
                        <h3 className="font-semibold text-sm text-neutral-200 truncate" title={asset.name}>
                          {asset.name}
                        </h3>
                        <p className="text-[10px] font-mono text-neutral-500 truncate uppercase">
                          {asset.assetTag}
                        </p>
                      </div>
                      <button
                        onClick={() => openBookModal(asset.id)}
                        className="h-7 w-7 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-950 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                        title="Book this resource"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Cards Scrollable Body */}
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[140px] max-h-[480px]">
                      {assetBookings.length === 0 ? (
                        <div
                          onClick={() => openBookModal(asset.id)}
                          className="h-28 border border-dashed border-neutral-800 hover:border-neutral-750 hover:bg-neutral-955/20 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-4 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <Clock className="h-4.5 w-4.5 text-neutral-700" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-neutral-550">No bookings today</p>
                            <p className="text-[9px] text-neutral-605">Click to book a slot</p>
                          </div>
                        </div>
                      ) : (
                        assetBookings.map((b) => {
                          const startStr = new Date(b.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const endStr = new Date(b.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <motion.div
                              key={b.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-neutral-955 border border-neutral-850 hover:border-neutral-750 rounded-xl p-3.5 space-y-2.5 relative group shadow-sm transition-all duration-100 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 px-2.5 py-0.5 rounded-full font-semibold border border-blue-500/20 text-blue-400 tracking-wide font-mono w-fit">
                                    <Clock className="h-3 w-3" />
                                    {startStr} - {endStr}
                                  </div>
                                  <p className="text-xs font-semibold text-neutral-250 pt-0.5">
                                    {b.bookedBy?.user?.name || b.bookedBy?.user?.email || "Unknown"}
                                  </p>
                                </div>

                                {canCancel(b) && (
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="h-7 w-7 rounded-md border border-red-500/10 hover:border-red-500/35 hover:bg-red-500/10 flex items-center justify-center text-red-500/60 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 duration-100"
                                    title="Cancel booking"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {b.bookedBy?.department && (
                                <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 pl-0.5 pt-0.5 border-t border-neutral-900/60">
                                  <Building className="h-3 w-3 shrink-0" />
                                  <span>{b.bookedBy.department.name}</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW: WEEKLY CALENDAR SCHEDULE */}
          {viewMode === "calendar" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
              {weekDays.map((day) => {
                const dayBookings = bookingsByDay[day] || [];
                const isSelectedDay = day === selectedDate;
                const formattedDayHeader = new Date(`${day}T00:00:00`);
                const weekdayName = formattedDayHeader.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = formattedDayHeader.getDate();

                return (
                  <div
                    key={day}
                    className={`flex flex-col bg-neutral-900 border rounded-2xl p-3 min-w-[140px] max-h-[580px] shadow-sm relative transition-colors duration-100 ${
                      isSelectedDay
                        ? "border-neutral-700/80 bg-neutral-900/90 shadow-md ring-1 ring-neutral-800"
                        : "border-neutral-800/80"
                    }`}
                  >
                    {/* Day Header */}
                    <div className="pb-2.5 border-b border-neutral-850 mb-3 text-center">
                      <p className={`text-[10px] font-semibold tracking-wider uppercase ${
                        isSelectedDay ? "text-blue-400" : "text-neutral-500"
                      }`}>
                        {weekdayName}
                      </p>
                      <p className={`text-lg font-bold font-mono tracking-tight leading-none mt-1 ${
                        isSelectedDay ? "text-neutral-100" : "text-neutral-300"
                      }`}>
                        {dayNum}
                      </p>
                    </div>

                    {/* Column Bookings List */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-[140px]">
                      {dayBookings.length === 0 ? (
                        <div
                          onClick={() => {
                            setSelectedDate(day);
                            openBookModal(selectedAssetId);
                          }}
                          className="h-20 border border-dashed border-neutral-850 hover:border-neutral-800 hover:bg-neutral-955/20 rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <span className="text-[9px] font-semibold text-neutral-600">Available</span>
                        </div>
                      ) : (
                        dayBookings.map((b) => {
                          const startStr = new Date(b.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const endStr = new Date(b.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <motion.div
                              key={b.id}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-neutral-955 border border-neutral-850 hover:border-neutral-800 rounded-xl p-2.5 space-y-2 relative group shadow-sm transition-all"
                            >
                              <div className="space-y-1">
                                <div className="text-[9px] font-mono text-neutral-400 font-semibold tracking-tight">
                                  {startStr} - {endStr}
                                </div>
                                <p className="text-[10px] font-semibold text-neutral-250 truncate">
                                  {b.bookedBy?.user?.name || b.bookedBy?.user?.email || "Unknown"}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 border-t border-neutral-900 pt-1.5">
                                <span className="text-[8px] text-neutral-500 font-semibold truncate max-w-[70px]">
                                  {b.bookedBy?.department?.name || "No Dept"}
                                </span>

                                {canCancel(b) && (
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="h-5 w-5 rounded-md hover:bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Cancel booking"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Date Picker Bottom Sheet (Premium) */}
      <DatePickerBottomSheet
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        value={selectedDate}
        onValueChange={setSelectedDate}
      />

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && modalAssetId && (
          <BookingModal
            assetId={modalAssetId}
            assetName={bookableAssets.find((a) => a.id === modalAssetId)?.name || "Resource"}
            selectedDate={selectedDate}
            departments={departments || []}
            existingBookings={bookings || []}
            onClose={() => setShowBookingModal(false)}
            onSuccess={() => {
              refetchBookings();
              setShowBookingModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PREMIUM DATE PICKER BOTTOM SHEET
// ──────────────────────────────────────────────────────────────────────────────
function DatePickerBottomSheet({
  open,
  onOpenChange,
  value,
  onValueChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [year, month, day] = useMemo(() => {
    return value.split("-");
  }, [value]);

  const days = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  }, []);

  const months = useMemo(() => {
    return [
      { label: "Jan", value: "01" },
      { label: "Feb", value: "02" },
      { label: "Mar", value: "03" },
      { label: "Apr", value: "04" },
      { label: "May", value: "05" },
      { label: "Jun", value: "06" },
      { label: "Jul", value: "07" },
      { label: "Aug", value: "08" },
      { label: "Sep", value: "09" },
      { label: "Oct", value: "10" },
      { label: "Nov", value: "11" },
      { label: "Dec", value: "12" },
    ];
  }, []);

  const years = useMemo(() => {
    return ["2026", "2027", "2028"];
  }, []);

  const handleDateChange = (newDay: string, newMonth: string, newYear: string) => {
    onValueChange(`${newYear}-${newMonth}-${newDay}`);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Select Booking Date"
      className="bg-neutral-900 border-neutral-800 max-w-md"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="flex gap-4 w-full justify-center">
          {/* Day Picker */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Day</span>
            <WheelPicker
              options={days}
              value={day}
              onValueChange={(val) => handleDateChange(val, month, year)}
              className="w-full bg-neutral-950 border-neutral-850"
            />
          </div>

          {/* Month Picker */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Month</span>
            <WheelPicker
              options={months}
              value={month}
              onValueChange={(val) => handleDateChange(day, val, year)}
              className="w-full bg-neutral-950 border-neutral-850"
            />
          </div>

          {/* Year Picker */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Year</span>
            <WheelPicker
              options={years}
              value={year}
              onValueChange={(val) => handleDateChange(day, month, val)}
              className="w-full bg-neutral-950 border-neutral-850"
            />
          </div>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full h-11 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-bold hover:bg-neutral-200 transition-colors select-none cursor-pointer"
        >
          Confirm Date
        </button>
      </div>
    </BottomSheet>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// BOOKING MODAL (WITH REAL-TIME CONFLICT BANNERS)
// ──────────────────────────────────────────────────────────────────────────────
function BookingModal({
  assetId,
  assetName,
  selectedDate,
  departments,
  existingBookings,
  onClose,
  onSuccess,
}: {
  assetId: string;
  assetName: string;
  selectedDate: string;
  departments: any[];
  existingBookings: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createBookingMutation = useMutation(orpc.booking.create.mutationOptions());
  const [loading, setLoading] = useState(false);

  // Form states
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("10:00");
  const [selectedDeptId, setSelectedDeptId] = useState("");

  // Real-time conflict/overlap validation check
  const conflictDetails = useMemo(() => {
    const start = new Date(`${selectedDate}T${startHour}:00`);
    const end = new Date(`${selectedDate}T${endHour}:00`);

    const overlappingBooking = existingBookings?.find((b) => {
      // Must match same asset
      if (b.assetId !== assetId) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < end && bEnd > start;
    });

    return overlappingBooking || null;
  }, [startHour, endHour, selectedDate, existingBookings, assetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictDetails) return; // Prevent double-submitting conflict slots

    const startTimeISO = new Date(`${selectedDate}T${startHour}:00`).toISOString();
    const endTimeISO = new Date(`${selectedDate}T${endHour}:00`).toISOString();

    setLoading(true);
    try {
      await createBookingMutation.mutateAsync({
        assetId,
        startTime: startTimeISO,
        endTime: endTimeISO,
        departmentId: selectedDeptId || null,
      });
      toast.success("Resource booked successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Conflict: Slot overlaps with another active booking.");
    } finally {
      setLoading(false);
    }
  };

  const timeOptions = useMemo(() => {
    const opts = [];
    for (let h = 8; h <= 18; h++) {
      const hourStr = String(h).padStart(2, "0");
      opts.push(`${hourStr}:00`);
      opts.push(`${hourStr}:30`);
    }
    return opts;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 270, damping: 28 }}
        className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-805 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <CalendarIcon className="h-4.5 w-4.5 text-neutral-400" />
            Book a slot
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-850 hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Real-time conflict feedback warning block */}
          {conflictDetails ? (
            <div className="bg-red-500/10 border border-dashed border-red-500/30 p-3.5 rounded-2xl flex items-start gap-2.5 text-red-400">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider">Schedule Conflict</p>
                <p className="text-xs">
                  Requested {startHour} to {endHour} - conflict - slot is unavailable.
                </p>
                <p className="text-[10px] text-red-400/80">
                  Booked by {conflictDetails.bookedBy?.user?.name || "another team member"}.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-2xl flex items-start gap-2.5">
              <Info className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-neutral-450 uppercase tracking-wider">Resource info</p>
                <p className="text-xs text-neutral-300">
                  Booking <span className="font-semibold text-neutral-200">{assetName}</span> on{" "}
                  <span className="font-medium text-neutral-200">{selectedDate}</span>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Start Time *
              </label>
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none cursor-pointer">
                  <SelectValue placeholder="Start Time" />
                </SelectTrigger>
                <SelectContent className="max-h-52 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Time */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                End Time *
              </label>
              <Select value={endHour} onValueChange={setEndHour}>
                <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 outline-none cursor-pointer">
                  <SelectValue placeholder="End Time" />
                </SelectTrigger>
                <SelectContent className="max-h-52 overflow-y-auto">
                  {timeOptions
                    .filter((opt) => opt > startHour)
                    .map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department Choice */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
              Booking Department (Optional)
            </label>
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-full h-10 px-2.5 rounded-xl bg-neutral-955 border border-neutral-800 text-sm text-neutral-350 outline-none hover:border-neutral-750 transition-colors">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent className="max-h-52 overflow-y-auto">
                <SelectItem value="">Select Department</SelectItem>
                {departments
                  ?.filter((d) => d.isActive)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2.5 border-t border-neutral-850">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-neutral-800 hover:border-neutral-750 text-sm text-neutral-450 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!conflictDetails}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <Loader variant="spinner" size={16} />}
              Confirm Booking
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
