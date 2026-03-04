import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, getToken } from "../../services/api";
import { CALENDAR, DREAMS, USERS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard } from "../../components/shared/Skeleton";
import ErrorState from "../../components/shared/ErrorState";
import BottomNav from "../../components/shared/BottomNav";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock,
  Target, CheckCircle, Circle, X, Check, Calendar,
  Zap, MoreVertical, Edit3, Trash2, LayoutGrid, Link,
  List, Columns, Sparkles, Move, ChevronDown, ChevronUp,
  AlertTriangle, Flame, Repeat, SkipForward, Copy, Shield,
  CloudOff, RefreshCw, Cloud, Loader2, AlertCircle, Rocket, CalendarClock, Brain,
  Search, Bell, Settings, Upload, Share2,
  Users, Flag, Heart, Activity, BookOpen, Star, Filter, Tag,
  Printer, Download, FileText, FileSpreadsheet,
  Globe, Plane
} from "lucide-react";
import { BRAND, GRADIENTS, adaptColor, DREAM_PALETTE } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import SmartScheduler from "../../components/shared/SmartScheduler";
import MiniCalendar from "../../components/shared/MiniCalendar";
import CalendarHeatmap from "../../components/shared/CalendarHeatmap";
import FocusModeWidget from "../../components/shared/FocusModeWidget";
import ScheduleScoreWidget from "../../components/shared/ScheduleScoreWidget";
import CalendarSearchOverlay from "../../components/shared/CalendarSearchOverlay";
import EnergyProfileModal from "../../components/shared/EnergyProfileModal";
import TodayWidget from "../../components/shared/TodayWidget";
import useDragReschedule from "../../hooks/useDragReschedule";
import useDreamColorMap from "../../hooks/useDreamColorMap";
import ShareCalendarModal from "../../components/shared/ShareCalendarModal";
import EventAlertPopup from "../../components/shared/EventAlertPopup";
import HabitTrackerPanel from "../../components/shared/HabitTrackerPanel";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Calendar Screen v2
 * Month grid, Week time-grid, Agenda list, event dots, add event modal
 * ═══════════════════════════════════════════════════════════════════ */

const NOW=new Date();const TODAY={y:NOW.getFullYear(),m:NOW.getMonth(),d:NOW.getDate()};
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS=[];for(var _h=6;_h<=23;_h++)HOURS.push(_h);
const VIEW_MODES=[{key:"month",label:"Month"},{key:"week",label:"Week"},{key:"agenda",label:"Agenda"},{key:"heatmap",label:"Heatmap"}];

var TYPE_COLORS = { task: BRAND.green, event: BRAND.purpleLight, reminder: BRAND.yellow, deadline: BRAND.red };var COMMON_TIMEZONES=[{value:"Pacific/Honolulu",label:"Honolulu (HST)"},{value:"America/Anchorage",label:"Anchorage (AKST)"},{value:"America/Los_Angeles",label:"Los Angeles (PST)"},{value:"America/Denver",label:"Denver (MST)"},{value:"America/Chicago",label:"Chicago (CST)"},{value:"America/New_York",label:"New York (EST)"},{value:"America/Toronto",label:"Toronto (EST)"},{value:"America/Sao_Paulo",label:"Sao Paulo (BRT)"},{value:"America/Argentina/Buenos_Aires",label:"Buenos Aires (ART)"},{value:"America/Mexico_City",label:"Mexico City (CST)"},{value:"Atlantic/Reykjavik",label:"Reykjavik (GMT)"},{value:"Europe/London",label:"London (GMT)"},{value:"Europe/Paris",label:"Paris (CET)"},{value:"Europe/Berlin",label:"Berlin (CET)"},{value:"Europe/Madrid",label:"Madrid (CET)"},{value:"Europe/Rome",label:"Rome (CET)"},{value:"Europe/Amsterdam",label:"Amsterdam (CET)"},{value:"Europe/Zurich",label:"Zurich (CET)"},{value:"Europe/Moscow",label:"Moscow (MSK)"},{value:"Europe/Istanbul",label:"Istanbul (TRT)"},{value:"Africa/Cairo",label:"Cairo (EET)"},{value:"Asia/Dubai",label:"Dubai (GST)"},{value:"Asia/Kolkata",label:"Kolkata (IST)"},{value:"Asia/Bangkok",label:"Bangkok (ICT)"},{value:"Asia/Singapore",label:"Singapore (SGT)"},{value:"Asia/Shanghai",label:"Shanghai (CST)"},{value:"Asia/Hong_Kong",label:"Hong Kong (HKT)"},{value:"Asia/Tokyo",label:"Tokyo (JST)"},{value:"Asia/Seoul",label:"Seoul (KST)"},{value:"Australia/Sydney",label:"Sydney (AEST)"},{value:"Pacific/Auckland",label:"Auckland (NZST)"}];function formatTimeInTz(isoStr,tz){if(!isoStr)return"";try{var d=new Date(isoStr);if(isNaN(d.getTime()))return"";return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:tz}).format(d)}catch(e){return""}}function getTzAbbr(tz){try{var parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,timeZoneName:"short"}).formatToParts(new Date());var found=parts.find(function(p){return p.type==="timeZoneName"});return found?found.value:tz}catch(e){return tz}}

var CATEGORY_CONFIG = {
  meeting:   { key: "meeting",   label: "Meeting",   icon: Users,         color: "#3B82F6" },
  deadline:  { key: "deadline",  label: "Deadline",   icon: AlertTriangle, color: "#EF4444" },
  milestone: { key: "milestone", label: "Milestone",  icon: Flag,          color: "#F59E0B" },
  habit:     { key: "habit",     label: "Habit",       icon: Repeat,        color: "#10B981" },
  social:    { key: "social",    label: "Social",      icon: Heart,         color: "#EC4899" },
  health:    { key: "health",    label: "Health",      icon: Activity,      color: "#14B8A6" },
  learning:  { key: "learning",  label: "Learning",    icon: BookOpen,      color: "#8B5CF6" },
  custom:    { key: "custom",    label: "Custom",      icon: Star,          color: "#6366F1" },
};
var CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG);

function getKey(y,m,d){return `${y}-${m}-${d}`;}
function getDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function getFirstDow(y,m){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}

