import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, Users, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { BottomSheet } from "@odoo-hackathon-2026/ui/components/motion/bottom-sheet";
import { WheelPicker } from "@odoo-hackathon-2026/ui/components/motion/wheel-picker";
import { Select } from "@odoo-hackathon-2026/ui/components/motion/select";
import { Button } from "@odoo-hackathon-2026/ui/components/button";
import { Checkbox } from "@odoo-hackathon-2026/ui/components/checkbox";
import { Card } from "@odoo-hackathon-2026/ui/components/card";
import { Separator } from "@odoo-hackathon-2026/ui/components/separator";
import { Input } from "@odoo-hackathon-2026/ui/components/input";
import { Label } from "@odoo-hackathon-2026/ui/components/label";

type MeetingType = "INDIVIDUAL" | "TEAM_MEETING" | "WORKSHOP" | "TRAINING" | "ONE_ON_ONE";

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "TEAM_MEETING", label: "Team Meeting" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "TRAINING", label: "Training" },
  { value: "ONE_ON_ONE", label: "1:1" },
];

interface BookingCalendarProps {
  assetId: string;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingCalendar({
  assetId,
  assetName,
  isOpen,
  onClose,
  onSuccess,
}: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [notes, setNotes] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Queries
  const { data: bookings, refetch: refetchBookings } = useQuery(
    orpc.booking.list.queryOptions({
      assetId,
      startDate: new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString(),
    })
  );

  const createBookingMutation = useMutation(orpc.booking.create.mutationOptions());

  // Time options (15-minute increments)
  const timeOptions = useMemo(() => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        times.push(time);
      }
    }
    return times;
  }, []);

  // Calculate conflicts
  const checkConflicts = (newStart: string, newEnd: string) => {
    const [startHour, startMinute] = newStart.split(":").map(Number);
    const [endHour, endMinute] = newEnd.split(":").map(Number);

    const newStartDateTime = new Date(selectedDate);
    newStartDateTime.setHours(startHour, startMinute, 0, 0);

    const newEndDateTime = new Date(selectedDate);
    newEndDateTime.setHours(endHour, endMinute, 0, 0);

    const conflicts = bookings?.filter((booking) => {
      if (booking.status === "CANCELLED") return false;

      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Check for overlap
      return (
        newStartDateTime < bookingEnd && newEndDateTime > bookingStart
      );
    });

    setConflicts(conflicts || []);
    return conflicts?.length || 0;
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    checkConflicts(value, endTime);
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    checkConflicts(startTime, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (conflicts.length > 0) {
      toast.error(`Cannot book: ${conflicts.length} slot(s) already booked`);
      return;
    }

    if (!meetingType) {
      toast.error("Please select a meeting type");
      return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    try {
      await createBookingMutation.mutateAsync({
        assetId,
        startTime: new Date(selectedDate.setHours(startHour, startMinute, 0, 0)).toISOString(),
        endTime: new Date(selectedDate.setHours(endHour, endMinute, 0, 0)).toISOString(),
        meetingType,
        notes,
      });
      toast.success("Booking created successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    }
  };

  // Generate time slots for display
  const timeSlots = useMemo(() => {
    const slots: { time: string; isBooked: boolean }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push({ time, isBooked: false });
      }
    }
    return slots;
  }, []);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-neutral-800 p-2 rounded-xl">
              <Calendar className="h-5 w-5 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">Book Asset</h2>
              <p className="text-sm text-neutral-500">{assetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Selection */}
          <div>
            <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
              Date
            </Label>
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-neutral-200">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                Start Time
              </Label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <WheelPicker
                  options={timeOptions}
                  value={startTime}
                  onValueChange={handleStartTimeChange}
                  itemHeight={48}
                  visibleCount={5}
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                End Time
              </Label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <WheelPicker
                  options={timeOptions}
                  value={endTime}
                  onValueChange={handleEndTimeChange}
                  itemHeight={48}
                  visibleCount={5}
                />
              </div>
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
              Meeting Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setMeetingType(type.value)}
                  className={`h-10 px-3 rounded-xl text-sm font-medium transition-all ${
                    meetingType === type.value
                      ? "bg-blue-500 text-white border border-blue-500"
                      : "bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Warning */}
          <AnimatePresence>
            {conflicts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
              >
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    {conflicts.length} conflict(s) detected
                  </p>
                  <p className="text-xs text-red-300/80">
                    {conflicts.map((c, i) => (
                      <span key={i}>
                        {new Date(c.startTime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        -{" "}
                        {new Date(c.endTime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    ))}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes */}
          <div>
            <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
              Notes (Optional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this booking..."
              className="bg-neutral-950 border-neutral-800 text-neutral-200 placeholder:text-neutral-600"
            />
          </div>

          {/* Booked Slots Preview */}
          {bookings && bookings.length > 0 && (
            <div>
              <Label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                Booked Slots
              </Label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-400">
                      {new Date(booking.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(booking.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-xs text-neutral-600 capitalize">
                      {booking.status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={conflicts.length > 0 || !meetingType}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Clock className="h-4 w-4 mr-2" />
              Book Slot
            </Button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}