// ── Week helpers ──
function getMonday(date){var d=new Date(date);var day=d.getDay();var diff=d.getDate()-day+(day===0?-6:1);d.setDate(diff);d.setHours(0,0,0,0);return d;}
function addDays(date,n){var d=new Date(date);d.setDate(d.getDate()+n);return d;}
function formatDateISO(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function formatHour(h){if(h===0)return "12 AM";if(h<12)return h+" AM";if(h===12)return "12 PM";return (h-12)+" PM";}
function parseTime24(timeStr){if(!timeStr)return null;var parts=timeStr.split(":");if(parts.length<2)return null;return{h:parseInt(parts[0],10),m:parseInt(parts[1],10)};}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

export default function CalendarScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const[mounted,setMounted]=useState(false);
  const[viewMode,setViewMode]=useState("month");
  const[viewY,setViewY]=useState(TODAY.y);
  const[viewM,setViewM]=useState(TODAY.m);
  const[selDay,setSelDay]=useState(null);
  const[addEvt,setAddEvt]=useState(false);
  const[newTitle,setNewTitle]=useState("");
  const[newTime,setNewTime]=useState("9:00 AM");
  const[newEndDate,setNewEndDate]=useState("");
  const[newAllDay,setNewAllDay]=useState(false);
  const[confirmDel,setConfirmDel]=useState(null);
  // Smart scheduler modal
  const[smartOpen,setSmartOpen]=useState(false);
  // Week view state
  const[weekStart,setWeekStart]=useState(function(){return getMonday(new Date());});
  // Agenda view state
  const[agendaPage,setAgendaPage]=useState(1);
  const[agendaItems,setAgendaItems]=useState([]);
  const[agendaSelDate,setAgendaSelDate]=useState(function(){return new Date();});
  // Legend toggle state
  const[legendOpen,setLegendOpen]=useState(false);
  // Focus mode state
  var [quickFocusOpen, setQuickFocusOpen] = useState(false);
  // Search overlay state
  var [searchOpen, setSearchOpen] = useState(false);
  // Share calendar modal state
  var [shareOpen, setShareOpen] = useState(false);
  // Print/Export modal state
  var [exportOpen, setExportOpen] = useState(false);
  var [exportLoading, setExportLoading] = useState(null); // "csv" | "ical" | "json" | null
  // Category state (for new/edit event)
  var [newCategory, setNewCategory] = useState("custom");
  // Category filter state (multi-select; empty = show all)
  var [categoryFilters, setCategoryFilters] = useState([]);
  var [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  // Conflict detection state
  var [conflictWarning, setConflictWarning] = useState(null); // { conflicts: [], pendingBody: {}, mode: 'create'|'reschedule', rescheduleInfo: null }
  var [conflictChecking, setConflictChecking] = useState(false);
  // Recurrence exception state
  var [recurringChoice, setRecurringChoice] = useState(null); // { evt, key, action: 'delete'|'edit' }
  var [editOccurrence, setEditOccurrence] = useState(null); // { evt, key, occDate }
  var [editOccTitle, setEditOccTitle] = useState("");
  var [editOccTime, setEditOccTime] = useState("");
  var [editOccEndTime, setEditOccEndTime] = useState("");
  // Recurrence rule builder state
  var [recEnabled, setRecEnabled] = useState(false);
  var [recFrequency, setRecFrequency] = useState("weekly");
  var [recInterval, setRecInterval] = useState(1);
  var [recDaysOfWeek, setRecDaysOfWeek] = useState([]);
  var [recDayOfMonth, setRecDayOfMonth] = useState(1);
  var [recMonthlyMode, setRecMonthlyMode] = useState("dayOfMonth"); // "dayOfMonth" | "nthWeekday"
  var [recWeekOfMonth, setRecWeekOfMonth] = useState(1);
  var [recDayOfWeek, setRecDayOfWeek] = useState(0);
  var [recEndMode, setRecEndMode] = useState("never"); // "never" | "on_date" | "after_count"
  var [recEndDate, setRecEndDate] = useState("");
  var [recEndAfterCount, setRecEndAfterCount] = useState(10);
  var [recWeekdaysOnly, setRecWeekdaysOnly] = useState(false);
  // Reminder picker state
  var [eventReminders, setEventReminders] = useState([{minutes_before: 15, type: "push"}]);
  var [customReminderOpen, setCustomReminderOpen] = useState(false);
  var [customReminderValue, setCustomReminderValue] = useState(30);
  var [customReminderUnit, setCustomReminderUnit] = useState("min"); // "min" | "hr" | "day"

  // Batch scheduler modal state
  var [batchOpen, setBatchOpen] = useState(false);
  var [batchSelected, setBatchSelected] = useState({});
  var [batchDates, setBatchDates] = useState({});
  var [batchTimes, setBatchTimes] = useState({});
  var [batchSuccess, setBatchSuccess] = useState(null);

  // Overdue banner & rescue modal state
  var [overdueExpanded, setOverdueExpanded] = useState(false);
  var [rescueOpen, setRescueOpen] = useState(false);
  var [rescueStrategy, setRescueStrategy] = useState("today");
  var [rescueSuccess, setRescueSuccess] = useState(false);

  // iCal import state
  var icalFileRef = useRef(null);
  var [icalImporting, setIcalImporting] = useState(false);
  var [icalResult, setIcalResult] = useState(null);

  // Daily summary state
  var [summaryExpanded, setSummaryExpanded] = useState(false);
  // Free slots visualization state
  var [showFreeSlots, setShowFreeSlots] = useState(false);
  var [findFreeOpen, setFindFreeOpen] = useState(false);
  var [findFreeDuration, setFindFreeDuration] = useState(30);
  var [freeSlotsHover, setFreeSlotsHover] = useState(null);

  // Buffer time preferences state
  var [bufferPrefsOpen, setBufferPrefsOpen] = useState(false);
  var [bufferMinutes, setBufferMinutes] = useState(15);
  var [minEventDuration, setMinEventDuration] = useState(30);

  // Energy profile state
  var [energyModalOpen, setEnergyModalOpen] = useState(false);

  // Habit tracker state
  var [habitPanelOpen, setHabitPanelOpen] = useState(false);

  // Travel mode / timezone state
  var [travelMode, setTravelMode] = useState(false);
  var [travelTz, setTravelTz] = useState("");
  var [newEventTz, setNewEventTz] = useState("");

  // ── Fetch energy profile for week view tinting ──
  var energyProfileQuery = useQuery({
    queryKey: ["energy-profile"],
    queryFn: function () { return apiGet(USERS.ENERGY_PROFILE); },
    staleTime: 5 * 60 * 1000,
  });
  var energyProfile = (energyProfileQuery.data && energyProfileQuery.data.energy_profile) || null;

  var energyPeakHours = useMemo(function () {
    var s = {};
    if (!energyProfile || !energyProfile.peak_hours) return s;
    energyProfile.peak_hours.forEach(function (r) {
      for (var h = r.start; h < r.end; h++) s[h] = true;
    });
    return s;
  }, [energyProfile]);

  var energyLowHours = useMemo(function () {
    var s = {};
    if (!energyProfile || !energyProfile.low_energy_hours) return s;
    energyProfile.low_energy_hours.forEach(function (r) {
      for (var h = r.start; h < r.end; h++) s[h] = true;
    });
    return s;
  }, [energyProfile]);

  var hasEnergyProfile = Object.keys(energyPeakHours).length > 0 || Object.keys(energyLowHours).length > 0;

  // ── Fetch user timezone ──
  var userTzQuery = useQuery({
    queryKey: ["user-timezone"],
    queryFn: function () { return apiGet(CALENDAR.TIMEZONE); },
    staleTime: 10 * 60 * 1000,
  });
  var userHomeTz = (userTzQuery.data && userTzQuery.data.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  var displayTz = travelMode && travelTz ? travelTz : userHomeTz;

  var updateTzMut = useMutation({
    mutationFn: function (tz) { return apiPut(CALENDAR.TIMEZONE, { timezone: tz }); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["user-timezone"] });
      showToast("Home timezone updated", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to update timezone", "error");
    },
  });

  // ── Fetch user's dreams for color mapping ──
  var dreamsQuery = useQuery({
    queryKey: ["dreams-list"],
    queryFn: function () { return apiGet(DREAMS.LIST); },
    staleTime: 5 * 60 * 1000,
  });

  var dreamsList = useMemo(function () {
    var raw = (dreamsQuery.data && dreamsQuery.data.results) || dreamsQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [dreamsQuery.data]);

  // ── Dream color map: dreamId → { dark, light } ──
  var dreamColorMap = useDreamColorMap(dreamsList);

  // ── Fetch daily summary ──
  var dailySummaryQuery = useQuery({
    queryKey: ["daily-summary"],
    queryFn: function () { return apiGet(CALENDAR.DAILY_SUMMARY); },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  var dailySummary = dailySummaryQuery.data || null;

  // ── Fetch habit calendar data for month view dots ──
  var habitCalQuery = useQuery({
    queryKey: ["habit-calendar-data", viewY, viewM + 1],
    queryFn: function () { return apiGet(CALENDAR.HABITS.CALENDAR_DATA + "?year=" + viewY + "&month=" + (viewM + 1)); },
    staleTime: 60 * 1000,
  });
  var habitCompletions = (habitCalQuery.data && habitCalQuery.data.completions) || {};
  var habitsList = useMemo(function () {
    var raw = habitCalQuery.data && habitCalQuery.data.habits;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [];
  }, [habitCalQuery.data]);

  // ── Fetch calendar preferences (buffer time) ──
  var calPrefsQuery = useQuery({
    queryKey: ["calendar-preferences"],
    queryFn: function () { return apiGet(CALENDAR.PREFERENCES); },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  useEffect(function () {
    if (calPrefsQuery.data) {
      setBufferMinutes(calPrefsQuery.data.buffer_minutes != null ? calPrefsQuery.data.buffer_minutes : 15);
      setMinEventDuration(calPrefsQuery.data.min_event_duration != null ? calPrefsQuery.data.min_event_duration : 30);
    }
  }, [calPrefsQuery.data]);

  var saveCalPrefsMut = useMutation({
    mutationFn: function (prefs) { return apiPost(CALENDAR.PREFERENCES, prefs); },
    onSuccess: function (data) {
      setBufferMinutes(data.buffer_minutes);
      setMinEventDuration(data.min_event_duration);
      queryClient.invalidateQueries({ queryKey: ["calendar-preferences"] });
      showToast("Calendar preferences saved", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to save preferences", "error");
    },
  });

  // Helper: resolve dream color for a given dreamId
  function getDreamColor(dreamId) {
    if (!dreamId) return null;
    var entry = dreamColorMap[dreamId];
    if (!entry) return null;
    return isLight ? entry.light : entry.dark;
  }

  // Build date range for current view month
  var startDate = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-01";
  var endDay = getDaysInMonth(viewY, viewM);
  var endDate = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(endDay).padStart(2, "0");

  // ── Normalize backend task → calendar item ──
  function normalizeTask(t) {
    var taskDreamId = t.dreamId || "";
    var dreamCol = getDreamColor(taskDreamId);
    return {
      id: t.taskId || t.id,
      title: t.taskTitle || t.title || "",
      date: t.scheduledDate || t.date || "",
      time: t.scheduledTime || t.time || "",
      done: t.status === "completed" || t.done || t.completed || false,
      type: "task",
      color: dreamCol || TYPE_COLORS.task,
      dream: t.dreamTitle || t.dream || "",
      dreamId: taskDreamId,
      isTask: true,
      isDeadline: false,
      isChain: t.isChain || false,
      chainPosition: t.chainPosition || null,
      chainNextDelayDays: t.chainNextDelayDays != null ? t.chainNextDelayDays : null,
    };
  }

  // ── Normalize CalendarEvent → calendar item (with multi-day support) ──
  function normalizeEvent(e) {
    var start = e.startTime || e.start_time || e.start || "";
    var end = e.endTime || e.end_time || e.end || "";
    var dateStr = start ? start.split("T")[0] : "";
    var timeStr = start && start.includes("T") ? start.split("T")[1].substring(0, 5) : "";
    var endDateStr = end ? end.split("T")[0] : dateStr;
    var isMultiDay = e.is_multi_day || e.isMultiDay || (dateStr && endDateStr && dateStr !== endDateStr) || false;
    var spanDays = e.duration_days || e.durationDays || 1;
    if (isMultiDay && spanDays <= 1) {
      var sd = new Date(dateStr);
      var ed = new Date(endDateStr);
      if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
        spanDays = Math.round((ed - sd) / 86400000) + 1;
      }
    }
    var allDay = e.all_day || e.allDay || false;
    var evtDreamId = e.dreamId || "";
    var dreamCol = getDreamColor(evtDreamId);
    var evtCategory = e.category || "custom";
    var catCfg = CATEGORY_CONFIG[evtCategory] || CATEGORY_CONFIG.custom;
    return {
      id: e.id,
      title: e.title || "",
      date: dateStr,
      time: allDay ? "" : timeStr,
      done: e.status === "completed" || e.completed || false,
      type: "event",
      color: dreamCol || catCfg.color || TYPE_COLORS.event,
      category: evtCategory,
      dream: e.dreamTitle || e.taskTitle || "",
      dreamId: evtDreamId,
      isTask: false,
      isDeadline: false,
      isMultiDay: isMultiDay,
      allDay: allDay,
      startDate: dateStr,
      endDate: endDateStr,
      spanDays: spanDays,
      isRecurring: e.is_recurring || e.isRecurring || false,
      parentEventId: e.parent_event || e.parentEvent || null,
      rawStartTime: start,
      rawEndTime: end,
      recurrenceExceptions: e.recurrence_exceptions || e.recurrenceExceptions || [],
      recurrenceRule: e.recurrence_rule || e.recurrenceRule || null,
      syncStatus: e.sync_status || e.syncStatus || "local",
      lastSyncError: e.last_sync_error || e.lastSyncError || "",
      reminders: e.reminders || [],
      reminderMinutesBefore: e.reminder_minutes_before || e.reminderMinutesBefore || 0,
      eventTimezone: e.event_timezone || e.eventTimezone || "",
      displayTimezone: e.display_timezone || e.displayTimezone || "",
    };
  }

  // ── Helper: format reminder minutes to short label ──
  function formatReminderLabel(minutes) {
    if (minutes === 0) return "At start";
    if (minutes < 60) return minutes + "m";
    if (minutes < 1440) return Math.floor(minutes / 60) + "h";
    return Math.floor(minutes / 1440) + "d";
  }

  // ── Helper: get best reminder label for event card display ──
  function getEventReminderLabel(evt) {
    var list = evt.reminders;
    if (list && list.length > 0) {
      var sorted = list.slice().sort(function(a, b) { return a.minutes_before - b.minutes_before; });
      var label = formatReminderLabel(sorted[0].minutes_before);
      if (sorted.length > 1) label += " +" + (sorted.length - 1);
      return label;
    }
    if (evt.reminderMinutesBefore && evt.reminderMinutesBefore > 0) {
      return formatReminderLabel(evt.reminderMinutesBefore);
    }
    return null;
  }

  // ── Monthly tasks query (from dreams system) ──
  var tasksQuery = useQuery({
    queryKey: ["calendar-tasks", startDate, endDate],
    queryFn: function () { return apiGet(CALENDAR.VIEW + "?start=" + startDate + "&end=" + endDate); },
  });

  // ── Monthly calendar events query (CalendarEvent model) ──
  var eventsQuery = useQuery({
    queryKey: ["calendar-events", startDate, endDate],
    queryFn: function () { return apiGet(CALENDAR.EVENTS + "?start_time__gte=" + startDate + "&start_time__lte=" + endDate + "T23:59:59"); },
  });

  // ── Today's tasks query ──
  var todayQuery = useQuery({
    queryKey: ["calendar-today"],
    queryFn: function () { return apiGet(CALENDAR.TODAY); },
  });

  // ── Overdue tasks query ──
  var overdueQuery = useQuery({
    queryKey: ["calendar-overdue"],
    queryFn: function () { return apiGet(CALENDAR.OVERDUE); },
    staleTime: 2 * 60 * 1000,
  });

  var overdueData = overdueQuery.data || {};
  var overdueTasks = overdueData.tasks || [];
  var overdueCount = overdueData.count || 0;

  // ── Rescue mutation ──
  var rescueMut = useMutation({
    mutationFn: function (params) {
      return apiPost(CALENDAR.RESCUE, params);
    },
    onSuccess: function (data) {
      setRescueSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["calendar-overdue"] });
      invalidateCalendar();
      showToast("Rescued " + (data.rescued_count || 0) + " tasks!", "success");
      setTimeout(function () {
        setRescueSuccess(false);
        setRescueOpen(false);
      }, 1800);
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to rescue tasks", "error");
    },
  });

  // ── Batch schedule: fetch unscheduled tasks ──
  var batchTasksQuery = useQuery({
    queryKey: ["batch-unscheduled-tasks"],
    queryFn: function () { return apiGet(DREAMS.TASKS.LIST + "?status=pending"); },
    enabled: batchOpen,
  });

  var batchRawTasks = (batchTasksQuery.data && batchTasksQuery.data.results) || batchTasksQuery.data || [];
  var batchUnscheduledTasks = Array.isArray(batchRawTasks)
    ? batchRawTasks.filter(function (t) { return !t.scheduledDate && !t.scheduledTime; })
    : [];

  // ── Batch schedule mutation ──
  var batchScheduleMut = useMutation({
    mutationFn: function (payload) {
      return apiPost(CALENDAR.BATCH_SCHEDULE, payload);
    },
    onSuccess: function (data) {
      var count = (data && data.count) || 0;
      setBatchSuccess(count);
      invalidateCalendar();
      queryClient.invalidateQueries({ queryKey: ["batch-unscheduled-tasks"] });
      setTimeout(function () {
        setBatchSuccess(null);
        setBatchOpen(false);
        setBatchSelected({});
        setBatchDates({});
        setBatchTimes({});
      }, 2000);
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Batch scheduling failed", "error");
    },
  });

  function batchToggleSelect(id) {
    setBatchSelected(function (prev) {
      var next = Object.assign({}, prev);
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      return next;
    });
  }

  function batchSelectAll() {
    var all = {};
    batchUnscheduledTasks.forEach(function (t) { all[t.id] = true; });
    setBatchSelected(all);
  }

  function batchSetDate(id, val) {
    setBatchDates(function (prev) {
      var next = Object.assign({}, prev);
      next[id] = val;
      return next;
    });
  }

  function batchSetTime(id, val) {
    setBatchTimes(function (prev) {
      var next = Object.assign({}, prev);
      next[id] = val;
      return next;
    });
  }

  function handleBatchScheduleAll() {
    var ids = Object.keys(batchSelected);
    if (ids.length === 0) {
      showToast("Select at least one task", "info");
      return;
    }
    var tasks = [];
    var missing = false;
    ids.forEach(function (id) {
      var d = batchDates[id];
      var t = batchTimes[id];
      if (!d || !t) { missing = true; return; }
      tasks.push({ task_id: id, date: d, time: t });
    });
    if (missing) {
      showToast("Set date and time for all selected tasks", "info");
      return;
    }
    batchScheduleMut.mutate({ tasks: tasks, create_events: true });
  }

  var batchSelectedCount = Object.keys(batchSelected).length;

  // ── Week view date range ──
  var weekEnd = addDays(weekStart, 6);
  var weekStartStr = formatDateISO(weekStart);
  var weekEndStr = formatDateISO(weekEnd);

  var weekTasksQuery = useQuery({
    queryKey: ["calendar-week-tasks", weekStartStr, weekEndStr],
    queryFn: function () { return apiGet(CALENDAR.VIEW + "?start=" + weekStartStr + "&end=" + weekEndStr); },
    enabled: viewMode === "week",
  });
  var weekEventsQuery = useQuery({
    queryKey: ["calendar-week-events", weekStartStr, weekEndStr],
    queryFn: function () { return apiGet(CALENDAR.EVENTS + "?start_time__gte=" + weekStartStr + "&start_time__lte=" + weekEndStr + "T23:59:59"); },
    enabled: viewMode === "week",
  });

  // ── Focus block events for the week ──
  var focusBlocksQuery = useQuery({
    queryKey: ["focus-block-events"],
    queryFn: function () { return apiGet(CALENDAR.FOCUS_BLOCK_EVENTS); },
    staleTime: 60000,
  });
  var focusBlocks = (focusBlocksQuery.data && focusBlocksQuery.data.focus_blocks) || [];

  // ── Free slots queries ──
  var freeSlotsQuery = useQuery({ queryKey: ["free-slots-week", weekStartStr, weekEndStr, findFreeDuration], queryFn: function () { var promises = []; for (var di = 0; di < 7; di++) { var dd = addDays(weekStart, di); var ds = formatDateISO(dd); promises.push(apiGet(CALENDAR.SUGGEST_TIME_SLOTS + "?date=" + ds + "&duration_mins=" + findFreeDuration).then(function (r) { return r; }).catch(function () { return null; })); } return Promise.all(promises); }, enabled: (viewMode === "week" && showFreeSlots) || findFreeOpen, staleTime: 120000 });
  var freeSlotsMap = useMemo(function () { var m = {}; (freeSlotsQuery.data || []).forEach(function (e) { if (e && e.date) m[e.date] = e; }); return m; }, [freeSlotsQuery.data]);
  var findFreeQuery = useQuery({ queryKey: ["find-free-time", findFreeDuration], queryFn: function () { var promises = []; for (var di = 0; di < 7; di++) { var dd = addDays(new Date(), di); var ds = formatDateISO(dd); promises.push(apiGet(CALENDAR.SUGGEST_TIME_SLOTS + "?date=" + ds + "&duration_mins=" + findFreeDuration).then(function (r) { return r; }).catch(function () { return null; })); } return Promise.all(promises); }, enabled: findFreeOpen, staleTime: 120000 });
  var monthFreeSlotsQuery = useQuery({ queryKey: ["free-slots-month", startDate, endDate], queryFn: function () { var promises = []; var nd = getDaysInMonth(viewY, viewM); for (var di = 1; di <= nd; di++) { var ds = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(di).padStart(2, "0"); promises.push(apiGet(CALENDAR.SUGGEST_TIME_SLOTS + "?date=" + ds + "&duration_mins=15").then(function (r) { return r; }).catch(function () { return null; })); } return Promise.all(promises); }, enabled: viewMode === "month" && showFreeSlots, staleTime: 300000 });
  var monthFreeMap = useMemo(function () { var m = {}; (monthFreeSlotsQuery.data || []).forEach(function (e) { if (e && e.date) m[e.date] = e.total_free_mins || 0; }); return m; }, [monthFreeSlotsQuery.data]);

  // ── Google Calendar sync status polling ──
  var syncStatusQuery = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: function () { return apiGet(CALENDAR.GOOGLE.STATUS); },
    staleTime: 60 * 1000,
    refetchInterval: function (query) {
      var data = query.state.data;
      if (data && data.sync_enabled) return 300000; // 5 minutes
      return false;
    },
  });
  var syncStatus = syncStatusQuery.data || {};
  var isSyncConnected = syncStatus.connected || false;
  var isSyncEnabled = syncStatus.sync_enabled || false;
  var lastSyncAt = syncStatus.last_sync_at || null;
  var eventsPending = syncStatus.events_pending || 0;

  // ── Sync Now mutation ──
  var [isSyncing, setIsSyncing] = useState(false);
  var syncNowMut = useMutation({
    mutationFn: function () { return apiPost(CALENDAR.GOOGLE.SYNC); },
    onMutate: function () { setIsSyncing(true); },
    onSuccess: function () {
      showToast("Sync started", "success");
      setTimeout(function () {
        setIsSyncing(false);
        syncStatusQuery.refetch();
        invalidateCalendar();
      }, 3000);
    },
    onError: function (err) {
      setIsSyncing(false);
      showToast(err.userMessage || err.message || "Sync failed", "error");
    },
  });

  // ── Format relative time for "last synced" display ──
  function formatLastSynced(isoStr) {
    if (!isoStr) return "Never synced";
    var syncDate = new Date(isoStr);
    if (isNaN(syncDate.getTime())) return "Never synced";
    var diffMs = Date.now() - syncDate.getTime();
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return diffMin + " min ago";
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + "h ago";
    var diffDays = Math.floor(diffHr / 24);
    return diffDays + "d ago";
  }

  // ── Agenda view range (next 60 days from today) ──
  var agendaStart = formatDateISO(new Date());
  var agendaEndD = addDays(new Date(), 60 * agendaPage);
  var agendaEndStr = formatDateISO(agendaEndD);

  var agendaTasksQuery = useQuery({
    queryKey: ["calendar-agenda-tasks", agendaStart, agendaEndStr],
    queryFn: function () { return apiGet(CALENDAR.VIEW + "?start=" + agendaStart + "&end=" + agendaEndStr); },
    enabled: viewMode === "agenda",
  });
  var agendaEventsQuery = useQuery({
    queryKey: ["calendar-agenda-events", agendaStart, agendaEndStr],
    queryFn: function () { return apiGet(CALENDAR.EVENTS + "?start_time__gte=" + agendaStart + "&start_time__lte=" + agendaEndStr + "T23:59:59"); },
    enabled: viewMode === "agenda",
  });

  // ── Heatmap view: last 90 days ──
  var heatmapEnd = useMemo(function () { return new Date(); }, []);
  var heatmapStart = useMemo(function () { var d = new Date(); d.setDate(d.getDate() - 89); return d; }, []);
  var heatmapStartStr = formatDateISO(heatmapStart);
  var heatmapEndStr = formatDateISO(heatmapEnd);

  var heatmapQuery = useQuery({
    queryKey: ["calendar-heatmap", heatmapStartStr, heatmapEndStr],
    queryFn: function () { return apiGet(CALENDAR.HEATMAP + "?start=" + heatmapStartStr + "&end=" + heatmapEndStr); },
    enabled: viewMode === "heatmap",
    staleTime: 5 * 60 * 1000,
  });

  // Show toast on query errors
  useEffect(function () {
    if (tasksQuery.error) showToast(tasksQuery.error.userMessage || tasksQuery.error.message || "Failed to load calendar", "error");
  }, [tasksQuery.error]);

  useEffect(function () {
    if (todayQuery.error) showToast(todayQuery.error.userMessage || todayQuery.error.message || "Failed to load today's tasks", "error");
  }, [todayQuery.error]);

  // Transform all data into keyed object by "y-m-d"
  var events = {};
  var multiDayEvents = [];
  function addToMap(item) {
    if (!item.date) return;
    var d = new Date(item.date);
    if (isNaN(d.getTime())) return;
    var k = getKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!events[k]) events[k] = [];
    var exists = events[k].some(function (e) { return e.id === item.id; });
    if (!exists) events[k].push(item);
    // Track multi-day events and add to each spanned day
    if (item.isMultiDay && item.startDate && item.endDate) {
      var alreadyTracked = multiDayEvents.some(function (me) { return me.id === item.id; });
      if (!alreadyTracked) multiDayEvents.push(item);
      var cursor = addDays(new Date(item.startDate), 1);
      var endD = new Date(item.endDate);
      while (cursor <= endD) {
        var mk = getKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        if (!events[mk]) events[mk] = [];
        var mexists = events[mk].some(function (e) { return e.id === item.id; });
        if (!mexists) events[mk].push(item);
        cursor = addDays(cursor, 1);
      }
    }
  }

  // Add tasks from monthly view
  var rawTasks = (tasksQuery.data && tasksQuery.data.results) || tasksQuery.data || [];
  if (Array.isArray(rawTasks)) rawTasks.forEach(function (t) { addToMap(normalizeTask(t)); });

  // Add calendar events from events endpoint
  var rawCalEvents = (eventsQuery.data && eventsQuery.data.results) || eventsQuery.data || [];
  if (Array.isArray(rawCalEvents)) rawCalEvents.forEach(function (e) { addToMap(normalizeEvent(e)); });

  // Add today's tasks (merge without duplicates)
  var rawToday = (todayQuery.data && todayQuery.data.results) || todayQuery.data || [];
  if (Array.isArray(rawToday)) rawToday.forEach(function (t) { addToMap(normalizeTask(t)); });

  // Add week view data
  var rawWeekTasks = (weekTasksQuery.data && weekTasksQuery.data.results) || weekTasksQuery.data || [];
  if (Array.isArray(rawWeekTasks)) rawWeekTasks.forEach(function (t) { addToMap(normalizeTask(t)); });
  var rawWeekEvents = (weekEventsQuery.data && weekEventsQuery.data.results) || weekEventsQuery.data || [];
  if (Array.isArray(rawWeekEvents)) rawWeekEvents.forEach(function (e) { addToMap(normalizeEvent(e)); });

  // Add agenda view data
  var rawAgendaTasks = (agendaTasksQuery.data && agendaTasksQuery.data.results) || agendaTasksQuery.data || [];
  if (Array.isArray(rawAgendaTasks)) rawAgendaTasks.forEach(function (t) { addToMap(normalizeTask(t)); });
  var rawAgendaEvents = (agendaEventsQuery.data && agendaEventsQuery.data.results) || agendaEventsQuery.data || [];
  if (Array.isArray(rawAgendaEvents)) rawAgendaEvents.forEach(function (e) { addToMap(normalizeEvent(e)); });

  // ── Apply recurrence exceptions: skip/modify occurrences ──
  // Build a lookup: { eventId -> { "YYYY-MM-DD" -> exception } }
  var excLookup = {};
  Object.keys(events).forEach(function (k) {
    (events[k] || []).forEach(function (evt) {
      if (evt.isRecurring && evt.recurrenceExceptions && evt.recurrenceExceptions.length > 0) {
        if (!excLookup[evt.id]) excLookup[evt.id] = {};
        evt.recurrenceExceptions.forEach(function (exc) {
          excLookup[evt.id][exc.original_date] = exc;
        });
      }
    });
  });

  // Filter out skipped occurrences and apply modifications
  Object.keys(events).forEach(function (k) {
    events[k] = events[k].filter(function (evt) {
      if (!evt.isRecurring || !excLookup[evt.id]) return true;
      var evtDate = evt.date; // "YYYY-MM-DD"
      var exc = excLookup[evt.id][evtDate];
      if (!exc) return true;
      if (exc.skip_occurrence) return false; // skip this occurrence
      return true;
    }).map(function (evt) {
      if (!evt.isRecurring || !excLookup[evt.id]) return evt;
      var evtDate = evt.date;
      var exc = excLookup[evt.id][evtDate];
      if (!exc || exc.skip_occurrence) return evt;
      // Apply modifications
      var modified = Object.assign({}, evt);
      if (exc.modified_title) modified.title = exc.modified_title;
      if (exc.modified_start_time) {
        var mStart = exc.modified_start_time;
        modified.rawStartTime = mStart;
        modified.date = mStart.split("T")[0];
        modified.time = mStart.includes("T") ? mStart.split("T")[1].substring(0, 5) : modified.time;
      }
      if (exc.modified_end_time) {
        modified.rawEndTime = exc.modified_end_time;
      }
      modified.isModifiedOccurrence = true;
      return modified;
    });
  });

  // ── Apply category filter (if any categories selected) ──
  if (categoryFilters.length > 0) {
    Object.keys(events).forEach(function (k) {
      events[k] = events[k].filter(function (evt) {
        if (evt.isTask) return true;
        return categoryFilters.indexOf(evt.category || "custom") !== -1;
      });
    });
    multiDayEvents = multiDayEvents.filter(function (evt) {
      if (evt.isTask) return true;
      return categoryFilters.indexOf(evt.category || "custom") !== -1;
    });
  }

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const prevMonth=()=>{if(viewM===0){setViewM(11);setViewY(viewY-1);}else setViewM(viewM-1);setSelDay(1);};
  const nextMonth=()=>{if(viewM===11){setViewM(0);setViewY(viewY+1);}else setViewM(viewM+1);setSelDay(1);};
  const prevWeek=function(){setWeekStart(addDays(weekStart,-7));};
  const nextWeek=function(){setWeekStart(addDays(weekStart,7));};
  const goToday=function(){
    setViewY(TODAY.y);setViewM(TODAY.m);setSelDay(null);
    setWeekStart(getMonday(new Date()));
    setAgendaPage(1);
    setAgendaSelDate(new Date());
  };

  // ── Helper: invalidate all calendar queries ──
  function invalidateCalendar() {
    queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-today"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-week-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-week-events"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-agenda-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-agenda-events"] });
    queryClient.invalidateQueries({ queryKey: ["focus-block-events"] });
    queryClient.invalidateQueries({ queryKey: ["focus-mode-active"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-overdue"] });
    queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
    queryClient.invalidateQueries({ queryKey: ["schedule-score"] });
    queryClient.invalidateQueries({ queryKey: ["free-slots-week"] });
    queryClient.invalidateQueries({ queryKey: ["free-slots-month"] });
    queryClient.invalidateQueries({ queryKey: ["find-free-time"] });
  }

  // ── iCal import handler ──
  function handleIcalFileChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (icalFileRef.current) icalFileRef.current.value = "";
    setIcalImporting(true);
    var formData = new FormData();
    formData.append("file", file);
    apiUpload(CALENDAR.ICAL_IMPORT, formData).then(function (data) {
      setIcalImporting(false);
      setIcalResult(data);
      if (data && data.imported > 0) {
        invalidateCalendar();
      }
    }).catch(function (err) {
      setIcalImporting(false);
      setIcalResult({ imported: 0, skipped: 0, errors: [err.userMessage || err.message || "Import failed"] });
    });
  }

  // ── Export / download helper ──
  function handleExportDownload(format) {
    setExportLoading(format);
    var url = CALENDAR.EXPORT + "?start_date=" + startDate + "&end_date=" + endDate + "&format=" + format;
    var API_BASE = import.meta.env.VITE_API_BASE || "";
    var token = getToken();
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch(API_BASE + url, { method: "GET", headers: headers, credentials: "include" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("Export failed: " + resp.status);
        return resp.blob().then(function (blob) {
          return { blob: blob, resp: resp };
        });
      })
      .then(function (result) {
        var blob = result.blob;
        var ext = format === "csv" ? ".csv" : format === "ical" ? ".ics" : ".json";
        var mimeType = format === "csv" ? "text/csv" : format === "ical" ? "text/calendar" : "application/json";
        var fileBlob = new Blob([blob], { type: mimeType });
        var blobUrl = URL.createObjectURL(fileBlob);
        var anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = "dreamplanner-calendar-" + startDate + "-to-" + endDate + ext;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
        setExportLoading(null);
        setExportOpen(false);
        showToast("Calendar exported as " + format.toUpperCase(), "success");
      })
      .catch(function (err) {
        setExportLoading(null);
        showToast(err.message || "Export failed", "error");
      });
  }

  function handlePrintView() {
    setExportOpen(false);
    setTimeout(function () { window.print(); }, 200);
  }

  // ── Drag-and-drop reschedule handler ──
  var handleDragReschedule = function (info) {
    var evt = info.event;
    var targetDate = info.targetDate;
    var targetHour = info.targetHour;

    if (!evt || !targetDate) return;

    // Tasks managed via Dream Details cannot be rescheduled here
    if (evt.isTask) {
      showToast("Tasks are rescheduled from Dream Details", "info");
      return;
    }

    // Build new start_time and end_time
    var origTime = evt.time || "09:00";
    var origParts = origTime.split(":");
    var origH = parseInt(origParts[0], 10) || 9;
    var origM = parseInt(origParts[1], 10) || 0;

    var newH = targetHour != null ? parseInt(targetHour, 10) : origH;
    var newM = targetHour != null ? 0 : origM;

    // Compute duration from original event (default 1 hour)
    var durationMs = 3600000;
    var newStartStr = targetDate + "T" + String(newH).padStart(2, "0") + ":" + String(newM).padStart(2, "0") + ":00";
    var newStart = new Date(newStartStr);
    var newEnd = new Date(newStart.getTime() + durationMs);
    var endStr = newEnd.getFullYear() + "-" + String(newEnd.getMonth() + 1).padStart(2, "0") + "-" + String(newEnd.getDate()).padStart(2, "0") + "T" + String(newEnd.getHours()).padStart(2, "0") + ":" + String(newEnd.getMinutes()).padStart(2, "0") + ":00";

    // Pre-check conflicts before rescheduling
    apiPost(CALENDAR.CHECK_CONFLICTS, { start_time: newStartStr, end_time: endStr, exclude_event_id: evt.id })
      .then(function (res) {
        if (res.hasConflicts && res.conflicts && res.conflicts.length > 0) {
          setConflictWarning({
            conflicts: res.conflicts,
            pendingBody: null,
            mode: "reschedule",
            rescheduleInfo: { id: evt.id, startTime: newStartStr, endTime: endStr },
          });
        } else {
          rescheduleMut.mutate({ id: evt.id, startTime: newStartStr, endTime: endStr });
        }
      })
      .catch(function () {
        // Graceful degradation: reschedule without conflict check
        rescheduleMut.mutate({ id: evt.id, startTime: newStartStr, endTime: endStr });
      });
  };

  var drag = useDragReschedule({ onReschedule: handleDragReschedule, events: events });

  // ── Reschedule mutation (PATCH event) ──
  var rescheduleMut = useMutation({
    mutationFn: function (params) {
      var patchBody = { start_time: params.startTime, end_time: params.endTime };
      if (params.force) patchBody.force = true;
      return apiPatch(CALENDAR.EVENT_DETAIL(params.id), patchBody);
    },
    onSuccess: function () { invalidateCalendar(); showToast("Event rescheduled", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to reschedule", "error"); },
  });

  // ── Toggle task completion (Dream task via tasks API) ──
  var toggleTaskMut = useMutation({
    mutationFn: function (params) {
      return apiPost(DREAMS.TASKS.COMPLETE(params.id));
    },
    onSuccess: function () { invalidateCalendar(); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to update task", "error"); },
  });

  // ── Toggle calendar event completion ──
  var toggleEventMut = useMutation({
    mutationFn: function (params) {
      return apiPatch(CALENDAR.EVENT_DETAIL(params.id), { status: params.completed ? "completed" : "scheduled" });
    },
    onSuccess: function () { invalidateCalendar(); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to update task", "error"); },
  });

  // ── Delete calendar event ──
  var deleteEventMut = useMutation({
    mutationFn: function (params) {
      return apiDelete(CALENDAR.EVENT_DETAIL(params.id));
    },
    onSuccess: function () { invalidateCalendar(); showToast("Task deleted", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to delete", "error"); },
  });

  // ── Skip single occurrence of recurring event ──
  var skipOccurrenceMut = useMutation({
    mutationFn: function (params) {
      return apiPost(CALENDAR.SKIP_OCCURRENCE(params.eventId), { original_date: params.originalDate });
    },
    onSuccess: function () { invalidateCalendar(); showToast("Occurrence skipped", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to skip occurrence", "error"); },
  });

  // ── Modify single occurrence of recurring event ──
  var modifyOccurrenceMut = useMutation({
    mutationFn: function (params) {
      var body = { original_date: params.originalDate };
      if (params.title !== undefined) body.title = params.title;
      if (params.startTime !== undefined) body.start_time = params.startTime;
      if (params.endTime !== undefined) body.end_time = params.endTime;
      return apiPost(CALENDAR.MODIFY_OCCURRENCE(params.eventId), body);
    },
    onSuccess: function () { invalidateCalendar(); showToast("Occurrence updated", "success"); setEditOccurrence(null); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to modify occurrence", "error"); },
  });

  // ── Create calendar event ──
  var createMutation = useMutation({
    mutationFn: function (body) {
      return apiPost(CALENDAR.EVENTS, body);
    },
    onSuccess: function () { invalidateCalendar(); showToast("Task created", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to create task", "error"); },
  });

  var toggleTask = function (evtKey, evtId) {
    var evt = (events[evtKey] || []).find(function (e) { return e.id === evtId; });
    if (!evt) return;
    if (evt.isTask) {
      toggleTaskMut.mutate({ id: evtId });
    } else {
      toggleEventMut.mutate({ id: evtId, completed: !evt.done });
    }
  };

  var deleteEvent = function (evtKey, evtId) {
    var evt = (events[evtKey] || []).find(function (e) { return e.id === evtId; });
    if (evt && evt.isTask) {
      showToast("Tasks are managed from Dream Details", "info");
    } else {
      deleteEventMut.mutate({ id: evtId });
    }
    setConfirmDel(null);
  };

  // ── Parse time string like "9:00 AM" to "09:00:00" ──
  function parseTimeTo24h(timeStr) {
    var match = (timeStr || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return "09:00:00";
    var h = parseInt(match[1], 10);
    var m = match[2];
    var ampm = (match[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + m + ":00";
  }

  // ── Build human-readable recurrence summary ──
  function buildRecurrenceSummary(rule) {
    if (!rule) return "";
    var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var ORDINALS = ["", "First", "Second", "Third", "Fourth", "Fifth"];
    var freq = rule.frequency || "daily";
    var intv = rule.interval || 1;
    var parts = [];
    if (freq === "daily") {
      parts.push(intv === 1 ? "Every day" : "Every " + intv + " days");
    } else if (freq === "weekly") {
      parts.push(intv === 1 ? "Weekly" : "Every " + intv + " weeks");
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        var dayLabels = rule.days_of_week.map(function (d) { return DAY_NAMES[d]; });
        parts.push("on " + dayLabels.join(", "));
      }
    } else if (freq === "monthly") {
      parts.push(intv === 1 ? "Monthly" : "Every " + intv + " months");
      if (rule.week_of_month != null && rule.day_of_week != null) {
        parts.push("on the " + ORDINALS[rule.week_of_month] + " " + DAY_NAMES[rule.day_of_week]);
      } else if (rule.day_of_month != null) {
        parts.push("on day " + rule.day_of_month);
      }
    } else if (freq === "yearly") {
      parts.push(intv === 1 ? "Yearly" : "Every " + intv + " years");
    } else if (freq === "custom") {
      parts.push("Every " + intv + " days (custom)");
    }
    if (rule.weekdays_only) parts.push("(weekdays only)");
    if (rule.end_date) parts.push("until " + rule.end_date);
    else if (rule.end_after_count) parts.push("for " + rule.end_after_count + " times");
    return parts.join(" ");
  }

  // ── Build recurrence_rule object from form state ──
  function buildRecurrenceRule() {
    if (!recEnabled) return null;
    var rule = { frequency: recFrequency, interval: recInterval };
    if (recFrequency === "weekly" && recDaysOfWeek.length > 0) {
      rule.days_of_week = recDaysOfWeek.slice().sort();
    }
    if (recFrequency === "monthly") {
      if (recMonthlyMode === "nthWeekday") {
        rule.week_of_month = recWeekOfMonth;
        rule.day_of_week = recDayOfWeek;
      } else {
        rule.day_of_month = recDayOfMonth;
      }
    }
    if (recEndMode === "on_date" && recEndDate) rule.end_date = recEndDate;
    else if (recEndMode === "after_count" && recEndAfterCount > 0) rule.end_after_count = recEndAfterCount;
    if (recWeekdaysOnly) rule.weekdays_only = true;
    return rule;
  }

  // ── Reset recurrence form ──
  function resetRecurrence() {
    setRecEnabled(false);
    setRecFrequency("weekly");
    setRecInterval(1);
    setRecDaysOfWeek([]);
    setRecDayOfMonth(1);
    setRecMonthlyMode("dayOfMonth");
    setRecWeekOfMonth(1);
    setRecDayOfWeek(0);
    setRecEndMode("never");
    setRecEndDate("");
    setRecEndAfterCount(10);
    setRecWeekdaysOnly(false);
    setEventReminders([{minutes_before: 15, type: "push"}]);
    setCustomReminderOpen(false);
    setCustomReminderValue(30);
    setCustomReminderUnit("min");
  }

  // ── Reminder preset options ──
  var REMINDER_PRESETS = [
    {label: "None", minutes: null},
    {label: "5min", minutes: 5},
    {label: "15min", minutes: 15},
    {label: "30min", minutes: 30},
    {label: "1hr", minutes: 60},
    {label: "1day", minutes: 1440},
  ];

  // ── Add a reminder by minutes ──
  function addReminder(minutes) {
    if (minutes === null) {
      setEventReminders([]);
      return;
    }
    var exists = eventReminders.some(function(r) { return r.minutes_before === minutes; });
    if (exists) return;
    setEventReminders(eventReminders.concat([{minutes_before: minutes, type: "push"}]));
  }

  // ── Remove a reminder by index ──
  function removeReminder(idx) {
    setEventReminders(eventReminders.filter(function(_, i) { return i !== idx; }));
  }

  // ── Add custom reminder ──
  function addCustomReminder() {
    var minutes = customReminderValue;
    if (customReminderUnit === "hr") minutes = customReminderValue * 60;
    else if (customReminderUnit === "day") minutes = customReminderValue * 1440;
    addReminder(minutes);
    setCustomReminderOpen(false);
    setCustomReminderValue(30);
    setCustomReminderUnit("min");
  }

  // ── Build event body from current form state ──
  function buildEventBody() {
    var cleanTitle = sanitizeText(newTitle, 200);
    var missing = validateRequired({ title: cleanTitle });
    if (missing.length > 0) {
      showToast("Title is required", "error");
      return null;
    }
    var day = selDay || TODAY.d;
    var dateStr = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var body = { title: cleanTitle, category: newCategory };

    if (newAllDay) {
      var allDayEndDate = newEndDate || dateStr;
      body.start_time = dateStr + "T00:00:00";
      body.end_time = allDayEndDate + "T23:59:00";
      body.all_day = true;
    } else if (newEndDate && newEndDate > dateStr) {
      var time24md = parseTimeTo24h(newTime);
      body.start_time = dateStr + "T" + time24md;
      body.end_time = newEndDate + "T" + time24md;
      body.all_day = false;
    } else {
      var time24 = parseTimeTo24h(newTime);
      var startTime = dateStr + "T" + time24;
      var endH = parseInt(time24.split(":")[0], 10) + 1;
      var endTime = dateStr + "T" + String(endH).padStart(2, "0") + ":" + time24.split(":")[1] + ":00";
      body.start_time = startTime;
      body.end_time = endTime;
      body.all_day = false;
    }

    // Attach recurrence rule if enabled
    var recRule = buildRecurrenceRule();
    if (recRule) {
      body.is_recurring = true;
      body.recurrence_rule = recRule;
    }

    // Attach reminders
    if (eventReminders && eventReminders.length > 0) {
      body.reminders = eventReminders;
      // Also set legacy field to smallest reminder for backward compat
      var sorted = eventReminders.slice().sort(function(a, b) { return a.minutes_before - b.minutes_before; });
      body.reminder_minutes_before = sorted[0].minutes_before;
    } else {
      body.reminders = [];
      body.reminder_minutes_before = 0;
    }

    // Attach event timezone if set
    if (newEventTz) {
      body.event_timezone = newEventTz;
    }

    return body;
  }

  var handleAddEvt = function () {
    var body = buildEventBody();
    if (!body) return;

    setConflictChecking(true);
    apiPost(CALENDAR.CHECK_CONFLICTS, { start_time: body.start_time, end_time: body.end_time })
      .then(function (res) {
        setConflictChecking(false);
        if (res.hasConflicts && res.conflicts && res.conflicts.length > 0) {
          setConflictWarning({ conflicts: res.conflicts, pendingBody: body, mode: "create", rescheduleInfo: null });
        } else {
          createMutation.mutate(body);
          setNewTitle("");
          setNewCategory("custom");
          setNewEventTz("");
          setNewEndDate("");
          setNewAllDay(false);
          resetRecurrence();
          setAddEvt(false);
        }
      })
      .catch(function () {
        setConflictChecking(false);
        // If conflict check fails, create anyway (graceful degradation)
        createMutation.mutate(body);
        setNewTitle("");
        setNewCategory("custom");
        setNewEventTz("");
        setNewEndDate("");
        setNewAllDay(false);
        resetRecurrence();
        setAddEvt(false);
      });
  };

  // ── Force create/reschedule despite conflicts ──
  var handleForceCreate = function () {
    if (!conflictWarning) return;
    if (conflictWarning.mode === "create") {
      var body = Object.assign({}, conflictWarning.pendingBody, { force: true });
      createMutation.mutate(body);
      setNewTitle("");
      setNewCategory("custom");
      setNewEventTz("");
      setNewEndDate("");
      setNewAllDay(false);
      resetRecurrence();
      setAddEvt(false);
    } else if (conflictWarning.mode === "reschedule" && conflictWarning.rescheduleInfo) {
      var info = conflictWarning.rescheduleInfo;
      rescheduleMut.mutate({ id: info.id, startTime: info.startTime, endTime: info.endTime, force: true });
    }
    setConflictWarning(null);
  };

  // ── Format conflict time for display ──
  function formatConflictTime(isoStr) {
    if (!isoStr) return "";
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return h12 + ":" + String(m).padStart(2, "0") + " " + ampm;
  }

  var isLoading = tasksQuery.isLoading || todayQuery.isLoading;
  var isWeekLoading = weekTasksQuery.isLoading || weekEventsQuery.isLoading;
  var isAgendaLoading = agendaTasksQuery.isLoading || agendaEventsQuery.isLoading;

  if (tasksQuery.isError && todayQuery.isError) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(tasksQuery.error && (tasksQuery.error.userMessage || tasksQuery.error.message)) || (todayQuery.error && (todayQuery.error.userMessage || todayQuery.error.message)) || "Failed to load calendar"}
            onRetry={function () { tasksQuery.refetch(); todayQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  const daysInMonth=getDaysInMonth(viewY,viewM);

  const renderEventCard=(evt,evtKey)=>{
    var evtDragHandlers=(!evt.isTask)?drag.dragHandlers(evt.id):{};
    return(
    <GlassCard mb={8} style={{overflow:"hidden"}}>
      <div {...evtDragHandlers} style={Object.assign({},{padding:14,display:"flex",alignItems:"center",gap:12,cursor:evt.isTask?"default":"grab"},evtDragHandlers.style||{})}>
        <div style={{width:4,alignSelf:"stretch",minHeight:40,borderRadius:2,background:evt.color,flexShrink:0,boxShadow:`0 0 8px ${evt.color}30`}}/>
        {evt.type==="task"?(
          <button aria-label={evt.done ? "Mark task incomplete" : "Mark task complete"} onClick={()=>toggleTask(evtKey,evt.id)} style={{width:24,height:24,borderRadius:8,border:evt.done?"none":"2px solid var(--dp-accent-border)",background:evt.done?"rgba(93,229,168,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s",fontFamily:"inherit"}}>
            {evt.done&&<Check size={13} color={"var(--dp-success)"} strokeWidth={3}/>}
          </button>
        ):(function(){var eCatCfg=CATEGORY_CONFIG[evt.category]||CATEGORY_CONFIG.custom;var ECatIcon=eCatCfg.icon;return(
          <div style={{width:24,height:24,borderRadius:8,background:eCatCfg.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <ECatIcon size={12} color={eCatCfg.color} strokeWidth={2.5}/>
          </div>
        );})()}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14,fontWeight:500,color:evt.done?"var(--dp-text-muted)":"var(--dp-text)",textDecoration:evt.done?"line-through":"none",transition:"all 0.2s"}}>{evt.title}</span>
            {evt.isRecurring&&<Repeat size={12} color={"var(--dp-accent)"} strokeWidth={2.5}/>}
            {evt.syncStatus === "synced" && (
              <span title="Synced with Google Calendar"><Cloud size={12} color="var(--dp-success)" strokeWidth={2.5} /></span>
            )}
            {evt.syncStatus === "pending" && (
              <span title="Pending sync" style={{display:"inline-flex"}}><Cloud size={12} color="#F59E0B" strokeWidth={2.5} style={{animation:"dpSyncPulse 1.5s ease-in-out infinite"}} /></span>
            )}
            {evt.syncStatus === "error" && (
              <span title={evt.lastSyncError || "Sync error"} style={{display:"inline-flex",position:"relative"}}>
                <CloudOff size={12} color="var(--dp-danger)" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{evt.allDay?"All day":travelMode&&evt.rawStartTime?formatTimeInTz(evt.rawStartTime,displayTz):evt.time}</span>
            {evt.eventTimezone&&evt.eventTimezone!==displayTz&&<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:600,background:"rgba(59,130,246,0.1)",color:"#3B82F6"}}><Globe size={9} strokeWidth={2.5}/>{getTzAbbr(evt.eventTimezone)}</span>}
            {evt.isRecurring&&evt.recurrenceRule&&<span style={{fontSize:11,color:"var(--dp-accent)",fontWeight:500}}>{buildRecurrenceSummary(evt.recurrenceRule)}</span>}
            {evt.isMultiDay&&<span style={{padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(139,92,246,0.12)",color:"var(--dp-accent)"}}>{evt.spanDays} days</span>}
            {evt.isModifiedOccurrence&&<span style={{padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(251,191,36,0.12)",color:"#F59E0B"}}>Modified</span>}
            {evt.isDeadline&&<span style={{padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(239,68,68,0.12)",color:"var(--dp-danger)"}}>Deadline</span>}
            {(evt.isChain || evt.chainNextDelayDays != null) && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(139,92,246,0.12)",color:"var(--dp-accent)"}}><Link size={9} strokeWidth={2.5}/>Chain{evt.chainPosition ? " " + evt.chainPosition.position + "/" + evt.chainPosition.total : ""}</span>}
            {(function(){var rl=getEventReminderLabel(evt);if(!rl)return null;return(<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:600,background:"rgba(251,191,36,0.12)",color:"#D97706"}}><Bell size={9} strokeWidth={2.5}/>{rl}</span>);})()}
            {!evt.isTask&&evt.category&&evt.category!=="custom"&&(function(){var cc=CATEGORY_CONFIG[evt.category];if(!cc)return null;var CCIcon=cc.icon;return(<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:600,background:cc.color+"14",color:cc.color}}><CCIcon size={9} strokeWidth={2.5}/>{cc.label}</span>);})()}
            {evt.dream&&<span style={{fontSize:12,color:adaptColor(evt.color,isLight),fontWeight:500}}>{evt.dream}</span>}
          </div>
        </div>
        {evt.isRecurring && !evt.isTask && (
          <button aria-label="Edit occurrence" className="dp-gh" onClick={function(){setRecurringChoice({evt:evt,key:evtKey,action:"edit"});}} style={{width:30,height:30,borderRadius:9,border:"none",background:"rgba(139,92,246,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.15s",opacity:0.5,fontFamily:"inherit",marginRight:4}}>
            <Edit3 size={14} color="rgba(139,92,246,0.8)" strokeWidth={2}/>
          </button>
        )}
        <button aria-label="Delete event" className="dp-gh" onClick={function(){if(evt.isRecurring&&!evt.isTask){setRecurringChoice({evt:evt,key:evtKey,action:"delete"});}else{setConfirmDel({key:evtKey,id:evt.id,title:evt.title});}}} style={{width:30,height:30,borderRadius:9,border:"none",background:"rgba(239,68,68,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.15s",opacity:0.5,fontFamily:"inherit"}}>
          <Trash2 size={14} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
        </button>
      </div>
    </GlassCard>
  );};

  const firstDow=getFirstDow(viewY,viewM);
  const isToday=(d)=>d===TODAY.d&&viewM===TODAY.m&&viewY===TODAY.y;
  const isSel=(d)=>selDay!==null&&d===selDay;
  const todayKey=getKey(TODAY.y,TODAY.m,TODAY.d);
  const tomorrowD=new Date(TODAY.y,TODAY.m,TODAY.d+1);
  const tomorrowKey=getKey(tomorrowD.getFullYear(),tomorrowD.getMonth(),tomorrowD.getDate());
  const todayEvents=events[todayKey]||[];
  const tomorrowEvents=events[tomorrowKey]||[];
  const selKey=selDay?getKey(viewY,viewM,selDay):null;
  const selEvents=selKey?(events[selKey]||[]):[];

  // build calendar grid
  const cells=[];
  for(let i=0;i<firstDow;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);

  // ── Compute multi-day bar rows for month view ──
  function computeMonthMultiDayBars() {
    var bars = [];
    multiDayEvents.forEach(function (evt) {
      if (!evt.startDate || !evt.endDate) return;
      var evtStart = new Date(evt.startDate);
      var evtEnd = new Date(evt.endDate);
      var totalCells = cells.length;
      var numRows = Math.ceil(totalCells / 7);
      for (var row = 0; row < numRows; row++) {
        var rowStartIdx = row * 7;
        var firstDayInRow = null;
        var firstColInRow = 0;
        var lastDayInRow = null;
        var lastColInRow = 6;
        for (var ci = 0; ci < 7; ci++) {
          var cellIdx = rowStartIdx + ci;
          if (cellIdx < totalCells && cells[cellIdx] !== null) {
            if (firstDayInRow === null) { firstDayInRow = cells[cellIdx]; firstColInRow = ci; }
            lastDayInRow = cells[cellIdx]; lastColInRow = ci;
          }
        }
        if (firstDayInRow === null) continue;
        var rowStartDate = new Date(viewY, viewM, firstDayInRow);
        var rowEndDate = new Date(viewY, viewM, lastDayInRow);
        if (evtStart > rowEndDate || evtEnd < rowStartDate) continue;
        var barStartDate = evtStart > rowStartDate ? evtStart : rowStartDate;
        var barEndDate = evtEnd < rowEndDate ? evtEnd : rowEndDate;
        var barStartDay = barStartDate.getDate();
        var barEndDay = barEndDate.getDate();
        var startCol = -1;
        var endCol = -1;
        for (var ci2 = 0; ci2 < 7; ci2++) {
          var cellIdx2 = rowStartIdx + ci2;
          if (cellIdx2 < totalCells && cells[cellIdx2] === barStartDay) startCol = ci2;
          if (cellIdx2 < totalCells && cells[cellIdx2] === barEndDay) endCol = ci2;
        }
        if (startCol === -1 || endCol === -1) continue;
        bars.push({ evt: evt, row: row, colStart: startCol + 1, colSpan: endCol - startCol + 1 });
      }
    });
    return bars;
  }

  var monthMultiDayBars = computeMonthMultiDayBars();
  var barsByRow = {};
  monthMultiDayBars.forEach(function (bar) {
    if (!barsByRow[bar.row]) barsByRow[bar.row] = [];
    barsByRow[bar.row].push(bar);
  });

  // ── Multi-day bar renderer ──
  var renderMultiDayBar = function (evt, colStart, colSpan, onClick) {
    return (
      <div
        key={evt.id + "-bar-" + colStart}
        onClick={function () { if (onClick) onClick(); }}
        style={{
          gridColumn: colStart + " / span " + colSpan,
          height: 22,
          borderRadius: 11,
          background: evt.color + "33",
          borderLeft: "3px solid " + evt.color,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          cursor: "pointer",
          overflow: "hidden",
          transition: "all 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
        className="dp-multi-bar"
      >
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: adaptColor(evt.color, isLight),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{evt.title}</span>
      </div>
    );
  };

  return(
    <div className="dp-desktop-main" style={{position:"absolute",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* ═══ EVENT ALERT NOTIFICATIONS ═══ */}
      <EventAlertPopup />

      <GlassAppBar
        className="dp-desktop-header"
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={()=>navigate("/")} label="Go back" />
            <Calendar size={18} color={"var(--dp-accent)"} strokeWidth={2}/>
          </>
        }
        title="Calendar"
        right={
          <>
            <IconButton icon={Search} label="Search events" onClick={function(){setSearchOpen(true);}} />
            <IconButton icon={Printer} label="Print / Export" onClick={function(){setExportOpen(true);}} />
            <button aria-label="Go to today" onClick={goToday} style={{padding:"6px 12px",borderRadius:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Today</button>
            <IconButton icon={Plus} label="Add task" onClick={()=>{setNewTitle("");setNewCategory("custom");setAddEvt(true);}} />
          </>
        }
      />

      {/* ═══ SYNC STATUS BAR ═══ */}
      {isSyncConnected && (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          padding:"6px 16px",
          background:isSyncing ? "rgba(139,92,246,0.08)" : eventsPending > 0 ? "rgba(251,191,36,0.08)" : "rgba(93,229,168,0.06)",
          borderBottom:"1px solid var(--dp-accent-border)",
          zIndex:11,
          minHeight:32,
        }}>
          {isSyncing ? (
            <>
              <Loader2 size={13} color="var(--dp-accent)" strokeWidth={2.5} style={{animation:"spin 1s linear infinite"}} />
              <span style={{fontSize:12,fontWeight:500,color:"var(--dp-accent)"}}>Syncing...</span>
            </>
          ) : eventsPending > 0 ? (
            <>
              <Cloud size={13} color="#F59E0B" strokeWidth={2.5} />
              <span style={{fontSize:12,fontWeight:500,color:"#F59E0B"}}>{eventsPending} event{eventsPending !== 1 ? "s" : ""} pending sync</span>
              <span style={{fontSize:11,color:"var(--dp-text-muted)",marginLeft:4}}>{"Last synced " + formatLastSynced(lastSyncAt)}</span>
            </>
          ) : (
            <>
              <Cloud size={13} color="var(--dp-success)" strokeWidth={2.5} />
              <span style={{fontSize:12,fontWeight:500,color:"var(--dp-text-secondary)"}}>{"Last synced " + formatLastSynced(lastSyncAt)}</span>
            </>
          )}
        </div>
      )}

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 0 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div className="dp-content-area" style={{padding:"0 16px"}}>

          {/* ── Print Header (visible only in print) ── */}
          <div className="dp-print-header">DreamPlanner Calendar — {MONTHS[viewM]} {viewY}</div>

          {/* ── Quick Access ── */}
          <div className="dp-no-print" style={{display:"flex",gap:8,marginBottom:8}}>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){setSmartOpen(true);}}>
              <Sparkles size={16} color={BRAND.purple} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Smart Schedule</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){setBatchOpen(true);setBatchSelected({});setBatchDates({});setBatchTimes({});setBatchSuccess(null);}}>
              <CalendarClock size={16} color={BRAND.teal} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Batch Schedule</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){navigate("/calendar/timeblocks");}}>
              <LayoutGrid size={16} color={"var(--dp-accent)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Time Blocks</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:habitsList.length>0?"1px solid rgba(245,158,11,0.25)":"1px solid var(--dp-accent-border)",background:habitsList.length>0?"rgba(245,158,11,0.04)":"transparent"}} onClick={function(){setHabitPanelOpen(true);}}>
              <Repeat size={16} color={habitsList.length>0?"#F59E0B":"var(--dp-accent)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Habits</span>
              {habitsList.length>0&&<span style={{fontSize:10,fontWeight:700,color:"#F59E0B",marginLeft:"auto"}}>{habitsList.length}</span>}
            </GlassCard>
          </div>
          <div className="dp-no-print" style={{display:"flex",gap:8,marginBottom:14}}>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){navigate("/calendar/templates");}}>
              <Copy size={16} color={BRAND.teal} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Templates</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){navigate("/calendar/sync-settings");}}>
              <Link size={16} color={"var(--dp-accent)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Google Sync</span>
            </GlassCard>
            {isSyncConnected ? (
              <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:isSyncing?"default":"pointer",border:"1px solid rgba(139,92,246,0.2)",opacity:isSyncing?0.6:1}} onClick={function(){if(!isSyncing)syncNowMut.mutate();}}>
                {isSyncing
                  ? <Loader2 size={16} color="var(--dp-accent)" strokeWidth={2} style={{animation:"spin 1s linear infinite"}} />
                  : <RefreshCw size={16} color="var(--dp-accent)" strokeWidth={2} />
                }
                <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </GlassCard>
            ) : (
              <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:"1px solid rgba(139,92,246,0.2)"}} onClick={function(){setQuickFocusOpen(true);}}>
                <Shield size={16} color={BRAND.purple} strokeWidth={2}/>
                <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Quick Focus</span>
              </GlassCard>
            )}
          </div>
          <div className="dp-no-print" style={{display:"flex",gap:8,marginBottom:14}}>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:showFreeSlots?"1px solid rgba(34,197,94,0.4)":"1px solid var(--dp-accent-border)",background:showFreeSlots?"rgba(34,197,94,0.08)":"transparent"}} onClick={function(){setShowFreeSlots(!showFreeSlots);}}>
              <Clock size={16} color={showFreeSlots?BRAND.greenAction:"var(--dp-text-muted)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:showFreeSlots?BRAND.greenAction:"var(--dp-text-primary)"}}>{showFreeSlots?"Hide Free Slots":"Show Free Slots"}</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:"1px solid rgba(34,197,94,0.2)"}} onClick={function(){setFindFreeOpen(true);}}>
              <Search size={16} color={BRAND.greenAction} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Find Free Time</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:"1px solid rgba(139,92,246,0.2)"}} onClick={function(){setBufferPrefsOpen(true);}}>
              <Settings size={16} color={BRAND.purple} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Buffer Time</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:icalImporting?"default":"pointer",border:"1px solid rgba(139,92,246,0.2)",opacity:icalImporting?0.6:1}} onClick={function(){if(!icalImporting&&icalFileRef.current)icalFileRef.current.click();}}>
              {icalImporting ? <Loader2 size={16} color="var(--dp-accent)" strokeWidth={2} style={{animation:"spin 1s linear infinite"}} /> : <Upload size={16} color={BRAND.purple} strokeWidth={2}/>}
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>{icalImporting ? "Importing..." : "Import .ics"}</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:hasEnergyProfile?"1px solid rgba(245,158,11,0.3)":"1px solid rgba(245,158,11,0.15)",background:hasEnergyProfile?"rgba(245,158,11,0.06)":"transparent"}} onClick={function(){setEnergyModalOpen(true);}}>
              <Zap size={16} color={hasEnergyProfile?BRAND.orange:"var(--dp-text-muted)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Energy Profile</span>
            </GlassCard>
          </div>
          <div className="dp-no-print" style={{display:"flex",gap:8,marginBottom:14}}>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:"1px solid rgba(139,92,246,0.2)"}} onClick={function(){setShareOpen(true);}}>
              <Share2 size={16} color={BRAND.purple} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Share Calendar</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer",border:travelMode?"1px solid rgba(59,130,246,0.5)":"1px solid var(--dp-accent-border)",background:travelMode?"rgba(59,130,246,0.08)":"transparent"}} onClick={function(){setTravelMode(!travelMode);if(!travelMode&&!travelTz)setTravelTz(userHomeTz);}}>{travelMode?<Plane size={16} color="#3B82F6" strokeWidth={2}/>:<Globe size={16} color="var(--dp-text-muted)" strokeWidth={2}/>}<span style={{fontSize:13,fontWeight:600,color:travelMode?"#3B82F6":"var(--dp-text-primary)"}}>Travel Mode</span></GlassCard>
          </div>
          {travelMode&&(<div style={{marginBottom:14,padding:"10px 14px",borderRadius:14,background:isLight?"rgba(59,130,246,0.06)":"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><Plane size={14} color="#3B82F6" strokeWidth={2.5}/><span style={{fontSize:12,fontWeight:600,color:"#3B82F6"}}>Travel Mode</span><select value={travelTz} onChange={function(e){setTravelTz(e.target.value);}} style={{flex:1,minWidth:160,padding:"6px 10px",borderRadius:8,border:"1px solid rgba(59,130,246,0.3)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>{COMMON_TIMEZONES.map(function(tz){return(<option key={tz.value} value={tz.value}>{tz.label}</option>);})}</select><span style={{fontSize:11,color:"var(--dp-text-muted)",whiteSpace:"nowrap"}}>{getTzAbbr(displayTz)}</span><button onClick={function(){setTravelMode(false);setTravelTz("");}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid rgba(59,130,246,0.3)",background:"transparent",color:"#3B82F6",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Exit</button></div>)}
          {!travelMode&&(<div style={{marginBottom:8,display:"flex",alignItems:"center",gap:6,paddingLeft:2}}><Globe size={12} color="var(--dp-text-muted)" strokeWidth={2}/><span style={{fontSize:11,color:"var(--dp-text-muted)"}}>{getTzAbbr(userHomeTz)}</span></div>)}
          {/* ── Category Filter ── */}
          <div style={{marginBottom:14}}><button onClick={function(){setCategoryFilterOpen(!categoryFilterOpen);}} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,border:"1.5px solid "+(categoryFilters.length>0?"rgba(139,92,246,0.5)":"var(--dp-accent-border)"),background:categoryFilters.length>0?"rgba(139,92,246,0.08)":"var(--dp-glass-bg)",color:categoryFilters.length>0?"var(--dp-accent)":"var(--dp-text-secondary)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}><Filter size={14} strokeWidth={2.2}/>{categoryFilters.length>0?"Filtering: "+categoryFilters.length+" categor"+(categoryFilters.length===1?"y":"ies"):"Filter by Category"}{categoryFilterOpen?<ChevronUp size={14} strokeWidth={2}/>:<ChevronDown size={14} strokeWidth={2}/>}</button>{categoryFilterOpen&&(<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8,padding:10,borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-accent-border)"}}>{categoryFilters.length>0&&(<button onClick={function(){setCategoryFilters([]);}} style={{padding:"6px 12px",borderRadius:10,border:"1px solid var(--dp-input-border)",background:"transparent",color:"var(--dp-text-muted)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}><X size={11} strokeWidth={2.5}/>Clear All</button>)}{CATEGORY_KEYS.map(function(catKey){var cfg=CATEGORY_CONFIG[catKey];var isActive=categoryFilters.indexOf(catKey)!==-1;var CatIcon=cfg.icon;return(<button key={catKey} onClick={function(){setCategoryFilters(function(prev){if(prev.indexOf(catKey)!==-1){return prev.filter(function(c){return c!==catKey;});}return prev.concat([catKey]);});}} style={{padding:"6px 10px",borderRadius:10,border:"1.5px solid "+(isActive?cfg.color:"var(--dp-input-border)"),background:isActive?cfg.color+"18":"transparent",color:isActive?cfg.color:"var(--dp-text-secondary)",fontSize:11,fontWeight:isActive?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:5}}><CatIcon size={13} strokeWidth={2.2}/>{cfg.label}{isActive&&<Check size={11} strokeWidth={3}/>}</button>);})}</div>)}</div>
          <input ref={icalFileRef} type="file" accept=".ics" style={{display:"none"}} onChange={handleIcalFileChange} />

          {/* ── Overdue Tasks Banner ── */}
          {overdueCount > 0 && (
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"50ms",marginBottom:14}}>
              <div style={{
                background: isLight
                  ? "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.08))"
                  : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.12))",
                border: isLight
                  ? "1px solid rgba(239,68,68,0.18)"
                  : "1px solid rgba(239,68,68,0.25)",
                borderRadius: 16,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                overflow: "hidden",
              }}>
                {/* Banner header */}
                <div
                  onClick={function () { setOverdueExpanded(!overdueExpanded); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                    cursor: "pointer", userSelect: "none",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.2))",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <AlertCircle size={18} color={BRAND.redSolid} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text-primary)" }}>
                      {overdueCount} overdue task{overdueCount !== 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 1 }}>
                      Tap to review &middot; Rescue to reschedule
                    </div>
                  </div>
                  <GradientButton
                    gradient="danger"
                    size="sm"
                    icon={Rocket}
                    onClick={function (e) { e.stopPropagation(); setRescueOpen(true); }}
                  >
                    Rescue
                  </GradientButton>
                  {overdueExpanded
                    ? <ChevronUp size={16} color={"var(--dp-text-muted)"} strokeWidth={2} />
                    : <ChevronDown size={16} color={"var(--dp-text-muted)"} strokeWidth={2} />
                  }
                </div>

                {/* Expanded list of overdue tasks */}
                {overdueExpanded && (
                  <div style={{
                    padding: "0 14px 12px",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}>
                    {overdueTasks.map(function (task) {
                      return (
                        <div key={task.task_id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", marginBottom: 4,
                          borderRadius: 10,
                          background: isLight ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.06)",
                          border: isLight ? "1px solid rgba(239,68,68,0.08)" : "1px solid rgba(239,68,68,0.1)",
                        }}>
                          <Circle size={14} color={BRAND.redSolid} strokeWidth={2} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              color: "var(--dp-text-primary)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{task.task_title}</div>
                            <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                              {task.dream_title} &middot; {task.days_overdue}d overdue
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: BRAND.redSolid,
                            background: "rgba(239,68,68,0.12)", padding: "2px 7px",
                            borderRadius: 6, whiteSpace: "nowrap",
                          }}>
                            {task.original_date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── View Mode Switcher ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms",marginBottom:14}}>
            <div style={{display:"flex",background:"var(--dp-glass-bg)",borderRadius:14,padding:3,border:"1px solid var(--dp-accent-border)",position:"relative",overflow:"hidden"}}>
              {VIEW_MODES.map(function(mode){
                var isActive=viewMode===mode.key;
                return(
                  <button key={mode.key} aria-label={"Switch to "+mode.label+" view"} onClick={function(){setViewMode(mode.key);}} style={{
                    flex:1,padding:"8px 0",borderRadius:11,border:"none",cursor:"pointer",
                    background:isActive?"rgba(139,92,246,0.2)":"transparent",
                    color:isActive?"var(--dp-accent)":"var(--dp-text-muted)",
                    fontSize:13,fontWeight:isActive?700:500,
                    transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                    fontFamily:"inherit",position:"relative",zIndex:1,
                    boxShadow:isActive?"0 0 12px rgba(139,92,246,0.15)":"none",
                  }}>{mode.label}</button>
                );
              })}
            </div>
          </div>

          {/* ── Schedule Score Widget ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <ScheduleScoreWidget weekStart={weekStartStr} />
          </div>

          {/* ── Color Legend ── */}
          {dreamsList.length > 0 && (
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms",marginBottom:14}}>
              <div style={{
                background:"var(--dp-glass-bg)",
                border:"1px solid var(--dp-accent-border)",
                borderRadius:14,
                padding:legendOpen?"10px 12px":"6px 12px",
                backdropFilter:"blur(16px)",
                WebkitBackdropFilter:"blur(16px)",
                transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
              }}>
                {/* Legend toggle header */}
                <button
                  aria-label={legendOpen ? "Collapse color legend" : "Expand color legend"}
                  onClick={function(){setLegendOpen(!legendOpen);}}
                  style={{
                    display:"flex",alignItems:"center",gap:6,width:"100%",
                    background:"none",border:"none",cursor:"pointer",
                    padding:legendOpen?"0 0 6px":"4px 0",
                    fontFamily:"inherit",
                  }}
                >
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {dreamsList.slice(0, 5).map(function(dream, idx){
                      var entry = dreamColorMap[dream.id];
                      var col = entry ? (isLight ? entry.light : entry.dark) : BRAND.purple;
                      return <div key={dream.id} style={{width:6,height:6,borderRadius:3,background:col}} />;
                    })}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",flex:1,textAlign:"left"}}>
                    Color Legend
                  </span>
                  {legendOpen
                    ? <ChevronUp size={14} color="var(--dp-text-muted)" strokeWidth={2}/>
                    : <ChevronDown size={14} color="var(--dp-text-muted)" strokeWidth={2}/>
                  }
                </button>

                {/* Legend entries — collapsible */}
                {legendOpen && (
                  <div style={{
                    display:"flex",flexWrap:"wrap",gap:6,
                    overflowX:"auto",
                    WebkitOverflowScrolling:"touch",
                    paddingBottom:2,
                  }}>
                    {/* Static type entries */}
                    <div style={{
                      display:"inline-flex",alignItems:"center",gap:5,
                      padding:"4px 10px",borderRadius:20,
                      background:adaptColor(TYPE_COLORS.event, isLight) + "14",
                      border:"1px solid " + adaptColor(TYPE_COLORS.event, isLight) + "30",
                      flexShrink:0,
                    }}>
                      <div style={{width:8,height:8,borderRadius:4,background:adaptColor(TYPE_COLORS.event, isLight),boxShadow:"0 0 6px " + adaptColor(TYPE_COLORS.event, isLight) + "40"}} />
                      <span style={{fontSize:11,fontWeight:600,color:adaptColor(TYPE_COLORS.event, isLight),whiteSpace:"nowrap"}}>Events</span>
                    </div>

                    {/* Dream entries */}
                    {dreamsList.map(function(dream){
                      var entry = dreamColorMap[dream.id];
                      var col = entry ? (isLight ? entry.light : entry.dark) : BRAND.purple;
                      return (
                        <div key={dream.id} style={{
                          display:"inline-flex",alignItems:"center",gap:5,
                          padding:"4px 10px",borderRadius:20,
                          background:col + "14",
                          border:"1px solid " + col + "30",
                          flexShrink:0,
                        }}>
                          <div style={{width:8,height:8,borderRadius:4,background:col,boxShadow:"0 0 6px " + col + "40"}} />
                          <span style={{fontSize:11,fontWeight:600,color:col,whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{dream.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
           *  MONTH VIEW
           * ══════════════════════════════════════════════════════════════ */}
          {viewMode==="month"&&(<>
            {/* ── Month Nav ── */}
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <IconButton icon={ChevronLeft} onClick={prevMonth} label="Previous month" size="sm" />
                <h1 style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",margin:0}}>{MONTHS[viewM]} {viewY}</h1>
                <IconButton icon={ChevronRight} onClick={nextMonth} label="Next month" size="sm" />
              </div>
            </div>

            {/* ── Calendar Grid ── */}
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
              <GlassCard padding={12} mb={16}>
                {/* Day headers */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                  {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:600,color:"var(--dp-text-muted)",padding:"4px 0"}}>{d}</div>)}
                </div>
                {/* Date cells + multi-day bars per week row */}
                {(function(){
                  var numRows = Math.ceil(cells.length / 7);
                  var rows = [];
                  for (var ri = 0; ri < numRows; ri++) {
                    var rowCells = cells.slice(ri * 7, ri * 7 + 7);
                    while (rowCells.length < 7) rowCells.push(null);
                    rows.push(
                      <div key={"row-" + ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                        {rowCells.map(function(d, ci){
                          if(d===null)return <div key={"e"+ri+"-"+ci}/>;
                          var k=getKey(viewY,viewM,d);
                          var singleDayEvts=(events[k]||[]).filter(function(ev){return !ev.isMultiDay;});
                          var cellDateStr=viewY+"-"+String(viewM+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
                          var isDropTarget=drag.isDragging&&drag.targetCell&&drag.targetCell.date===cellDateStr;
                          var cellDate=new Date(viewY,viewM,d);var cellDow=cellDate.getDay();cellDow=cellDow===0?6:cellDow-1;
                          var hasFocusBlock=focusBlocks.some(function(fb){return fb.day_of_week===cellDow;});
                          var cellFreeMins=showFreeSlots?(monthFreeMap[cellDateStr]||0):0;
                          var hasMuchFree=cellFreeMins>=180;var hasSomeFree=cellFreeMins>=60;
                          return(
                            <button key={d} role="button" data-date={cellDateStr} aria-label={new Date(viewY,viewM,d).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})} onClick={function(){setSelDay(d);}} onMouseEnter={showFreeSlots&&cellFreeMins>0?function(){setFreeSlotsHover({dateStr:cellDateStr,freeHours:Math.round(cellFreeMins/60*10)/10});}:undefined} onMouseLeave={showFreeSlots?function(){setFreeSlotsHover(null);}:undefined} style={{
                              position:"relative",aspectRatio:"1",borderRadius:12,border:"none",cursor:"pointer",
                              background:isDropTarget?"rgba(139,92,246,0.18)":isSel(d)?"rgba(139,92,246,0.2)":isToday(d)?"rgba(93,229,168,0.08)":hasMuchFree?"rgba(34,197,94,0.06)":"transparent",
                              outline:isDropTarget?"2px solid rgba(139,92,246,0.5)":isSel(d)?"2px solid rgba(139,92,246,0.4)":isToday(d)?"1px solid rgba(93,229,168,0.15)":"none",
                              boxShadow:hasMuchFree?"0 0 12px rgba(34,197,94,0.2),inset 0 0 8px rgba(34,197,94,0.08)":hasSomeFree?"0 0 6px rgba(34,197,94,0.12)":"none",
                              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                              transition:"all 0.15s",fontFamily:"inherit",
                            }}
                              className="dp-gh">
                              {hasFocusBlock&&<Shield size={8} color={BRAND.purple} strokeWidth={2.5} style={{position:"absolute",top:3,right:3,opacity:0.7}}/>}
                              <span style={{fontSize:14,fontWeight:isToday(d)||isSel(d)?700:400,color:isSel(d)?"var(--dp-accent)":isToday(d)?"var(--dp-success)":"var(--dp-text-primary)"}}>{d}</span>
                              {singleDayEvts.length>0&&(
                                <div style={{display:"flex",gap:2}}>
                                  {singleDayEvts.slice(0,3).map(function(evt,j){
                                    var dotHandlers=(!evt.isTask)?drag.dragHandlers(evt.id):{};
                                    return <div key={j} {...dotHandlers} style={Object.assign({},{width:4,height:4,borderRadius:2,background:evt.color,cursor:evt.isTask?"default":"grab"},dotHandlers.style||{})}/>;
                                  })}
                                </div>
                              )}
                              {/* Habit completion dots */}
                              {(function(){
                                var hc=habitCompletions[cellDateStr];
                                if(!hc||hc.length===0)return null;
                                return(
                                  <div style={{display:"flex",gap:1,marginTop:1}}>
                                    {hc.slice(0,4).map(function(h,hi){
                                      return <div key={hi} style={{width:3,height:3,borderRadius:"50%",background:h.color,opacity:0.85}}/>;
                                    })}
                                  </div>
                                );
                              })()}
                            </button>
                          );
                        })}
                      </div>
                    );
                    // Multi-day bars for this row
                    var rowBars = barsByRow[ri] || [];
                    if (rowBars.length > 0) {
                      rows.push(
                        <div key={"bars-" + ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginTop:2,marginBottom:2}}>
                          {rowBars.map(function(bar){
                            return renderMultiDayBar(bar.evt, bar.colStart, bar.colSpan, function(){
                              var sd = new Date(bar.evt.startDate);
                              setSelDay(sd.getMonth() === viewM && sd.getFullYear() === viewY ? sd.getDate() : 1);
                            });
                          })}
                        </div>
                      );
                    }
                  }
                  return rows;
                })()}
              </GlassCard>
            </div>

            {/* ── Events Section ── */}
            {isLoading?(
              /* ── LOADING SKELETONS ── */
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms",display:"flex",flexDirection:"column",gap:10}}>
                <SkeletonCard height={64} />
                <SkeletonCard height={64} />
                <SkeletonCard height={64} />
              </div>
            ):selDay===null?(
              /* ── DEFAULT: Daily Summary + Today + Tomorrow ── */
              <>
                {/* ── Daily Summary Card ── */}
                {dailySummary&&(<div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"100ms",marginBottom:12}}><GlassCard padding="16px 18px" style={{border:"1px solid var(--dp-accent-border)",background:"linear-gradient(135deg, var(--dp-accent-soft) 0%, var(--dp-glass-bg) 100%)"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:summaryExpanded?12:0}}><div style={{display:"flex",alignItems:"center",gap:8,flex:1}}><div style={{width:32,height:32,borderRadius:10,background:"var(--dp-accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--dp-accent-border)"}}><Sparkles size={16} color="var(--dp-accent)" strokeWidth={2}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",lineHeight:1.3}}>{dailySummary.greeting}</div><div style={{fontSize:12,color:"var(--dp-text-secondary)",marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>{dailySummary.task_count>0&&(<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Target size={11} color="var(--dp-text-muted)" strokeWidth={2}/>{dailySummary.task_count} task{dailySummary.task_count!==1?"s":""}</span>)}{dailySummary.event_count>0&&(<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Calendar size={11} color="var(--dp-text-muted)" strokeWidth={2}/>{dailySummary.event_count} event{dailySummary.event_count!==1?"s":""}</span>)}{dailySummary.focus_block_count>0&&(<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Shield size={11} color="var(--dp-text-muted)" strokeWidth={2}/>{dailySummary.focus_block_count} focus</span>)}{dailySummary.overdue_count>0&&(<span style={{display:"inline-flex",alignItems:"center",gap:3,color:BRAND.red}}><AlertTriangle size={11} strokeWidth={2}/>{dailySummary.overdue_count} overdue</span>)}</div></div></div><button aria-label={summaryExpanded?"Collapse daily summary":"Expand daily summary"} onClick={function(){setSummaryExpanded(!summaryExpanded);}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-accent)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>{summaryExpanded?"Less":"View"}{summaryExpanded?<ChevronUp size={12} strokeWidth={2}/>:<ChevronDown size={12} strokeWidth={2}/>}</button></div>{summaryExpanded&&dailySummary.tasks&&dailySummary.tasks.length>0&&(<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:"var(--dp-text-secondary)",marginBottom:2}}>Today's Tasks</div>{dailySummary.tasks.map(function(task){var isDone=task.status==="completed";return(<div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,background:isDone?"var(--dp-glass-bg)":"transparent",opacity:isDone?0.6:1}}>{isDone?<CheckCircle size={14} color={BRAND.green} strokeWidth={2}/>:<Circle size={14} color="var(--dp-text-muted)" strokeWidth={2}/>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:isDone?"var(--dp-text-muted)":"var(--dp-text)",textDecoration:isDone?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div></div>{task.scheduled_time&&(<span style={{fontSize:11,color:"var(--dp-text-muted)",whiteSpace:"nowrap"}}>{task.scheduled_time}</span>)}</div>);})}</div>)}{summaryExpanded&&dailySummary.overdue_tasks&&dailySummary.overdue_tasks.length>0&&(<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:BRAND.red,marginBottom:2}}>Overdue</div>{dailySummary.overdue_tasks.map(function(task){return(<div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8}}><AlertTriangle size={14} color={BRAND.red} strokeWidth={2}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div><div style={{fontSize:10,color:"var(--dp-text-muted)"}}>{task.dream_title} &middot; due {task.scheduled_date}</div></div></div>);})}</div>)}{summaryExpanded&&dailySummary.motivational_message&&(<div style={{padding:"8px 12px",borderRadius:8,background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)"}}><div style={{fontSize:12,fontStyle:"italic",color:"var(--dp-accent)",lineHeight:1.4,textAlign:"center"}}>{dailySummary.motivational_message}</div></div>)}</GlassCard></div>)}

                {[{label:"Today",evts:todayEvents,key:todayKey,dayNum:TODAY.d},{label:"Tomorrow",evts:tomorrowEvents,key:tomorrowKey,dayNum:tomorrowD.getDate()}].map(({label,evts,key,dayNum},si)=>(
                  <div key={label}>
                    <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${160+si*120}ms`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,marginTop:si>0?8:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:4,background:label==="Today"?BRAND.green:BRAND.purpleLight}}/>
                          <h2 style={{fontSize:15,fontWeight:700,color:"var(--dp-text)",margin:0}}>{label}</h2>
                          <span style={{fontSize:12,color:"var(--dp-text-muted)"}}>{new Date(label==="Today"?Date.now():Date.now()+86400000).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                        </div>
                        <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{evts.length} item{evts.length!==1?"s":""}</span>
                      </div>
                    </div>
                    {evts.length===0?(
                      <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${200+si*120}ms`}}>
                        <GlassCard padding="16px 20px" mb={8} style={{textAlign:"center"}}>
                          <span style={{fontSize:13,color:"var(--dp-text-muted)"}}>No tasks scheduled</span>
                        </GlassCard>
                      </div>
                    ):(
                      evts.map((evt,i)=>(
                        <div key={evt.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${200+si*120+i*50}ms`}}>
                          {renderEventCard(evt,key)}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </>
            ):(
              /* ── SELECTED DAY VIEW ── */
              <>
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <h2 style={{fontSize:15,fontWeight:700,color:"var(--dp-text)",margin:0}}>
                        {isToday(selDay)?"Today":new Date(viewY,viewM,selDay).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                      </h2>
                      {selDay!==null&&<button aria-label="Clear day selection" onClick={()=>setSelDay(null)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-tertiary)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
                    </div>
                    <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{selEvents.length} item{selEvents.length!==1?"s":""}</span>
                  </div>
                </div>
                {selEvents.length===0?(
                  <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
                    <GlassCard padding={32} style={{textAlign:"center"}}>
                      <Calendar size={32} color={"var(--dp-text-muted)"} strokeWidth={1.5} style={{margin:"0 auto 10px"}}/>
                      <div style={{fontSize:14,color:"var(--dp-text-secondary)"}}>No tasks for this day</div>
                      <button aria-label="Add task for this day" onClick={()=>{setNewTitle("");setNewCategory("custom");setAddEvt(true);}} style={{marginTop:12,padding:"8px 16px",borderRadius:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}>
                        <Plus size={13} strokeWidth={2}/>Add Task
                      </button>
                    </GlassCard>
                  </div>
                ):(
                  selEvents.map((evt,i)=>(
                    <div key={evt.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${240+i*60}ms`}}>
                      {renderEventCard(evt,selKey)}
                    </div>
                  ))
                )}
              </>
            )}
          </>)}

          {/* ══════════════════════════════════════════════════════════════
           *  WEEK VIEW
           * ══════════════════════════════════════════════════════════════ */}
          {viewMode==="week"&&(function(){
            var weekDays=[];
            for(var wi=0;wi<7;wi++)weekDays.push(addDays(weekStart,wi));
            var nowDate=new Date();
            var nowHour=nowDate.getHours();
            var nowMin=nowDate.getMinutes();
            var weekLabel=weekDays[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})+" - "+weekDays[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
            var ROW_H=56;

            // Collect timed (non-multi-day, non-all-day) events for each day column
            var colEvents=weekDays.map(function(wd){
              var k=getKey(wd.getFullYear(),wd.getMonth(),wd.getDate());
              return (events[k]||[]).filter(function(e){return !!e.time && !e.isMultiDay && !e.allDay;});
            });

            // Collect multi-day / all-day events for the all-day row
            var allDayRowEvents = [];
            var weekSeenIds = {};
            multiDayEvents.forEach(function(evt){
              if (weekSeenIds[evt.id]) return;
              var evtStart = new Date(evt.startDate);
              var evtEnd = new Date(evt.endDate);
              if (evtStart > weekDays[6] || evtEnd < weekDays[0]) return;
              var barStartIdx = 0;
              var barEndIdx = 6;
              for (var di = 0; di < 7; di++) {
                if (sameDay(weekDays[di], evtStart)) barStartIdx = di;
                if (sameDay(weekDays[di], evtEnd)) { barEndIdx = di; break; }
              }
              if (evtStart < weekDays[0]) barStartIdx = 0;
              if (evtEnd > weekDays[6]) barEndIdx = 6;
              weekSeenIds[evt.id] = true;
              allDayRowEvents.push({ evt: evt, startCol: barStartIdx, endCol: barEndIdx });
            });
            // Also collect single-day all-day events
            weekDays.forEach(function(wd, di){
              var k = getKey(wd.getFullYear(), wd.getMonth(), wd.getDate());
              (events[k]||[]).forEach(function(evt){
                if (evt.allDay && !evt.isMultiDay && !weekSeenIds[evt.id]) {
                  weekSeenIds[evt.id] = true;
                  allDayRowEvents.push({ evt: evt, startCol: di, endCol: di });
                }
              });
            });

            return(<>
              {/* Week Nav */}
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <IconButton icon={ChevronLeft} onClick={prevWeek} label="Previous week" size="sm" />
                  <h1 style={{fontSize:16,fontWeight:700,color:"var(--dp-text)",margin:0}}>{weekLabel}</h1>
                  <IconButton icon={ChevronRight} onClick={nextWeek} label="Next week" size="sm" />
                  <button aria-label={showFreeSlots?"Hide free slots":"Show free slots"} onClick={function(){setShowFreeSlots(!showFreeSlots);}} style={{marginLeft:6,width:32,height:32,borderRadius:10,border:"1px solid "+(showFreeSlots?"rgba(34,197,94,0.4)":"var(--dp-accent-border)"),background:showFreeSlots?"rgba(34,197,94,0.1)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}><Clock size={15} color={showFreeSlots?BRAND.greenAction:"var(--dp-text-muted)"} strokeWidth={2}/></button>
                </div>
              </div>

              {/* Mini Calendar for quick week navigation */}
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"40ms",display:"flex",justifyContent:"center",marginBottom:14}}>
                <MiniCalendar
                  selectedDate={weekStart}
                  onDateSelect={function(date){
                    setWeekStart(getMonday(date));
                    setViewY(date.getFullYear());
                    setViewM(date.getMonth());
                  }}
                  events={events}
                />
              </div>

              {isWeekLoading?(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms",display:"flex",flexDirection:"column",gap:10}}>
                  <SkeletonCard height={200} />
                  <SkeletonCard height={200} />
                </div>
              ):(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
                  <GlassCard padding={0} mb={16} style={{overflow:"hidden"}}>
                    {/* Day column headers */}
                    <div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",borderBottom:"1px solid var(--dp-accent-border)"}}>
                      <div style={{padding:"8px 4px",textAlign:"center",fontSize:10,color:"var(--dp-text-muted)"}}/>
                      {weekDays.map(function(wd,ci){
                        var isDayToday=sameDay(wd,nowDate);
                        return(
                          <div key={ci} style={{padding:"8px 2px",textAlign:"center",borderLeft:"1px solid var(--dp-accent-border)"}}>
                            <div style={{fontSize:10,fontWeight:600,color:isDayToday?"var(--dp-success)":"var(--dp-text-muted)",textTransform:"uppercase"}}>{DAYS[ci]}</div>
                            <div style={{fontSize:16,fontWeight:isDayToday?700:500,color:isDayToday?"var(--dp-success)":"var(--dp-text-primary)",marginTop:2,width:28,height:28,borderRadius:14,display:"inline-flex",alignItems:"center",justifyContent:"center",background:isDayToday?"rgba(93,229,168,0.12)":"transparent"}}>{wd.getDate()}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* All-day / multi-day row */}
                    {allDayRowEvents.length > 0 && (
                      <div style={{borderBottom:"1px solid var(--dp-accent-border)",padding:"4px 0"}}>
                        <div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:2,alignItems:"center"}}>
                          <div style={{padding:"0 4px",fontSize:9,color:"var(--dp-text-muted)",textAlign:"right",fontWeight:600}}>ALL DAY</div>
                          {allDayRowEvents.map(function(bar){
                            var colStart = bar.startCol + 2;
                            var colSpan = bar.endCol - bar.startCol + 1;
                            return (
                              <div
                                key={bar.evt.id + "-weekbar"}
                                onClick={function(){
                                  var sd = new Date(bar.evt.startDate);
                                  setViewY(sd.getFullYear()); setViewM(sd.getMonth()); setSelDay(sd.getDate());
                                }}
                                style={{
                                  gridColumn: colStart + " / span " + colSpan,
                                  height: 22,
                                  borderRadius: 11,
                                  background: bar.evt.color + "33",
                                  borderLeft: "3px solid " + bar.evt.color,
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0 6px",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  marginBottom: 2,
                                }}
                                className="dp-multi-bar"
                              >
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: adaptColor(bar.evt.color, isLight),
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>{bar.evt.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Habit completion row in week view */}
                    {habitsList.length>0&&(<div style={{borderBottom:"1px solid var(--dp-accent-border)",padding:"4px 0"}}><div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:0,alignItems:"center"}}><div style={{padding:"0 4px",fontSize:9,color:"#F59E0B",textAlign:"right",fontWeight:600}}>HABITS</div>{weekDays.map(function(wd,ci){var dayStr=formatDateISO(wd);var dayHabits=habitCompletions[dayStr]||[];return(<div key={"hrow-"+ci} style={{borderLeft:"1px solid var(--dp-accent-border)",padding:"2px 3px",display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center",minHeight:20}}>{dayHabits.slice(0,5).map(function(h,hi){var done=h.count>=h.target;return(<div key={hi} title={h.habit_name} style={{width:14,height:14,borderRadius:4,background:done?(h.color+"33"):"transparent",border:"1.5px solid "+h.color,display:"flex",alignItems:"center",justifyContent:"center"}}>{done&&<Check size={8} color={h.color} strokeWidth={3}/>}</div>);})}</div>);})}</div></div>)}

                    {/* Scrollable time grid */}
                    <div className="dp-week-scroll" style={{maxHeight:420,overflowY:"auto",overflowX:"hidden",position:"relative"}}>
                      {/* Current time indicator */}
                      {weekDays.some(function(wd){return sameDay(wd,nowDate);})&&nowHour>=6&&nowHour<=23&&(function(){
                        var topPx=(nowHour-6)*ROW_H+(nowMin/60)*ROW_H;
                        var dayIdx=weekDays.findIndex(function(wd){return sameDay(wd,nowDate);});
                        return(
                          <div style={{position:"absolute",top:topPx,left:48,right:0,zIndex:5,pointerEvents:"none",display:"flex",alignItems:"center"}}>
                            <div style={{width:8,height:8,borderRadius:4,background:"#EF4444",marginLeft:dayIdx>0?("calc("+(dayIdx*100/7)+"% - 4px)"):"0",flexShrink:0}}/>
                            <div style={{flex:1,height:2,background:"#EF4444",boxShadow:"0 0 8px rgba(239,68,68,0.5)"}}/>
                          </div>
                        );
                      })()}

                      {/* Buffer zone overlays */}
                      {bufferMinutes>0&&colEvents.map(function(dE,ci){return dE.map(function(evt){var t=parseTime24(evt.time);if(!t)return null;var sM=t.h*60+t.m;var eM=sM+(minEventDuration||30);if(evt.rawEndTime){var eP=evt.rawEndTime.split("T");if(eP.length>1){var p2=eP[1].substring(0,5).split(":");if(p2.length===2)eM=parseInt(p2[0],10)*60+parseInt(p2[1],10);}}var gH=6;var bS=Math.max(sM-bufferMinutes,gH*60);var bE=sM;var aS=eM;var aE=Math.min(eM+bufferMinutes,24*60);var xL="calc(48px + "+(ci*100/7)+"%)";var xW="calc("+(100/7)+"%)";var bZ={position:"absolute",zIndex:2,pointerEvents:"none",borderLeft:"2px dashed rgba(168,85,247,0.25)",background:"repeating-linear-gradient(135deg,rgba(168,85,247,0.10),rgba(168,85,247,0.10) 3px,rgba(168,85,247,0.03) 3px,rgba(168,85,247,0.03) 6px)"};var r=[];if(bE>bS)r.push(<div key={evt.id+"-bb"} style={Object.assign({},bZ,{top:((bS-gH*60)/60)*ROW_H,left:xL,width:xW,height:Math.max(((bE-bS)/60)*ROW_H,2)})}/>);if(aE>aS)r.push(<div key={evt.id+"-ba"} style={Object.assign({},bZ,{top:((aS-gH*60)/60)*ROW_H,left:xL,width:xW,height:Math.max(((aE-aS)/60)*ROW_H,2)})}/>);return r;});})}

                      {/* Hour rows */}
                      {HOURS.map(function(hour){
                        return(
                          <div key={hour} style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",minHeight:ROW_H,borderBottom:"1px solid var(--dp-accent-border)"}}>
                            <div style={{padding:"4px 6px 0",fontSize:11,color:"var(--dp-text-muted)",textAlign:"right",fontWeight:500,lineHeight:1}}>{formatHour(hour)}</div>
                            {weekDays.map(function(wd,ci){
                              var dayEvts=colEvents[ci].filter(function(e){
                                var t=parseTime24(e.time);
                                return t&&t.h===hour;
                              });
                              var isDayToday=sameDay(wd,nowDate);
                              var weekCellDateStr=formatDateISO(wd);
                              var weekCellHourStr=String(hour).padStart(2,"0");
                              var isWeekDropTarget=drag.isDragging&&drag.targetCell&&drag.targetCell.date===weekCellDateStr&&drag.targetCell.hour===weekCellHourStr;
                              var wdDow=wd.getDay();wdDow=wdDow===0?6:wdDow-1;
                              var isFocusCell=focusBlocks.some(function(fb){
                                if(fb.day_of_week!==wdDow)return false;
                                var fbStartH=parseInt(fb.start_time.split(":")[0],10);
                                var fbEndH=parseInt(fb.end_time.split(":")[0],10);
                                var fbEndM=parseInt(fb.end_time.split(":")[1],10);
                                if(fbEndM>0)fbEndH=fbEndH+1;
                                return hour>=fbStartH&&hour<fbEndH;
                              });
                              var freeSlotInfo=null;
                              if(showFreeSlots){var dayFD=freeSlotsMap[weekCellDateStr];if(dayFD&&dayFD.free_slots){for(var fsi=0;fsi<dayFD.free_slots.length;fsi++){var fsl=dayFD.free_slots[fsi];var fslSH=parseInt((fsl.start_time.split("T")[1]||"0").split(":")[0],10);var fslEH=parseInt((fsl.end_time.split("T")[1]||"0").split(":")[0],10);var fslEM=parseInt((fsl.end_time.split("T")[1]||"0:0").split(":")[1],10);if(fslEM>0)fslEH=fslEH;if(hour>=fslSH&&hour<(fslEM>0?fslEH+1:fslEH)){freeSlotInfo=fsl;break;}}}}
                              var isFreeCell=freeSlotInfo!==null;
                              var isEnergyPeak=hasEnergyProfile&&!!energyPeakHours[hour];
                              var isEnergyLow=hasEnergyProfile&&!!energyLowHours[hour];
                              return(
                                <div key={ci} data-date={weekCellDateStr} data-hour={weekCellHourStr} onClick={function(){
                                  var dateStr=formatDateISO(wd);
                                  var ampm=hour<12?"AM":"PM";
                                  var h12=hour===0?12:hour>12?hour-12:hour;
                                  setNewTime(h12+":00 "+ampm);
                                  setViewY(wd.getFullYear());setViewM(wd.getMonth());setSelDay(wd.getDate());
                                  setNewTitle("");setNewCategory("custom");setAddEvt(true);
                                }} style={{
                                  borderLeft:"1px solid var(--dp-accent-border)",
                                  padding:"2px 2px",position:"relative",cursor:"pointer",
                                  minHeight:ROW_H,
                                  background:isFreeCell&&dayEvts.length===0?"rgba(34,197,94,0.08)":isFocusCell?"repeating-linear-gradient(135deg,rgba(139,92,246,0.06),rgba(139,92,246,0.06) 4px,rgba(139,92,246,0.02) 4px,rgba(139,92,246,0.02) 8px)":isWeekDropTarget?"rgba(139,92,246,0.12)":isEnergyPeak?"rgba(34,197,94,0.06)":isEnergyLow?"rgba(245,158,11,0.06)":isDayToday?"rgba(93,229,168,0.02)":"transparent",
                                  transition:"background 0.15s",
                                  outline:isFreeCell&&dayEvts.length===0?"1px dashed rgba(34,197,94,0.35)":"none",outlineOffset:"-1px",
                                }} className={"dp-week-cell"+(isFocusCell?" dp-focus-cell":"")+(isFreeCell?" dp-free-cell":"")+(isEnergyPeak?" dp-energy-peak":"")+(isEnergyLow?" dp-energy-low":"")}>
                                  {isFreeCell&&dayEvts.length===0&&(<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:1}}><span style={{fontSize:9,fontWeight:700,color:"rgba(34,197,94,0.7)",background:"rgba(34,197,94,0.06)",padding:"2px 6px",borderRadius:4}}>{freeSlotInfo.duration_mins>=60?Math.floor(freeSlotInfo.duration_mins/60)+"h"+(freeSlotInfo.duration_mins%60>0?" "+freeSlotInfo.duration_mins%60+"m":""):freeSlotInfo.duration_mins+" min"} free</span></div>)}
                                  {isFocusCell&&dayEvts.length===0&&!isFreeCell&&(
                                    <div style={{position:"absolute",top:2,left:2,display:"flex",alignItems:"center",gap:3,opacity:0.5,pointerEvents:"none"}}>
                                      <Shield size={9} color={BRAND.purple} strokeWidth={2.5}/>
                                      <span style={{fontSize:8,fontWeight:700,color:BRAND.purple,textTransform:"uppercase",letterSpacing:"0.5px"}}>Focus</span>
                                    </div>
                                  )}
                                  {(function(){var hasOverlap=dayEvts.length>1;return dayEvts.map(function(evt,ei){
                                    var t=parseTime24(evt.time);
                                    var topOffset=t?(t.m/60)*100:0;
                                    var evtKey=getKey(wd.getFullYear(),wd.getMonth(),wd.getDate());
                                    var weekEvtDrag=(!evt.isTask)?drag.dragHandlers(evt.id):{};
                                    var overlapWidth=hasOverlap?("calc("+(100/dayEvts.length)+"% - 2px)"):"100%";
                                    var overlapLeft=hasOverlap?(ei*(100/dayEvts.length)+"%"):"0";
                                    return(
                                      <div key={evt.id} {...weekEvtDrag} onClick={function(e){e.stopPropagation();}} style={Object.assign({},{
                                        position:hasOverlap?"absolute":"relative",top:topOffset+"%",
                                        left:hasOverlap?overlapLeft:undefined,
                                        width:hasOverlap?overlapWidth:undefined,
                                        background:evt.color+"18",
                                        borderLeft:"3px solid "+evt.color,
                                        borderRadius:6,padding:"3px 5px",marginBottom:hasOverlap?0:2,
                                        cursor:evt.isTask?"pointer":"grab",overflow:"hidden",
                                        backdropFilter:"blur(8px)",
                                        boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
                                        transition:"transform 0.15s, box-shadow 0.15s",
                                        zIndex:ei+1,
                                      },weekEvtDrag.style||{})} className="dp-week-evt">
                                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                                          {hasOverlap&&<AlertTriangle size={9} color="#F59E0B" strokeWidth={2.5} style={{flexShrink:0}}/>}
                                          {!evt.isTask&&(function(){var wCat=CATEGORY_CONFIG[evt.category]||CATEGORY_CONFIG.custom;var WCatIcon=wCat.icon;return <WCatIcon size={9} color={wCat.color} strokeWidth={2.5} style={{flexShrink:0}}/>;})()}
                                          <div style={{fontSize:11,fontWeight:600,color:adaptColor(evt.color,isLight),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{evt.title}</div>
                                        </div>
                                        <div style={{fontSize:9,color:"var(--dp-text-muted)",marginTop:1,display:"flex",alignItems:"center",gap:3}}>{travelMode&&evt.rawStartTime?formatTimeInTz(evt.rawStartTime,displayTz):evt.time}{evt.eventTimezone&&evt.eventTimezone!==displayTz?<Globe size={7} color="#3B82F6" strokeWidth={2.5} style={{flexShrink:0}}/>:null}{(function(){var rl=getEventReminderLabel(evt);if(!rl)return null;return(<span style={{display:"inline-flex",alignItems:"center",gap:2}}><Bell size={7} strokeWidth={2.5} color="#D97706"/></span>);})()}</div>
                                      </div>
                                    );
                                  });})()}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              )}
            </>);
          })()}

          {/* ══════════════════════════════════════════════════════════════
           *  AGENDA VIEW
           * ══════════════════════════════════════════════════════════════ */}
          {viewMode==="agenda"&&(function(){
            var todayDate=new Date();todayDate.setHours(0,0,0,0);

            // Collect all events into a flat sorted list (deduplicate multi-day)
            var allItems=[];
            var agendaSeenMultiDay = {};
            Object.keys(events).forEach(function(k){
              (events[k]||[]).forEach(function(evt){
                if(!evt.date)return;
                var d=new Date(evt.date);
                if(isNaN(d.getTime()))return;
                if(d<todayDate)return; // Only future + today
                // Multi-day events: show only once (on start date or today)
                if (evt.isMultiDay) {
                  if (agendaSeenMultiDay[evt.id]) return;
                  agendaSeenMultiDay[evt.id] = true;
                  var evtStartD = new Date(evt.startDate);
                  if (evtStartD < todayDate) d = todayDate;
                  else d = evtStartD;
                }
                allItems.push({evt:evt,date:d,key:k});
              });
            });
            allItems.sort(function(a,b){
              var dd=a.date.getTime()-b.date.getTime();
              if(dd!==0)return dd;
              return (a.evt.time||"").localeCompare(b.evt.time||"");
            });

            // Group by date
            var groups=[];
            var lastDateStr="";
            allItems.forEach(function(item){
              var ds=formatDateISO(item.date);
              if(ds!==lastDateStr){
                groups.push({dateStr:ds,date:item.date,items:[]});
                lastDateStr=ds;
              }
              groups[groups.length-1].items.push(item);
            });

            // Limit to paginated amount
            var visibleGroups=groups.slice(0,10*agendaPage);
            var hasMore=groups.length>visibleGroups.length;

            return(<>
              {/* Agenda header */}
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <h1 style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",margin:0}}>Upcoming</h1>
                  <span style={{fontSize:12,color:"var(--dp-text-muted)"}}>{allItems.length} event{allItems.length!==1?"s":""}</span>
                </div>
              </div>

              {/* Mini Calendar for quick agenda navigation */}
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"40ms",display:"flex",justifyContent:"center",marginBottom:14}}>
                <MiniCalendar
                  selectedDate={agendaSelDate}
                  onDateSelect={function(date){
                    setAgendaSelDate(date);
                    setViewY(date.getFullYear());
                    setViewM(date.getMonth());
                    /* Scroll to the matching date group in agenda */
                    var isoKey=formatDateISO(date);
                    setTimeout(function(){
                      var el=document.getElementById("agenda-group-"+isoKey);
                      if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
                    },80);
                  }}
                  events={events}
                />
              </div>

              {isAgendaLoading?(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms",display:"flex",flexDirection:"column",gap:10}}>
                  <SkeletonCard height={64} />
                  <SkeletonCard height={64} />
                  <SkeletonCard height={64} />
                </div>
              ):visibleGroups.length===0?(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
                  <GlassCard padding={40} style={{textAlign:"center"}}>
                    <Calendar size={36} color={"var(--dp-text-muted)"} strokeWidth={1.5} style={{margin:"0 auto 12px"}}/>
                    <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:4}}>No upcoming events</div>
                    <div style={{fontSize:13,color:"var(--dp-text-muted)"}}>Your schedule is clear. Add a task to get started.</div>
                    <button aria-label="Add task" onClick={function(){setNewTitle("");setNewCategory("custom");setAddEvt(true);}} style={{marginTop:16,padding:"10px 20px",borderRadius:12,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
                      <Plus size={14} strokeWidth={2}/>Add Task
                    </button>
                  </GlassCard>
                </div>
              ):(
                <>
                  {visibleGroups.map(function(group,gi){
                    var isGroupToday=sameDay(group.date,todayDate);
                    var dateLabel=isGroupToday?"Today":group.date.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
                    return(
                      <div key={group.dateStr} id={"agenda-group-"+group.dateStr} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:(80+gi*40)+"ms"}}>
                        {/* Date header */}
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,marginTop:gi>0?14:0}}>
                          <div style={{width:8,height:8,borderRadius:4,background:isGroupToday?BRAND.green:BRAND.purpleLight,boxShadow:isGroupToday?"0 0 8px rgba(93,229,168,0.4)":"none"}}/>
                          <h2 style={{fontSize:14,fontWeight:700,color:isGroupToday?"var(--dp-success)":"var(--dp-text)",margin:0}}>{dateLabel}</h2>
                          <div style={{flex:1,height:1,background:"var(--dp-accent-border)"}}/>
                          <span style={{fontSize:11,color:"var(--dp-text-muted)"}}>{group.items.length} item{group.items.length!==1?"s":""}</span>
                        </div>

                        {/* Habits section for this agenda date */}
                        {(function(){var dh=habitCompletions[group.dateStr];if(!dh||dh.length===0)return null;return(<div style={{marginBottom:8,padding:"6px 10px",borderRadius:10,background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.15)"}}><div style={{fontSize:10,fontWeight:700,color:"#F59E0B",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><Repeat size={10} color="#F59E0B" strokeWidth={2.5}/>Habits</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{dh.map(function(h,hi){var done=h.count>=h.target;return(<div key={hi} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 6px",borderRadius:6,background:done?"rgba(34,197,94,0.08)":"transparent",border:"1px solid "+(done?"rgba(34,197,94,0.2)":h.color+"33")}}><div style={{width:8,height:8,borderRadius:2,background:h.color}}/><span style={{fontSize:11,fontWeight:500,color:done?"var(--dp-success)":"var(--dp-text-secondary)",textDecoration:done?"line-through":"none"}}>{h.habit_name}</span>{done&&<CheckCircle size={10} color={BRAND.greenSolid} strokeWidth={2.5}/>}</div>);})}</div></div>);})()}
                        {/* Events for this date */}
                        {group.items.map(function(item,ei){
                          var multiDayLabel = null;
                          if (item.evt.isMultiDay) {
                            var evtStartD = new Date(item.evt.startDate);
                            var dayNum = Math.round((item.date - evtStartD) / 86400000) + 1;
                            if (dayNum < 1) dayNum = 1;
                            multiDayLabel = "Day " + dayNum + " of " + item.evt.spanDays;
                          }
                          var nextItem = ei < group.items.length - 1 ? group.items[ei + 1] : null;
                          var showChainLink = (item.evt.isChain || item.evt.chainNextDelayDays != null) && nextItem && (nextItem.evt.isChain || nextItem.evt.chainNextDelayDays != null);
                          return(
                            <div key={item.evt.id}>
                              <div style={{marginBottom:showChainLink?0:6,borderLeft:isGroupToday?"2px solid rgba(93,229,168,0.3)":"2px solid transparent",paddingLeft:isGroupToday?8:10,transition:"all 0.2s"}}>
                                {multiDayLabel && (
                                  <div style={{fontSize:10,fontWeight:700,color:"var(--dp-accent)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2,paddingLeft:4}}>{multiDayLabel}</div>
                                )}
                                {renderEventCard(item.evt,item.key)}
                              </div>
                              {showChainLink && (
                                <div style={{display:"flex",alignItems:"center",paddingLeft:isGroupToday?30:32,height:20}}>
                                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                    <div style={{width:6,height:6,borderRadius:3,background:"var(--dp-accent)"}} />
                                    <div style={{width:2,height:4,background:"var(--dp-accent)",opacity:0.4}} />
                                    <div style={{width:6,height:6,borderRadius:3,background:"var(--dp-accent)"}} />
                                  </div>
                                  <span style={{fontSize:10,color:"var(--dp-text-muted)",marginLeft:6,fontStyle:"italic"}}>chain</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {hasMore&&(
                    <div style={{textAlign:"center",marginTop:16}}>
                      <button onClick={function(){setAgendaPage(agendaPage+1);}} style={{
                        padding:"10px 24px",borderRadius:12,border:"1px solid var(--dp-accent-border)",
                        background:"var(--dp-glass-bg)",color:"var(--dp-accent)",fontSize:13,fontWeight:600,
                        cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
                        backdropFilter:"blur(12px)",
                      }} className="dp-gh">Load more</button>
                    </div>
                  )}
                </>
              )}
            </>);
          })()}

          {/* ══════════════════════════════════════════════════════════════
           *  HEATMAP VIEW
           * ══════════════════════════════════════════════════════════════ */}
          {viewMode==="heatmap"&&(function(){
            var heatmapData = heatmapQuery.data || [];
            var isHeatmapLoading = heatmapQuery.isLoading;
            var totalTasks = 0; var totalCompleted = 0; var totalFocus = 0; var activeDays = 0;
            for (var i = 0; i < heatmapData.length; i++) {
              var day = heatmapData[i];
              totalTasks += day.tasks_total || 0;
              totalCompleted += day.tasks_completed || 0;
              totalFocus += day.focus_minutes || 0;
              if (day.productivity_score > 0) activeDays++;
            }
            var avgScore = heatmapData.length > 0
              ? heatmapData.reduce(function (s, d) { return s + (d.productivity_score || 0); }, 0) / heatmapData.length
              : 0;
            var focusHours = Math.floor(totalFocus / 60);
            var focusMins = totalFocus % 60;
            return (<>
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Flame size={18} color={BRAND.purple} strokeWidth={2}/>
                    <h1 style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",margin:0}}>Productivity</h1>
                  </div>
                  <span style={{fontSize:12,color:"var(--dp-text-muted)"}}>Last 90 days</span>
                </div>
              </div>
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"40ms",marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  <GlassCard padding="12px 8px" style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:BRAND.purple,lineHeight:1}}>{Math.round(avgScore*100)}%</div>
                    <div style={{fontSize:10,color:"var(--dp-text-muted)",marginTop:4,fontWeight:500}}>Avg Score</div>
                  </GlassCard>
                  <GlassCard padding="12px 8px" style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:BRAND.green,lineHeight:1}}>{totalCompleted}</div>
                    <div style={{fontSize:10,color:"var(--dp-text-muted)",marginTop:4,fontWeight:500}}>Completed</div>
                  </GlassCard>
                  <GlassCard padding="12px 8px" style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:BRAND.teal,lineHeight:1}}>{focusHours}h{focusMins > 0 ? " "+focusMins+"m" : ""}</div>
                    <div style={{fontSize:10,color:"var(--dp-text-muted)",marginTop:4,fontWeight:500}}>Focus</div>
                  </GlassCard>
                  <GlassCard padding="12px 8px" style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:BRAND.purpleLight,lineHeight:1}}>{activeDays}</div>
                    <div style={{fontSize:10,color:"var(--dp-text-muted)",marginTop:4,fontWeight:500}}>Active Days</div>
                  </GlassCard>
                </div>
              </div>
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
                {isHeatmapLoading ? (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <SkeletonCard height={140} />
                  </div>
                ) : (
                  <CalendarHeatmap
                    data={heatmapData}
                    startDate={heatmapStart}
                    endDate={heatmapEnd}
                    isLight={isLight}
                    onDayClick={function(dateStr){
                      var parts = dateStr.split("-");
                      var y = parseInt(parts[0], 10);
                      var m = parseInt(parts[1], 10) - 1;
                      var d = parseInt(parts[2], 10);
                      setViewY(y);
                      setViewM(m);
                      setSelDay(d);
                      setViewMode("month");
                    }}
                  />
                )}
              </div>
            </>);
          })()}

        </div>
      </main>

      {/* ═══ TODAY WIDGET (floating mini) ═══ */}
      <TodayWidget variant="mini" />

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ DELETE CONFIRM ═══ */}
      <GlassModal open={!!confirmDel} onClose={()=>setConfirmDel(null)} variant="center" maxWidth={340}>
        <div style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:12,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Trash2 size={18} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
            </div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>Delete Task?</div>
          </div>
          <div style={{fontSize:13,color:"var(--dp-text-primary)",marginBottom:16,lineHeight:1.5}}>
            Are you sure you want to delete "<span style={{color:"var(--dp-text)",fontWeight:500}}>{confirmDel?.title}</span>"? This cannot be undone.
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"11px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button className="dp-gh" onClick={()=>deleteEvent(confirmDel.key,confirmDel.id)} style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"rgba(239,68,68,0.15)",color:"rgba(239,68,68,0.9)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>Delete</button>
          </div>
        </div>
      </GlassModal>

      {/* ═══ RECURRING CHOICE MODAL ═══ */}
      <GlassModal open={!!recurringChoice} onClose={function(){setRecurringChoice(null);}} variant="center" maxWidth={380}><div style={{padding:24}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:36,height:36,borderRadius:12,background:"rgba(139,92,246,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}><Repeat size={18} color="var(--dp-accent)" strokeWidth={2}/></div><div><div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>{recurringChoice && recurringChoice.action === "delete" ? "Delete Recurring Event" : "Edit Recurring Event"}</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>{recurringChoice ? recurringChoice.evt.title : ""}</div></div></div><div style={{fontSize:13,color:"var(--dp-text-secondary)",marginBottom:18,lineHeight:1.5}}>This is a recurring event. How would you like to proceed?</div><div style={{display:"flex",flexDirection:"column",gap:8}}><button aria-label="This occurrence only" className="dp-gh" onClick={function(){if(!recurringChoice)return;var evt=recurringChoice.evt;var occDate=evt.date;if(recurringChoice.action==="delete"){skipOccurrenceMut.mutate({eventId:evt.id,originalDate:occDate});setRecurringChoice(null);}else{setEditOccTitle(evt.title||"");setEditOccTime(evt.rawStartTime||"");setEditOccEndTime(evt.rawEndTime||"");setEditOccurrence({evt:evt,key:recurringChoice.key,occDate:occDate});setRecurringChoice(null);}}} style={{padding:"14px 16px",borderRadius:14,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s",textAlign:"left"}}><div style={{width:32,height:32,borderRadius:10,background:"rgba(139,92,246,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><SkipForward size={16} color="var(--dp-accent)" strokeWidth={2}/></div><div><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)"}}>This occurrence only</div><div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:1}}>{recurringChoice && recurringChoice.action === "delete" ? "Skip just this date" : "Modify just this date"}</div></div></button><button aria-label="This and future" className="dp-gh" onClick={function(){if(!recurringChoice)return;var evt=recurringChoice.evt;var occDate=evt.date;if(recurringChoice.action==="delete"){apiPatch(CALENDAR.EVENT_DETAIL(evt.id),{recurrence_rule:Object.assign({},evt.recurrenceRule||{},{"end_date":occDate})}).then(function(){invalidateCalendar();showToast("Future occurrences removed","success");}).catch(function(err){showToast(err.userMessage||err.message||"Failed","error");});}else{showToast("Use This occurrence only to edit a single date","info");}setRecurringChoice(null);}} style={{padding:"14px 16px",borderRadius:14,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s",textAlign:"left"}}><div style={{width:32,height:32,borderRadius:10,background:"rgba(251,191,36,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChevronRight size={16} color="#F59E0B" strokeWidth={2}/></div><div><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)"}}>This and future</div><div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:1}}>{recurringChoice && recurringChoice.action === "delete" ? "End series from this date" : "Not available for edits"}</div></div></button><button aria-label="All occurrences" className="dp-gh" onClick={function(){if(!recurringChoice)return;var evt=recurringChoice.evt;if(recurringChoice.action==="delete"){setConfirmDel({key:recurringChoice.key,id:evt.id,title:evt.title});}else{showToast("Edit the parent event to change all occurrences","info");}setRecurringChoice(null);}} style={{padding:"14px 16px",borderRadius:14,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s",textAlign:"left"}}><div style={{width:32,height:32,borderRadius:10,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Repeat size={16} color="rgba(239,68,68,0.8)" strokeWidth={2}/></div><div><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)"}}>All occurrences</div><div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:1}}>{recurringChoice && recurringChoice.action === "delete" ? "Delete entire recurring event" : "Edit the parent event"}</div></div></button><button aria-label="Cancel" onClick={function(){setRecurringChoice(null);}} style={{padding:"11px",borderRadius:12,marginTop:4,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-muted)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div></div></GlassModal>
      {/* ═══ EDIT OCCURRENCE MODAL ═══ */}
      <GlassModal open={!!editOccurrence} onClose={function(){setEditOccurrence(null);}} variant="center" maxWidth={380}><div style={{padding:24}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:36,height:36,borderRadius:12,background:"rgba(139,92,246,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}><Edit3 size={18} color="var(--dp-accent)" strokeWidth={2}/></div><div><div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>Edit Occurrence</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>{editOccurrence ? editOccurrence.occDate : ""}</div></div></div><div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Title</label><GlassInput value={editOccTitle} onChange={function(e){setEditOccTitle(e.target.value);}} placeholder="Event title..." /></div><div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Start Time</label><GlassInput type="datetime-local" value={editOccTime ? editOccTime.replace("Z","").substring(0,16) : ""} onChange={function(e){setEditOccTime(e.target.value);}} /></div><div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>End Time</label><GlassInput type="datetime-local" value={editOccEndTime ? editOccEndTime.replace("Z","").substring(0,16) : ""} onChange={function(e){setEditOccEndTime(e.target.value);}} /></div><div style={{display:"flex",gap:8}}><button onClick={function(){setEditOccurrence(null);}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button><GradientButton gradient="primaryDark" onClick={function(){if(!editOccurrence)return;var params={eventId:editOccurrence.evt.id,originalDate:editOccurrence.occDate};if(editOccTitle&&editOccTitle!==editOccurrence.evt.title)params.title=editOccTitle;if(editOccTime)params.startTime=editOccTime;if(editOccEndTime)params.endTime=editOccEndTime;modifyOccurrenceMut.mutate(params);}} fullWidth style={{flex:1,borderRadius:12,padding:"12px 0",fontSize:14}}>Save</GradientButton></div></div></GlassModal>
      {/* ═══ BUFFER TIME PREFERENCES MODAL ═══ */}
      <GlassModal open={bufferPrefsOpen} onClose={function(){setBufferPrefsOpen(false);}} variant="center" maxWidth={420}>
        <div style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <div style={{width:36,height:36,borderRadius:12,background:"rgba(139,92,246,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Settings size={18} color="var(--dp-accent)" strokeWidth={2}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>Buffer Time Settings</div>
              <div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Add gaps between your events</div>
            </div>
          </div>

          {/* Buffer Minutes Pill Selector */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:8,display:"block"}}>Buffer Between Events</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[0,5,10,15,30].map(function(val){
                var isActive = bufferMinutes === val;
                return (
                  <button key={val} onClick={function(){setBufferMinutes(val);}} style={{
                    padding:"8px 16px",borderRadius:20,border:isActive?"2px solid var(--dp-accent)":"1px solid var(--dp-accent-border)",
                    background:isActive?"rgba(139,92,246,0.12)":"var(--dp-glass-bg)",
                    color:isActive?"var(--dp-accent)":"var(--dp-text-primary)",
                    fontSize:13,fontWeight:isActive?700:500,cursor:"pointer",fontFamily:"inherit",
                    transition:"all 0.15s",minWidth:48,textAlign:"center",
                  }}>
                    {val === 0 ? "None" : val + " min"}
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:6}}>
              {bufferMinutes > 0
                ? "A " + bufferMinutes + "-minute buffer zone will appear before and after each event."
                : "No buffer zones between events."}
            </div>
          </div>

          {/* Min Event Duration Selector */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:8,display:"block"}}>Minimum Event Duration</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[15,30,45,60,90,120].map(function(val){
                var isActive = minEventDuration === val;
                var label = val < 60 ? val + " min" : (val / 60) + "h" + (val % 60 > 0 ? " " + (val % 60) + "m" : "");
                return (
                  <button key={val} onClick={function(){setMinEventDuration(val);}} style={{
                    padding:"8px 14px",borderRadius:20,border:isActive?"2px solid var(--dp-accent)":"1px solid var(--dp-accent-border)",
                    background:isActive?"rgba(139,92,246,0.12)":"var(--dp-glass-bg)",
                    color:isActive?"var(--dp-accent)":"var(--dp-text-primary)",
                    fontSize:13,fontWeight:isActive?700:500,cursor:"pointer",fontFamily:"inherit",
                    transition:"all 0.15s",minWidth:48,textAlign:"center",
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Preview */}
          {bufferMinutes > 0 && (
            <div style={{marginBottom:20,padding:14,borderRadius:12,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)"}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--dp-text-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>Preview</div>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {/* Buffer before */}
                <div style={{height:Math.max(8, bufferMinutes * 0.6),background:"repeating-linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.1) 3px, rgba(168,85,247,0.04) 3px, rgba(168,85,247,0.04) 6px)",borderRadius:"6px 6px 0 0",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:600,color:"rgba(168,85,247,0.6)"}}>{bufferMinutes}m buffer</span>
                </div>
                {/* Event block */}
                <div style={{height:40,background:"rgba(139,92,246,0.15)",borderLeft:"3px solid var(--dp-accent)",display:"flex",alignItems:"center",padding:"0 10px"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--dp-accent)"}}>Your Event</span>
                </div>
                {/* Buffer after */}
                <div style={{height:Math.max(8, bufferMinutes * 0.6),background:"repeating-linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.1) 3px, rgba(168,85,247,0.04) 3px, rgba(168,85,247,0.04) 6px)",borderRadius:"0 0 6px 6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:600,color:"rgba(168,85,247,0.6)"}}>{bufferMinutes}m buffer</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){setBufferPrefsOpen(false);}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <GradientButton gradient="primaryDark" onClick={function(){
              saveCalPrefsMut.mutate({ buffer_minutes: bufferMinutes, min_event_duration: minEventDuration });
              setBufferPrefsOpen(false);
            }} fullWidth style={{flex:1,borderRadius:12,padding:"12px 0",fontSize:14}}>
              Save Preferences
            </GradientButton>
          </div>
        </div>
      </GlassModal>

      {/* ═══ ENERGY PROFILE MODAL ═══ */}
      <EnergyProfileModal open={energyModalOpen} onClose={function(){setEnergyModalOpen(false);}} />

      {/* ═══ SMART SCHEDULER ═══ */}
      <SmartScheduler open={smartOpen} onClose={function(){setSmartOpen(false);invalidateCalendar();}} />

      {/* ═══ SHARE CALENDAR ═══ */}
      <ShareCalendarModal open={shareOpen} onClose={function(){setShareOpen(false);}} />

      {/* ═══ PRINT / EXPORT MODAL ═══ */}
      <GlassModal open={exportOpen} onClose={function(){setExportOpen(false);setExportLoading(null);}} variant="center" maxWidth={420} title="Print / Export"><div style={{padding:"0 20px 24px"}}><p style={{fontSize:13,color:"var(--dp-text-secondary)",marginBottom:18,lineHeight:1.5}}>Export your calendar for {MONTHS[viewM]} {viewY} or print the current view.</p><button onClick={handlePrintView} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,marginBottom:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}><div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,rgba(139,92,246,0.12),rgba(139,92,246,0.06))",border:"1px solid rgba(139,92,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Printer size={18} color={BRAND.purple} strokeWidth={2}/></div><div style={{textAlign:"left",flex:1}}><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text-primary)"}}>Print Current View</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Opens browser print dialog with optimized layout</div></div></button><button onClick={function(){handleExportDownload("csv");}} disabled={exportLoading==="csv"} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,marginBottom:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",cursor:exportLoading==="csv"?"default":"pointer",fontFamily:"inherit",opacity:exportLoading==="csv"?0.6:1,transition:"all 0.15s"}}><div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.06))",border:"1px solid rgba(34,197,94,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{exportLoading==="csv"?<Loader2 size={18} color={BRAND.greenSolid} strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>:<FileSpreadsheet size={18} color={BRAND.greenSolid} strokeWidth={2}/>}</div><div style={{textAlign:"left",flex:1}}><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text-primary)"}}>Export as CSV</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Spreadsheet format for Excel, Google Sheets</div></div><Download size={16} color="var(--dp-text-muted)" strokeWidth={2}/></button><button onClick={function(){handleExportDownload("ical");}} disabled={exportLoading==="ical"} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,marginBottom:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",cursor:exportLoading==="ical"?"default":"pointer",fontFamily:"inherit",opacity:exportLoading==="ical"?0.6:1,transition:"all 0.15s"}}><div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.06))",border:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{exportLoading==="ical"?<Loader2 size={18} color="#F59E0B" strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>:<Calendar size={18} color="#F59E0B" strokeWidth={2}/>}</div><div style={{textAlign:"left",flex:1}}><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text-primary)"}}>Export as iCal</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Import into Apple Calendar, Outlook, Google Calendar</div></div><Download size={16} color="var(--dp-text-muted)" strokeWidth={2}/></button><button onClick={function(){handleExportDownload("json");}} disabled={exportLoading==="json"} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,marginBottom:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-glass-bg)",cursor:exportLoading==="json"?"default":"pointer",fontFamily:"inherit",opacity:exportLoading==="json"?0.6:1,transition:"all 0.15s"}}><div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.06))",border:"1px solid rgba(59,130,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{exportLoading==="json"?<Loader2 size={18} color="#3B82F6" strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>:<FileText size={18} color="#3B82F6" strokeWidth={2}/>}</div><div style={{textAlign:"left",flex:1}}><div style={{fontSize:14,fontWeight:600,color:"var(--dp-text-primary)"}}>Export as JSON</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Structured data format for developers</div></div><Download size={16} color="var(--dp-text-muted)" strokeWidth={2}/></button><div style={{fontSize:11,color:"var(--dp-text-muted)",textAlign:"center",marginTop:8}}>Exporting events from {startDate} to {endDate}</div></div></GlassModal>

      {/* ═══ BATCH SCHEDULER MODAL ═══ */}
      <GlassModal
        open={batchOpen}
        onClose={function(){setBatchOpen(false);}}
        variant="bottom"
        maxWidth={520}
        title={batchSuccess !== null ? "Scheduled!" : "Batch Schedule"}
      >
        <div style={{padding:"0 20px 24px"}}>

          {/* ── Success Animation ── */}
          {batchSuccess !== null && (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{
                width:64,height:64,borderRadius:"50%",
                background:"linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.15))",
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 16px",
                animation:"batchPop 0.4s cubic-bezier(0.34,1.56,0.64,1)"
              }}>
                <CheckCircle size={32} color={BRAND.green} strokeWidth={2}/>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:"var(--dp-text)",marginBottom:6}}>
                {batchSuccess} task{batchSuccess !== 1 ? "s" : ""} scheduled
              </div>
              <div style={{fontSize:13,color:"var(--dp-text-muted)"}}>
                Events have been created on your calendar
              </div>
            </div>
          )}

          {/* ── Task Selection ── */}
          {batchSuccess === null && (
            <>
              <div style={{
                display:"flex",alignItems:"center",gap:8,
                marginBottom:14,padding:"10px 0",
                borderBottom:"1px solid var(--dp-input-border)"
              }}>
                <CalendarClock size={16} color={BRAND.teal} strokeWidth={2}/>
                <span style={{fontSize:13,color:"var(--dp-text-secondary)",flex:1}}>
                  Select tasks and set date/time for each
                </span>
                {batchUnscheduledTasks.length > 0 && (
                  <button
                    onClick={batchSelectedCount === batchUnscheduledTasks.length ? function(){setBatchSelected({});} : batchSelectAll}
                    style={{
                      fontSize:12,fontWeight:600,color:BRAND.teal,
                      background:"none",border:"none",cursor:"pointer",
                      fontFamily:"inherit",padding:"4px 8px",borderRadius:6,
                      transition:"background 0.15s"
                    }}
                  >
                    {batchSelectedCount === batchUnscheduledTasks.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {/* Loading state */}
              {batchTasksQuery.isLoading && (
                <div style={{textAlign:"center",padding:"24px 0",color:"var(--dp-text-muted)",fontSize:13}}>
                  Loading tasks...
                </div>
              )}

              {/* Empty state */}
              {!batchTasksQuery.isLoading && batchUnscheduledTasks.length === 0 && (
                <div style={{textAlign:"center",padding:"32px 0"}}>
                  <CheckCircle size={28} color="var(--dp-text-muted)" strokeWidth={1.5} style={{marginBottom:8,opacity:0.5}}/>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--dp-text-muted)",marginBottom:4}}>All tasks scheduled</div>
                  <div style={{fontSize:12,color:"var(--dp-text-muted)"}}>No unscheduled tasks found</div>
                </div>
              )}

              {/* Task list */}
              {batchUnscheduledTasks.length > 0 && (
                <div style={{maxHeight:380,overflowY:"auto",marginBottom:16}}>
                  {batchUnscheduledTasks.map(function (task) {
                    var tid = task.id;
                    var isChecked = !!batchSelected[tid];
                    return (
                      <div key={tid} style={{
                        padding:"10px 12px",borderRadius:12,marginBottom:6,
                        background:isChecked ? "rgba(20,184,166,0.06)" : "var(--dp-glass-bg)",
                        border:isChecked ? "1px solid rgba(20,184,166,0.25)" : "1px solid var(--dp-input-border)",
                        transition:"all 0.15s"
                      }}>
                        {/* Row 1: Checkbox + title */}
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:isChecked ? 8 : 0}}>
                          <button
                            onClick={function(){batchToggleSelect(tid);}}
                            style={{
                              width:22,height:22,borderRadius:6,flexShrink:0,
                              border:isChecked ? "none" : "2px solid var(--dp-input-border)",
                              background:isChecked ? "linear-gradient(135deg,"+BRAND.teal+","+BRAND.green+")" : "transparent",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              cursor:"pointer",transition:"all 0.15s",padding:0
                            }}
                          >
                            {isChecked && <Check size={13} color="#fff" strokeWidth={3}/>}
                          </button>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {task.title || task.taskTitle || "Untitled"}
                            </div>
                            {(task.dreamTitle || task.dream) && (
                              <div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:1}}>
                                {task.dreamTitle || task.dream}
                              </div>
                            )}
                          </div>
                          {task.duration_mins || task.durationMins ? (
                            <span style={{fontSize:11,color:"var(--dp-text-muted)",flexShrink:0}}>
                              {task.duration_mins || task.durationMins}m
                            </span>
                          ) : null}
                        </div>

                        {/* Row 2: Date + Time pickers (only when selected) */}
                        {isChecked && (
                          <div style={{display:"flex",gap:8,paddingLeft:32}}>
                            <input
                              type="date"
                              value={batchDates[tid] || ""}
                              onChange={function(e){batchSetDate(tid, e.target.value);}}
                              style={{
                                flex:1,padding:"7px 10px",borderRadius:8,fontSize:12,
                                border:"1px solid var(--dp-input-border)",
                                background:"var(--dp-glass-bg)",color:"var(--dp-text)",
                                fontFamily:"inherit",outline:"none"
                              }}
                            />
                            <input
                              type="time"
                              value={batchTimes[tid] || ""}
                              onChange={function(e){batchSetTime(tid, e.target.value);}}
                              style={{
                                width:110,padding:"7px 10px",borderRadius:8,fontSize:12,
                                border:"1px solid var(--dp-input-border)",
                                background:"var(--dp-glass-bg)",color:"var(--dp-text)",
                                fontFamily:"inherit",outline:"none"
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Schedule All button */}
              {batchUnscheduledTasks.length > 0 && (
                <GradientButton
                  gradient="primaryDark"
                  fullWidth
                  onClick={handleBatchScheduleAll}
                  disabled={batchSelectedCount === 0 || batchScheduleMut.isPending}
                  style={{
                    borderRadius:14,padding:"13px 0",fontSize:14,
                    opacity:(batchSelectedCount === 0 || batchScheduleMut.isPending) ? 0.5 : 1,
                    transition:"opacity 0.15s"
                  }}
                >
                  {batchScheduleMut.isPending
                    ? "Scheduling..."
                    : "Schedule All (" + batchSelectedCount + ")"
                  }
                </GradientButton>
              )}
            </>
          )}
        </div>
        <style>{`
          @keyframes batchPop {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </GlassModal>

      {/* ═══ FOCUS MODE WIDGET ═══ */}
      <FocusModeWidget
        quickFocusOpen={quickFocusOpen}
        onCloseQuickFocus={function(){setQuickFocusOpen(false);}}
        onFocusStarted={function(){invalidateCalendar();}}
      />

      {/* ═══ ADD EVENT MODAL ═══ */}
      <GlassModal open={addEvt} onClose={()=>{setAddEvt(false);setNewEndDate("");setNewAllDay(false);setNewCategory("custom");setNewEventTz("");resetRecurrence();}} variant="center" maxWidth={380} title="New Task">
        <div style={{padding:24}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Title</label>
            <GlassInput value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Task name..." />
          </div>

          {/* Category Selector */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <Tag size={14} color={"var(--dp-accent)"} strokeWidth={2}/>
              <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Category</label>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {CATEGORY_KEYS.map(function(catKey) {
                var cfg = CATEGORY_CONFIG[catKey];
                var isActive = newCategory === catKey;
                var CatIcon = cfg.icon;
                return (
                  <button key={catKey} onClick={function(){setNewCategory(catKey);}} style={{
                    padding:"6px 10px",borderRadius:10,
                    border:"1.5px solid " + (isActive ? cfg.color : "var(--dp-input-border)"),
                    background:isActive ? cfg.color + "18" : "transparent",
                    color:isActive ? cfg.color : "var(--dp-text-secondary)",
                    fontSize:11,fontWeight:isActive ? 700 : 500,cursor:"pointer",
                    fontFamily:"inherit",transition:"all 0.15s",
                    display:"inline-flex",alignItems:"center",gap:5,
                  }}>
                    <CatIcon size={13} strokeWidth={2.2}/>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Day Toggle */}
          <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>All Day</label>
            <button
              aria-label={newAllDay ? "Disable all day" : "Enable all day"}
              onClick={function(){setNewAllDay(!newAllDay);}}
              style={{
                width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",
                background:newAllDay?"rgba(139,92,246,0.5)":"var(--dp-input-border)",
                position:"relative",transition:"background 0.2s",fontFamily:"inherit",
                padding:0,
              }}
            >
              <div style={{
                width:18,height:18,borderRadius:9,background:"#fff",
                position:"absolute",top:3,
                left:newAllDay?23:3,
                transition:"left 0.2s cubic-bezier(0.16,1,0.3,1)",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
              }}/>
            </button>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Start Date</label>
            <div style={{padding:"10px 14px",borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text-primary)",fontSize:14,display:"flex",alignItems:"center",gap:8}}>
              <Calendar size={14} color={"var(--dp-accent)"} strokeWidth={2}/>
              {new Date(viewY,viewM,selDay||TODAY.d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </div>
          </div>

          {/* End Date picker for multi-day */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>End Date (optional, for multi-day)</label>
            <GlassInput
              type="date"
              value={newEndDate}
              onChange={function(e){setNewEndDate(e.target.value);}}
              placeholder="End date"
            />
          </div>

          {/* Time picker hidden when all-day */}
          {!newAllDay && (
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Time</label>
              <GlassInput value={newTime} onChange={e=>setNewTime(e.target.value)} placeholder="9:00 AM" />
            </div>
          )}

          {/* ── Reminders Section ── */}
          <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><Bell size={14} color={"var(--dp-accent)"} strokeWidth={2}/><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Reminders</label></div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{REMINDER_PRESETS.map(function(preset){var isActive=preset.minutes===null?eventReminders.length===0:eventReminders.some(function(r){return r.minutes_before===preset.minutes;});return(<button key={preset.label} onClick={function(){addReminder(preset.minutes);}} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(isActive?"rgba(139,92,246,0.4)":"var(--dp-input-border)"),background:isActive?"rgba(139,92,246,0.15)":"transparent",color:isActive?"var(--dp-accent)":"var(--dp-text-secondary)",fontSize:11,fontWeight:isActive?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{preset.label}</button>);})}<button onClick={function(){setCustomReminderOpen(!customReminderOpen);}} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(customReminderOpen?"rgba(139,92,246,0.4)":"var(--dp-input-border)"),background:customReminderOpen?"rgba(139,92,246,0.15)":"transparent",color:customReminderOpen?"var(--dp-accent)":"var(--dp-text-secondary)",fontSize:11,fontWeight:customReminderOpen?700:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>Custom</button></div>{customReminderOpen&&(<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><input type="number" min="1" max="999" value={customReminderValue} onChange={function(e){setCustomReminderValue(Math.max(1,parseInt(e.target.value,10)||1));}} style={{width:55,padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:13,fontFamily:"inherit",textAlign:"center"}}/><select value={customReminderUnit} onChange={function(e){setCustomReminderUnit(e.target.value);}} style={{padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:12,fontFamily:"inherit"}}><option value="min">minutes</option><option value="hr">hours</option><option value="day">days</option></select><button onClick={addCustomReminder} style={{padding:"5px 10px",borderRadius:8,border:"none",background:"rgba(139,92,246,0.2)",color:"var(--dp-accent)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Add</button></div>)}{eventReminders.length>0&&(<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{eventReminders.map(function(r,idx){return(<span key={idx} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.25)",fontSize:11,fontWeight:600,color:"#D97706"}}><Bell size={10} strokeWidth={2.5}/>{formatReminderLabel(r.minutes_before)}<button aria-label="Remove reminder" onClick={function(){removeReminder(idx);}} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:14,borderRadius:7,border:"none",padding:0,background:"rgba(217,119,6,0.2)",color:"#D97706",cursor:"pointer",fontSize:10,fontFamily:"inherit",lineHeight:1}}><X size={8} strokeWidth={3}/></button></span>);})}</div>)}</div>

          {/* ── Event Timezone ── */}
          <div style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Globe size={14} color="var(--dp-accent)" strokeWidth={2}/><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Event Timezone</label><span style={{fontSize:10,color:"var(--dp-text-muted)"}}>(optional)</span></div><select value={newEventTz} onChange={function(e){setNewEventTz(e.target.value);}} style={{width:"100%",padding:"8px 12px",borderRadius:10,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}><option value="">{"Default (" + getTzAbbr(displayTz) + ")"}</option>{COMMON_TIMEZONES.map(function(tz){return(<option key={tz.value} value={tz.value}>{tz.label}</option>);})}</select></div>

          {/* ── Repeat Section ── */}
          <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <Repeat size={14} color={"var(--dp-accent)"} strokeWidth={2}/>
              <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Repeat</label>
            </div>
            <button
              aria-label={recEnabled ? "Disable repeat" : "Enable repeat"}
              onClick={function(){setRecEnabled(!recEnabled);}}
              style={{
                width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",
                background:recEnabled?"rgba(139,92,246,0.5)":"var(--dp-input-border)",
                position:"relative",transition:"background 0.2s",fontFamily:"inherit",
                padding:0,
              }}
            >
              <div style={{
                width:18,height:18,borderRadius:9,background:"#fff",
                position:"absolute",top:3,
                left:recEnabled?23:3,
                transition:"left 0.2s cubic-bezier(0.16,1,0.3,1)",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
              }}/>
            </button>
          </div>

          {recEnabled && (
            <div style={{marginBottom:14,padding:12,borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-accent-border)"}}>
              {/* Frequency selector */}
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:4,display:"block"}}>Frequency</label>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {["daily","weekly","monthly","yearly","custom"].map(function(fr){
                    var isActive = recFrequency === fr;
                    return (
                      <button key={fr} onClick={function(){setRecFrequency(fr);}} style={{
                        padding:"5px 10px",borderRadius:8,border:"1px solid " + (isActive ? "rgba(139,92,246,0.4)" : "var(--dp-input-border)"),
                        background:isActive?"rgba(139,92,246,0.15)":"transparent",
                        color:isActive?"var(--dp-accent)":"var(--dp-text-secondary)",
                        fontSize:11,fontWeight:isActive?700:500,cursor:"pointer",
                        fontFamily:"inherit",transition:"all 0.15s",textTransform:"capitalize",
                      }}>{fr}</button>
                    );
                  })}
                </div>
              </div>

              {/* Interval picker */}
              <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <label style={{fontSize:11,fontWeight:600,color:"var(--dp-text-secondary)",whiteSpace:"nowrap"}}>Every</label>
                <input type="number" min="1" max="99" value={recInterval} onChange={function(e){setRecInterval(Math.max(1, parseInt(e.target.value, 10) || 1));}}
                  style={{width:50,padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:13,fontFamily:"inherit",textAlign:"center"}}
                />
                <span style={{fontSize:11,color:"var(--dp-text-secondary)"}}>
                  {recFrequency === "daily" ? "day(s)" : recFrequency === "weekly" ? "week(s)" : recFrequency === "monthly" ? "month(s)" : recFrequency === "yearly" ? "year(s)" : "day(s)"}
                </span>
              </div>

              {/* Weekly: day-of-week pill selector */}
              {recFrequency === "weekly" && (
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:4,display:"block"}}>On days</label>
                  <div style={{display:"flex",gap:4}}>
                    {["M","T","W","T","F","S","S"].map(function(label, idx){
                      var isActive = recDaysOfWeek.indexOf(idx) !== -1;
                      return (
                        <button key={idx} onClick={function(){
                          if (isActive) {
                            setRecDaysOfWeek(recDaysOfWeek.filter(function(d){return d !== idx;}));
                          } else {
                            setRecDaysOfWeek(recDaysOfWeek.concat([idx]));
                          }
                        }} style={{
                          width:32,height:32,borderRadius:16,border:"1px solid " + (isActive ? "rgba(139,92,246,0.5)" : "var(--dp-input-border)"),
                          background:isActive?"rgba(139,92,246,0.2)":"transparent",
                          color:isActive?"var(--dp-accent)":"var(--dp-text-secondary)",
                          fontSize:12,fontWeight:isActive?700:500,cursor:"pointer",
                          fontFamily:"inherit",transition:"all 0.15s",
                          display:"flex",alignItems:"center",justifyContent:"center",
                        }}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly: day or nth weekday */}
              {recFrequency === "monthly" && (
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    <button onClick={function(){setRecMonthlyMode("dayOfMonth");}} style={{
                      padding:"5px 10px",borderRadius:8,border:"1px solid " + (recMonthlyMode === "dayOfMonth" ? "rgba(139,92,246,0.4)" : "var(--dp-input-border)"),
                      background:recMonthlyMode === "dayOfMonth" ? "rgba(139,92,246,0.15)" : "transparent",
                      color:recMonthlyMode === "dayOfMonth" ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                      fontSize:11,fontWeight:recMonthlyMode === "dayOfMonth" ? 700 : 500,cursor:"pointer",fontFamily:"inherit",
                    }}>Day of month</button>
                    <button onClick={function(){setRecMonthlyMode("nthWeekday");}} style={{
                      padding:"5px 10px",borderRadius:8,border:"1px solid " + (recMonthlyMode === "nthWeekday" ? "rgba(139,92,246,0.4)" : "var(--dp-input-border)"),
                      background:recMonthlyMode === "nthWeekday" ? "rgba(139,92,246,0.15)" : "transparent",
                      color:recMonthlyMode === "nthWeekday" ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                      fontSize:11,fontWeight:recMonthlyMode === "nthWeekday" ? 700 : 500,cursor:"pointer",fontFamily:"inherit",
                    }}>Nth weekday</button>
                  </div>
                  {recMonthlyMode === "dayOfMonth" ? (
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <label style={{fontSize:11,color:"var(--dp-text-secondary)"}}>Day</label>
                      <input type="number" min="1" max="31" value={recDayOfMonth} onChange={function(e){setRecDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)));}}
                        style={{width:50,padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:13,fontFamily:"inherit",textAlign:"center"}}
                      />
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <select value={recWeekOfMonth} onChange={function(e){setRecWeekOfMonth(parseInt(e.target.value, 10));}}
                        style={{padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:12,fontFamily:"inherit"}}>
                        <option value={1}>First</option>
                        <option value={2}>Second</option>
                        <option value={3}>Third</option>
                        <option value={4}>Fourth</option>
                        <option value={5}>Fifth</option>
                      </select>
                      <select value={recDayOfWeek} onChange={function(e){setRecDayOfWeek(parseInt(e.target.value, 10));}}
                        style={{padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:12,fontFamily:"inherit"}}>
                        {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(function(name, idx){
                          return <option key={idx} value={idx}>{name}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Weekdays only toggle */}
              {(recFrequency === "daily" || recFrequency === "custom") && (
                <div style={{marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <label style={{fontSize:11,fontWeight:600,color:"var(--dp-text-secondary)"}}>Weekdays only</label>
                  <button
                    aria-label={recWeekdaysOnly ? "Include weekends" : "Weekdays only"}
                    onClick={function(){setRecWeekdaysOnly(!recWeekdaysOnly);}}
                    style={{
                      width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",
                      background:recWeekdaysOnly?"rgba(139,92,246,0.5)":"var(--dp-input-border)",
                      position:"relative",transition:"background 0.2s",fontFamily:"inherit",padding:0,
                    }}
                  >
                    <div style={{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:3,left:recWeekdaysOnly?19:3,transition:"left 0.2s cubic-bezier(0.16,1,0.3,1)",boxShadow:"0 1px 2px rgba(0,0,0,0.2)"}}/>
                  </button>
                </div>
              )}

              {/* End condition */}
              <div style={{marginBottom:6}}>
                <label style={{fontSize:11,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:4,display:"block"}}>Ends</label>
                <div style={{display:"flex",gap:4,marginBottom:6}}>
                  {[{key:"never",label:"Never"},{key:"on_date",label:"On date"},{key:"after_count",label:"After N"}].map(function(opt){
                    var isActive = recEndMode === opt.key;
                    return (
                      <button key={opt.key} onClick={function(){setRecEndMode(opt.key);}} style={{
                        padding:"5px 10px",borderRadius:8,border:"1px solid " + (isActive ? "rgba(139,92,246,0.4)" : "var(--dp-input-border)"),
                        background:isActive?"rgba(139,92,246,0.15)":"transparent",
                        color:isActive?"var(--dp-accent)":"var(--dp-text-secondary)",
                        fontSize:11,fontWeight:isActive?700:500,cursor:"pointer",fontFamily:"inherit",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
                {recEndMode === "on_date" && (
                  <GlassInput type="date" value={recEndDate} onChange={function(e){setRecEndDate(e.target.value);}} />
                )}
                {recEndMode === "after_count" && (
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input type="number" min="1" max="999" value={recEndAfterCount} onChange={function(e){setRecEndAfterCount(Math.max(1, parseInt(e.target.value, 10) || 1));}}
                      style={{width:60,padding:"5px 8px",borderRadius:8,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text)",fontSize:13,fontFamily:"inherit",textAlign:"center"}}
                    />
                    <span style={{fontSize:11,color:"var(--dp-text-secondary)"}}>occurrences</span>
                  </div>
                )}
              </div>

              {/* Human-readable summary */}
              {(function(){
                var previewRule = buildRecurrenceRule();
                var summary = buildRecurrenceSummary(previewRule);
                if (!summary) return null;
                return (
                  <div style={{marginTop:8,padding:"8px 10px",borderRadius:8,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.15)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <Repeat size={12} color={"var(--dp-accent)"} strokeWidth={2}/>
                      <span style={{fontSize:12,color:"var(--dp-accent)",fontWeight:500}}>{summary}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setAddEvt(false);setNewEndDate("");setNewAllDay(false);setNewCategory("custom");setNewEventTz("");resetRecurrence();}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <GradientButton gradient="primaryDark" onClick={handleAddEvt} disabled={!newTitle.trim() || conflictChecking} loading={conflictChecking} fullWidth style={{flex:1,borderRadius:12,padding:"12px 0",fontSize:14}}>{conflictChecking ? "Checking..." : "Create"}</GradientButton>
          </div>
        </div>
      </GlassModal>

      {/* ═══ RESCUE MODAL ═══ */}
      <GlassModal open={rescueOpen} onClose={function(){setRescueOpen(false);setRescueSuccess(false);}} variant="center" maxWidth={420} title="Rescue Overdue Tasks"><div style={{padding:20}}>{rescueSuccess?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 0"}}><div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))",border:"1px solid rgba(34,197,94,0.3)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,animation:"dpFS 0.5s cubic-bezier(0.16,1,0.3,1) forwards",boxShadow:"0 0 30px rgba(34,197,94,0.2)"}}><CheckCircle size={32} color={BRAND.greenSolid} strokeWidth={2}/></div><div style={{fontSize:18,fontWeight:700,color:"var(--dp-text-primary)",marginBottom:6}}>Tasks Rescued!</div><div style={{fontSize:13,color:"var(--dp-text-muted)",textAlign:"center"}}>Your calendar has been updated</div></div>):(<><div style={{fontSize:13,color:"var(--dp-text-muted)",marginBottom:16,textAlign:"center"}}>Choose how to reschedule your {overdueCount} overdue task{overdueCount!==1?"s":""}</div><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}><div onClick={function(){setRescueStrategy("today");}} style={{padding:"14px 16px",borderRadius:14,cursor:"pointer",background:rescueStrategy==="today"?(isLight?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.12)"):"var(--dp-glass-bg)",border:rescueStrategy==="today"?"1.5px solid rgba(239,68,68,0.4)":"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",gap:12,transition:"all 0.2s ease"}}><div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:"linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))",display:"flex",alignItems:"center",justifyContent:"center"}}><Rocket size={20} color={BRAND.redSolid} strokeWidth={2}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--dp-text-primary)"}}>Do Today</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Move all overdue tasks to today</div></div>{rescueStrategy==="today"&&<CheckCircle size={18} color={BRAND.redSolid} strokeWidth={2.5}/>}</div><div onClick={function(){setRescueStrategy("spread");}} style={{padding:"14px 16px",borderRadius:14,cursor:"pointer",background:rescueStrategy==="spread"?(isLight?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.12)"):"var(--dp-glass-bg)",border:rescueStrategy==="spread"?"1.5px solid rgba(245,158,11,0.4)":"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",gap:12,transition:"all 0.2s ease"}}><div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:"linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))",display:"flex",alignItems:"center",justifyContent:"center"}}><CalendarClock size={20} color={BRAND.orange} strokeWidth={2}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--dp-text-primary)"}}>Spread Out</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Distribute across the next 7 days</div></div>{rescueStrategy==="spread"&&<CheckCircle size={18} color={BRAND.orange} strokeWidth={2.5}/>}</div><div onClick={function(){setRescueStrategy("smart");}} style={{padding:"14px 16px",borderRadius:14,cursor:"pointer",background:rescueStrategy==="smart"?(isLight?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.12)"):"var(--dp-glass-bg)",border:rescueStrategy==="smart"?"1.5px solid rgba(139,92,246,0.4)":"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",gap:12,transition:"all 0.2s ease"}}><div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:"linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08))",display:"flex",alignItems:"center",justifyContent:"center"}}><Brain size={20} color={BRAND.purple} strokeWidth={2}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--dp-text-primary)"}}>Smart Rescue</div><div style={{fontSize:12,color:"var(--dp-text-muted)",marginTop:2}}>Priority-aware spread across 2 weeks</div></div>{rescueStrategy==="smart"&&<CheckCircle size={18} color={BRAND.purple} strokeWidth={2.5}/>}</div></div><div style={{padding:"10px 14px",borderRadius:10,marginBottom:16,background:isLight?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,color:"var(--dp-text-muted)"}}>Tasks to rescue</span><span style={{fontSize:14,fontWeight:700,color:"var(--dp-text-primary)"}}>{overdueCount}</span></div><GradientButton gradient={rescueStrategy==="today"?"danger":rescueStrategy==="spread"?"teal":"primary"} fullWidth loading={rescueMut.isPending} disabled={rescueMut.isPending||overdueCount===0} onClick={function(){var ids=overdueTasks.map(function(t){return t.task_id;});rescueMut.mutate({task_ids:ids,strategy:rescueStrategy});}}>{rescueMut.isPending?"Rescuing...":"Rescue "+overdueCount+" Task"+(overdueCount!==1?"s":"")}</GradientButton></>)}</div></GlassModal>

      {/* ═══ CONFLICT WARNING ═══ */}
      <GlassModal open={!!conflictWarning} onClose={function(){setConflictWarning(null);}} variant="center" maxWidth={400}><div style={{padding:24}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20}}><div style={{width:48,height:48,borderRadius:16,background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,boxShadow:"0 0 20px rgba(245,158,11,0.15)"}}><AlertTriangle size={24} color="#F59E0B" strokeWidth={2}/></div><h3 style={{fontSize:17,fontWeight:700,color:"var(--dp-text)",margin:0,marginBottom:4}}>Scheduling Conflict</h3><p style={{fontSize:13,color:"var(--dp-text-secondary)",margin:0,textAlign:"center"}}>This time overlaps with {conflictWarning ? conflictWarning.conflicts.length : 0} existing {conflictWarning && conflictWarning.conflicts.length === 1 ? "item" : "items"}</p></div><div style={{maxHeight:200,overflowY:"auto",marginBottom:20,display:"flex",flexDirection:"column",gap:8}}>{conflictWarning && conflictWarning.conflicts.map(function(c,i){var tb=c.type==="timeblock";return(<div key={c.id||i} style={{padding:"10px 14px",borderRadius:12,background:tb?"rgba(239,68,68,0.06)":"rgba(245,158,11,0.06)",border:"1px solid "+(tb?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)"),display:"flex",alignItems:"center",gap:10}}><div style={{width:4,alignSelf:"stretch",minHeight:32,borderRadius:2,background:tb?"#EF4444":"#F59E0B",flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.title}</div><div style={{fontSize:11,color:"var(--dp-text-secondary)",marginTop:2}}>{formatConflictTime(c.startTime||c.start_time)}{" - "}{formatConflictTime(c.endTime||c.end_time)}</div></div>{tb&&<div style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(239,68,68,0.1)",color:"#EF4444",flexShrink:0}}>Blocked</div>}</div>);})}</div><div style={{display:"flex",gap:8}}><button onClick={function(){setConflictWarning(null);}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"transparent",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Go Back</button><button onClick={handleForceCreate} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(245,158,11,0.3)"}}>Schedule Anyway</button></div></div></GlassModal>

      {freeSlotsHover&&(<div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"6px 14px",borderRadius:10,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",backdropFilter:"blur(12px)",pointerEvents:"none"}}><span style={{fontSize:12,fontWeight:600,color:BRAND.greenAction}}>{freeSlotsHover.freeHours} hours free</span></div>)}
      <GlassModal open={findFreeOpen} onClose={function(){setFindFreeOpen(false);}} variant="center" maxWidth={420} title="Find Free Time"><div style={{padding:24}}><div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:8,display:"block"}}>How much time do you need?</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[15,30,60,120].map(function(dur){var isAct=findFreeDuration===dur;var lb=dur>=60?dur/60+"hr":dur+"min";return(<button key={dur} onClick={function(){setFindFreeDuration(dur);}} style={{padding:"8px 16px",borderRadius:10,border:"1px solid "+(isAct?"rgba(34,197,94,0.5)":"var(--dp-input-border)"),background:isAct?"rgba(34,197,94,0.12)":"transparent",color:isAct?BRAND.greenAction:"var(--dp-text-secondary)",fontSize:13,fontWeight:isAct?700:500,cursor:"pointer",fontFamily:"inherit"}}>{lb}</button>);})}</div></div><div style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:8}}>Best slots in the next 7 days</div>{findFreeQuery.isLoading?(<div style={{display:"flex",flexDirection:"column",gap:8}}><SkeletonCard height={48}/><SkeletonCard height={48}/></div>):(function(){var allS=[];(findFreeQuery.data||[]).forEach(function(dd){if(!dd||!dd.slots)return;dd.slots.forEach(function(sl){allS.push({date:dd.date,start:sl.start,end:sl.end,quality:sl.quality_score||0.5});});});allS.sort(function(a,b){return b.quality-a.quality;});var top8=allS.slice(0,8);if(top8.length===0)return(<GlassCard padding={24} style={{textAlign:"center"}}><Clock size={28} color={"var(--dp-text-muted)"} strokeWidth={1.5} style={{margin:"0 auto 8px"}}/><div style={{fontSize:13,color:"var(--dp-text-secondary)"}}>No slots found</div></GlassCard>);return(<div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:320,overflowY:"auto"}}>{top8.map(function(sl,si){var sd2=new Date(sl.start);var dlbl=sameDay(sd2,new Date())?"Today":sd2.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});var sH2=sd2.getHours();var sM2=sd2.getMinutes();var ed2=new Date(sl.end);var eH2=ed2.getHours();var eM2=ed2.getMinutes();var ft2=function(h,m){var ap=h>=12?"PM":"AM";var h2=h===0?12:h>12?h-12:h;return h2+":"+String(m).padStart(2,"0")+" "+ap;};var qp2=Math.round(sl.quality*100);var qc2=qp2>=80?BRAND.greenAction:qp2>=60?"#F59E0B":"var(--dp-text-muted)";return(<div key={si} onClick={function(){setViewY(sd2.getFullYear());setViewM(sd2.getMonth());setSelDay(sd2.getDate());var ap=sH2<12?"AM":"PM";var h2=sH2===0?12:sH2>12?sH2-12:sH2;setNewTime(h2+":"+String(sM2).padStart(2,"0")+" "+ap);setNewTitle("");setNewCategory("custom");setAddEvt(true);setFindFreeOpen(false);}} style={{padding:"10px 14px",borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid rgba(34,197,94,0.15)",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} className="dp-gh"><div style={{width:4,alignSelf:"stretch",minHeight:36,borderRadius:2,background:qc2,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)"}}>{dlbl}</div><div style={{fontSize:12,color:"var(--dp-text-secondary)",marginTop:2}}>{ft2(sH2,sM2)} - {ft2(eH2,eM2)}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:11,fontWeight:700,color:qc2}}>{qp2}%</div><div style={{fontSize:9,color:"var(--dp-text-muted)"}}>quality</div></div></div>);})}</div>);})()}</div><div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}><button onClick={function(){setFindFreeOpen(false);}} style={{padding:"10px 20px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Close</button></div></div></GlassModal>
      {/* ═══ DRAG GHOST ═══ */}
      {drag.isDragging&&drag.draggedEvent&&(
        <div id="dp-drag-ghost" style={drag.ghostStyle}>
          <Move size={12} strokeWidth={2.5}/>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{drag.draggedEvent.title}</span>
        </div>
      )}

      {/* ═══ DRAG OVERLAY (prevents interaction with background during drag) ═══ */}
      {drag.isDragging&&(
        <div style={{position:"fixed",inset:0,zIndex:9990,background:"transparent",cursor:"grabbing"}}/>
      )}

      {/* ═══ CALENDAR SEARCH OVERLAY ═══ */}
      <CalendarSearchOverlay
        open={searchOpen}
        onClose={function(){setSearchOpen(false);}}
        onNavigateToDate={function(dateStr){
          if(!dateStr)return;
          var parts=dateStr.split("-");
          if(parts.length<3)return;
          var y=parseInt(parts[0],10);
          var m=parseInt(parts[1],10)-1;
          var d=parseInt(parts[2],10);
          if(isNaN(y)||isNaN(m)||isNaN(d))return;
          setViewY(y);
          setViewM(m);
          setSelDay(d);
          setViewMode("month");
          setWeekStart(getMonday(new Date(y,m,d)));
        }}
      />

      {/* ═══ HABIT TRACKER PANEL ═══ */}
      <HabitTrackerPanel open={habitPanelOpen} onClose={function(){setHabitPanelOpen(false);}} />

      {/* ═══ ICAL IMPORT RESULT ═══ */}
      <GlassModal open={!!icalResult} onClose={function(){setIcalResult(null);}} variant="center" maxWidth={400}><div style={{padding:24}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20}}><div style={{width:48,height:48,borderRadius:16,background:icalResult&&icalResult.imported>0?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",border:"1px solid "+(icalResult&&icalResult.imported>0?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"),display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>{icalResult&&icalResult.imported>0?<CheckCircle size={24} color={BRAND.greenSolid} strokeWidth={2}/>:<AlertCircle size={24} color="rgba(239,68,68,0.8)" strokeWidth={2}/>}</div><h3 style={{fontSize:17,fontWeight:700,color:"var(--dp-text)",margin:0,marginBottom:4}}>{icalResult&&icalResult.imported>0?"Import Complete":"Import Failed"}</h3></div><div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}><div style={{textAlign:"center",padding:"8px 16px",borderRadius:10,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)"}}><div style={{fontSize:20,fontWeight:700,color:BRAND.greenSolid}}>{icalResult?icalResult.imported:0}</div><div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:2}}>Imported</div></div><div style={{textAlign:"center",padding:"8px 16px",borderRadius:10,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}><div style={{fontSize:20,fontWeight:700,color:"#F59E0B"}}>{icalResult?icalResult.skipped:0}</div><div style={{fontSize:11,color:"var(--dp-text-muted)",marginTop:2}}>Skipped</div></div></div>{icalResult&&icalResult.errors&&icalResult.errors.length>0&&(<div style={{maxHeight:160,overflowY:"auto",marginBottom:16,padding:10,borderRadius:10,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)"}}><div style={{fontSize:12,fontWeight:600,color:"rgba(239,68,68,0.8)",marginBottom:6}}>Errors ({icalResult.errors.length})</div>{icalResult.errors.map(function(err,i){return(<div key={i} style={{fontSize:11,color:"var(--dp-text-secondary)",marginBottom:4,lineHeight:1.4,wordBreak:"break-word"}}>{err}</div>);})}</div>)}<button onClick={function(){setIcalResult(null);}} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Close</button></div></GlassModal>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.3);}
        .dp-gh:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.1);transform:translateY(-1px);}
        [data-theme="light"] .dp-gh:hover{background:rgba(255,255,255,0.85);border-color:rgba(139,92,246,0.18);}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes dpSyncPulse{0%{opacity:1;}50%{opacity:0.4;}100%{opacity:1;}}
        .dp-week-scroll::-webkit-scrollbar{width:4px;}
        .dp-week-scroll::-webkit-scrollbar-track{background:transparent;}
        .dp-week-scroll::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.2);border-radius:4px;}
        .dp-week-cell:hover{background:rgba(139,92,246,0.04)!important;}
        .dp-focus-cell{position:relative;}
        .dp-focus-cell::after{content:'';position:absolute;inset:0;background:rgba(139,92,246,0.04);pointer-events:none;border-left:2px solid rgba(139,92,246,0.2);}
        .dp-free-cell{position:relative;}
        .dp-free-cell::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(34,197,94,0.04),rgba(34,197,94,0.04) 3px,transparent 3px,transparent 6px);pointer-events:none;z-index:0;}
        .dp-energy-peak{position:relative;}
        .dp-energy-peak::after{content:'';position:absolute;inset:0;border-left:2px solid rgba(34,197,94,0.25);pointer-events:none;}
        .dp-energy-low{position:relative;}
        .dp-energy-low::after{content:'';position:absolute;inset:0;border-left:2px solid rgba(245,158,11,0.25);pointer-events:none;}
        .dp-week-evt:hover{transform:scale(1.02);box-shadow:0 2px 8px rgba(0,0,0,0.15)!important;}
        .dp-multi-bar:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,0.12)!important;}
        [data-dp-drop-target]{box-shadow:inset 0 0 0 2px rgba(139,92,246,0.45)!important;background:rgba(139,92,246,0.1)!important;transition:box-shadow 0.15s,background 0.15s;}
        @media(max-width:600px){
          .dp-week-scroll{max-height:360px!important;}
        }
        @media print{
          .dp-desktop-header,.dp-bottom-nav,nav,[class*="BottomNav"],[class*="GlassAppBar"],[class*="GlassModal"],[class*="overlay"]{display:none!important;}
          body,html,.dp-desktop-main{background:#fff!important;color:#000!important;position:static!important;overflow:visible!important;height:auto!important;}
          .dp-desktop-main>main{overflow:visible!important;padding:0!important;}
          .dp-content-area{padding:0!important;}
          *{color:#000!important;background:transparent!important;box-shadow:none!important;text-shadow:none!important;border-color:#ccc!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
          .dp-print-header{display:block!important;text-align:center;padding:16px 0 24px;border-bottom:2px solid #000;margin-bottom:16px;font-size:20px;font-weight:700;font-family:Inter,system-ui,sans-serif;}
          .dp-no-print{display:none!important;}
        }
        .dp-print-header{display:none;}
      `}</style>
    </div>
  );
}
