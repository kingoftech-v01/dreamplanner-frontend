import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme, ACCENT_PRESETS } from "../../context/ThemeContext";
import { useT } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPut, apiPost, apiDelete } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { isValidEmail, sanitizeText } from "../../utils/sanitize";
import { adaptColor } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassInput from "../../components/shared/GlassInput";
import GlassModal from "../../components/shared/GlassModal";
import {
  ArrowLeft, User, Mail, Lock, Sun, Moon, Monitor, Sparkles,
  Globe, Clock, Bell, Calendar, Crown, ShoppingBag,
  Info, FileText, Shield, LogOut, Trash2, X, Check,
  ChevronRight, AlertTriangle, BellOff, BellRing,
  Download, UserX, Palette, Volume2, Smartphone, Play,
  Brain, Zap, Loader2
} from "lucide-react";
import { playSound, setSoundEnabled, isSoundEnabled, getSoundNames } from "../../services/sounds";
import { setHapticsEnabled, isHapticsEnabled, playHapticPattern } from "../../services/native";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Settings Screen v1
 *
 * Sections: Account, Appearance, Preferences, Subscription, About
 * Interactive: theme picker, language selector, notification toggles,
 *              delete account confirmation with "DELETE" typing
 * ═══════════════════════════════════════════════════════════════════ */

const LANGUAGES = [
  {code:"en",label:"English"},
  {code:"fr",label:"Français"},
  {code:"es",label:"Español"},
  {code:"de",label:"Deutsch"},
  {code:"pt",label:"Português"},
  {code:"it",label:"Italiano"},
  {code:"nl",label:"Nederlands"},
  {code:"ru",label:"Русский"},
  {code:"ja",label:"日本語"},
  {code:"ko",label:"한국어"},
  {code:"zh",label:"中文"},
  {code:"ar",label:"العربية"},
  {code:"hi",label:"हिन्दी"},
  {code:"tr",label:"Türkçe"},
  {code:"pl",label:"Polski"},
  {code:"ht",label:"Kreyòl Ayisyen"},
];

const TIMEZONES = [
  {value:"Pacific/Honolulu",label:"Hawaii (HST)",offset:"-10:00"},
  {value:"America/Anchorage",label:"Alaska (AKST)",offset:"-09:00"},
  {value:"America/Los_Angeles",label:"Pacific (PST)",offset:"-08:00"},
  {value:"America/Denver",label:"Mountain (MST)",offset:"-07:00"},
  {value:"America/Chicago",label:"Central (CST)",offset:"-06:00"},
  {value:"America/New_York",label:"Eastern (EST)",offset:"-05:00"},
  {value:"America/Toronto",label:"Toronto (EST)",offset:"-05:00"},
  {value:"America/Halifax",label:"Atlantic (AST)",offset:"-04:00"},
  {value:"America/Sao_Paulo",label:"São Paulo (BRT)",offset:"-03:00"},
  {value:"Atlantic/Reykjavik",label:"Iceland (GMT)",offset:"+00:00"},
  {value:"Europe/London",label:"London (GMT)",offset:"+00:00"},
  {value:"Europe/Paris",label:"Paris (CET)",offset:"+01:00"},
  {value:"Europe/Berlin",label:"Berlin (CET)",offset:"+01:00"},
  {value:"Europe/Helsinki",label:"Helsinki (EET)",offset:"+02:00"},
  {value:"Africa/Cairo",label:"Cairo (EET)",offset:"+02:00"},
  {value:"Europe/Moscow",label:"Moscow (MSK)",offset:"+03:00"},
  {value:"Asia/Dubai",label:"Dubai (GST)",offset:"+04:00"},
  {value:"Asia/Kolkata",label:"India (IST)",offset:"+05:30"},
  {value:"Asia/Bangkok",label:"Bangkok (ICT)",offset:"+07:00"},
  {value:"Asia/Shanghai",label:"China (CST)",offset:"+08:00"},
  {value:"Asia/Tokyo",label:"Tokyo (JST)",offset:"+09:00"},
  {value:"Australia/Sydney",label:"Sydney (AEST)",offset:"+10:00"},
  {value:"Pacific/Auckland",label:"Auckland (NZST)",offset:"+12:00"},
];

// ═══════════════════════════════════════════════════════════════════
export default function SettingsScreen(){
  var navigate=useNavigate();
  var{user,logout}=useAuth();
  var{showToast}=useToast();
  var queryClient=useQueryClient();
  const[mounted,setMounted]=useState(false);
  const{theme,setTheme,resolved,uiOpacity,forceMode,setForceMode,visualTheme,accentColor,setAccentColor}=useTheme();const isLight=resolved==="light";
  const{t,locale,setLocale}=useT();
  const[notifs,setNotifs]=useState({push:true,email:true,buddy:true,streak:true,dailySummary:true});
  const[dndEnabled,setDndEnabled]=useState(false);
  const[dndStart,setDndStart]=useState("22:00");
  const[dndEnd,setDndEnd]=useState("07:00");

  // Fetch notification preferences from API
  useQuery({
    queryKey:["notification-preferences"],
    queryFn:function(){return apiGet(USERS.NOTIFICATION_PREFS).catch(function(e){
      // Backend may not support GET on this endpoint (405) — use defaults silently
      if(e && (e.status===405||e.status===404))return null;
      throw e;
    });},
    retry:false,
    onSuccess:function(data){
      if(data){
        setNotifs({
          push:data.pushEnabled!=null?!!data.pushEnabled:true,
          email:data.emailEnabled!=null?!!data.emailEnabled:true,
          buddy:data.buddyReminders!=null?!!data.buddyReminders:true,
          streak:data.streakReminders!=null?!!data.streakReminders:true,
          dailySummary:data.daily_summary_enabled!=null?!!data.daily_summary_enabled:true,
        });
        if(data.dndEnabled!=null)setDndEnabled(!!data.dndEnabled);
        if(data.dndStart)setDndStart(data.dndStart);
        if(data.dndEnd)setDndEnd(data.dndEnd);
      }
    },
  });
  const[tz,setTz]=useState(()=>{try{return localStorage.getItem("dp-timezone")||(user&&user.timezone)||"America/Toronto";}catch(e){return(user&&user.timezone)||"America/Toronto";}});
  const[showLang,setShowLang]=useState(false);
  const[showTz,setShowTz]=useState(false);
  const[tzSearch,setTzSearch]=useState("");
  const[showDelete,setShowDelete]=useState(false);
  const[deleteText,setDeleteText]=useState("");
  const[deletePassword,setDeletePassword]=useState("");
  const[showEmailChange,setShowEmailChange]=useState(false);
  const[newEmail,setNewEmail]=useState("");
  const[showCustomHex,setShowCustomHex]=useState(false);
  const[customHex,setCustomHex]=useState("");
  const[exportFormat,setExportFormat]=useState("json");
  const[exportLoading,setExportLoading]=useState(false);
  const[soundsOn,setSoundsOn]=useState(function(){return isSoundEnabled();});
  const[hapticsOn,setHapticsOn]=useState(function(){return isHapticsEnabled();});
  const[timingData,setTimingData]=useState(null);
  const[timingLoading,setTimingLoading]=useState(false);
  const[timingApplying,setTimingApplying]=useState(false);
  const[showTimingSection,setShowTimingSection]=useState(false);

  // ─── Notification preferences mutation ─────────────────────────
  var notifMutation=useMutation({
    mutationFn:function(prefs){return apiPut(USERS.NOTIFICATION_PREFS,prefs);},
    onSuccess:function(){
      queryClient.invalidateQueries({queryKey:["user"]});
      showToast(t("settings.preferencesSaved")||"Preferences saved","success");
    },
    onError:function(err){
      showToast(err.userMessage || err.message ||"Failed to save preferences","error");
    },
  });

  // ─── Email change mutation ─────────────────────────────────────
  var emailMutation=useMutation({
    mutationFn:function(body){return apiPost(USERS.CHANGE_EMAIL,body);},
    onSuccess:function(){
      queryClient.invalidateQueries({queryKey:["user"]});
      showToast(t("settings.emailChanged")||"Verification email sent","success");
      setShowEmailChange(false);
      setNewEmail("");
    },
    onError:function(err){
      showToast(err.userMessage || err.message ||"Failed to change email","error");
    },
  });

  // ─── Data export handler ──────────────────────────────────────
  function handleExportData(){
    setExportLoading(true);
    var url=USERS.EXPORT_DATA+"?format="+exportFormat;
    apiGet(url).then(function(data){
      var blob;
      var filename;
      if(exportFormat==="csv"){
        // For CSV the response is text content
        blob=new Blob([typeof data==="string"?data:JSON.stringify(data)],{type:"text/csv;charset=utf-8"});
        filename="dreamplanner-export.csv";
      }else{
        blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
        filename="dreamplanner-export.json";
      }
      var link=document.createElement("a");
      link.href=URL.createObjectURL(blob);
      link.download=filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast(t("settings.exportSuccess")||"Data exported successfully","success");
    }).catch(function(err){
      showToast(err.userMessage||err.message||"Failed to export data","error");
    }).finally(function(){
      setExportLoading(false);
    });
  }

  // ─── Smart Notification Timing ──────────────────────────────────
  function handleOptimizeTiming(){
    setTimingLoading(true);
    apiGet(USERS.NOTIFICATION_TIMING).then(function(data){
      setTimingData(data);
      setShowTimingSection(true);
      showToast("AI analysis complete","success");
    }).catch(function(err){
      showToast(err.userMessage||err.message||"Failed to analyze notification timing","error");
    }).finally(function(){
      setTimingLoading(false);
    });
  }

  function handleApplyTiming(){
    if(!timingData||!timingData.suggestion)return;
    setTimingApplying(true);
    apiPut(USERS.NOTIFICATION_TIMING,timingData.suggestion).then(function(data){
      setTimingData(function(prev){return prev?Object.assign({},prev,{current_timing:data.notification_timing}):prev;});
      showToast("Smart timing applied successfully","success");
    }).catch(function(err){
      showToast(err.userMessage||err.message||"Failed to apply timing","error");
    }).finally(function(){
      setTimingApplying(false);
    });
  }

  function formatHour(h){
    if(h===0)return"12 AM";
    if(h===12)return"12 PM";
    if(h<12)return h+" AM";
    return(h-12)+" PM";
  }

  function getTypeLabel(t){
    var labels={
      reminder:"Reminders",motivation:"Motivation",progress:"Progress",
      achievement:"Achievements",check_in:"Check-ins",rescue:"Rescue",
      buddy:"Buddy",system:"System",dream_completed:"Dream Completed",
      weekly_report:"Weekly Report",daily_summary:"Daily Summary",
      missed_call:"Missed Calls",
    };
    return labels[t]||t;
  }

  function getDayLabel(d){
    var labels={
      daily:"Every day",weekday:"Weekdays",weekend:"Weekends",
      monday:"Monday",tuesday:"Tuesday",wednesday:"Wednesday",
      thursday:"Thursday",friday:"Friday",saturday:"Saturday",sunday:"Sunday",
    };
    return labels[d]||d;
  }

  // ─── Delete account mutation ───────────────────────────────────
  var deleteMutation=useMutation({
    mutationFn:function(body){return apiPost(USERS.DELETE_ACCOUNT,body);},
    onSuccess:function(){
      showToast(t("settings.accountDeletedScheduled")||"Account scheduled for deletion in 30 days","info");
      setShowDelete(false);
      logout();
    },
    onError:function(err){
      showToast(err.userMessage || err.message ||"Failed to delete account","error");
    },
  });

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  // Sync accent color from backend user profile on mount
  useEffect(function(){
    if(user&&user.accent_color&&/^#[0-9A-Fa-f]{6}$/.test(user.accent_color)){
      setAccentColor(user.accent_color);
    }
  },[user&&user.accent_color]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync timezone preference to localStorage and backend
  useEffect(()=>{
    try{localStorage.setItem("dp-timezone",tz);}catch(e){}
    // Sync to backend so streak calculations use correct timezone
    apiPut(USERS.UPDATE_PROFILE, { timezone: tz }).catch(function(){});
  },[tz]);


  const Toggle=({on,onToggle})=>{
    return(
    <button onClick={onToggle} style={{width:44,height:26,borderRadius:13,padding:2,border:"none",cursor:"pointer",background:on?"rgba(93,229,168,0.3)":"var(--dp-accent-soft)",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)"}}>
      <div style={{width:22,height:22,borderRadius:11,background:on?"var(--dp-success)":"var(--dp-text-muted)",transform:on?"translateX(18px)":"translateX(0)",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",boxShadow:on?"0 0 8px rgba(93,229,168,0.4)":"none"}}/>
    </button>
    );
  };

  const Tile=({icon:I,title,sub,right,onClick,color="#C4B5FD"})=>{
    const{resolved:_r}=useTheme();const _isLight=_r==="light";
    const _mc=color==="rgba(255,255,255,0.85)"?(_isLight?"rgba(26,21,53,0.7)":"rgba(255,255,255,0.85)"):adaptColor(color,_isLight);
    return(
    <GlassCard hover onClick={onClick} padding="12px 16px" mb={6} style={{cursor:onClick?"pointer":"default",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:36,height:36,borderRadius:12,background:`${color}10`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <I size={17} color={_mc} strokeWidth={2}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,color:"var(--dp-text)"}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:1}}>{sub}</div>}
      </div>
      {right||<ChevronRight size={16} color="var(--dp-text-muted)" strokeWidth={2}/>}
    </GlassCard>
    );
  };

  const Section=({title,delay,children})=>{
    return(
    <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${delay}ms`}}>
      <h2 style={{fontSize:12,fontWeight:700,color:"var(--dp-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,paddingLeft:4,margin:0,marginBottom:8}}>{title}</h2>
      {children}
      <div style={{height:12}}/>
    </div>
    );
  };

  const langLabel=LANGUAGES.find(l=>l.code===locale)?.label||"English";

  return(
    <div className="dp-desktop-main" style={{position:"absolute",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      <GlassAppBar
        className="dp-desktop-header"
        left={<IconButton icon={ArrowLeft} onClick={()=>navigate("/profile")} label="Go back"/>}
        title={t("settings.title")}
      />

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"20px 16px 32px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div className="dp-content-area">

          <Section title={t("settings.account")} delay={0}>
            <Tile icon={User} title={t("settings.editProfile")} sub={(user&&user.displayName)||""} onClick={()=>navigate("/edit-profile")}/>
            <Tile icon={Mail} title={t("settings.email")} sub={(user&&user.email)||""} onClick={function(){setShowEmailChange(true);setNewEmail("");}}/>
            <Tile icon={Lock} title={t("settings.changePassword")} onClick={()=>navigate("/change-password")}/>
            <Tile icon={Shield} title={t("settings.twoFactor") || "Two-Factor Auth"} onClick={()=>navigate("/settings/2fa")}/>
            <Tile icon={UserX} title={t("settings.blockedUsers") || "Blocked Users"} onClick={()=>navigate("/settings/blocked")}/>
          </Section>

          <Section title={t("settings.dataPrivacy") || "Data & Privacy"} delay={50}>
            <GlassCard padding={14} mb={6}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:12,background:"rgba(139,92,246,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Download size={17} color="var(--dp-accent)" strokeWidth={2}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--dp-text)"}}>{t("settings.exportMyData") || "Export My Data"}</div>
                  <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:1}}>{t("settings.exportDescription") || "Download all your data as JSON or CSV"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {["json","csv"].map(function(fmt){
                  var isActive=exportFormat===fmt;
                  return(
                    <button key={fmt} onClick={function(){setExportFormat(fmt);}} style={{
                      flex:1,padding:"8px 12px",borderRadius:10,
                      border:isActive?"1px solid rgba(139,92,246,0.3)":"1px solid var(--dp-glass-border)",
                      background:isActive?"var(--dp-accent-soft)":"transparent",
                      color:isActive?"var(--dp-accent)":"var(--dp-text-tertiary)",
                      fontSize:13,fontWeight:isActive?600:400,cursor:"pointer",fontFamily:"inherit",
                      transition:"all 0.2s",textTransform:"uppercase",
                    }}>{fmt}</button>
                  );
                })}
              </div>
              <button disabled={exportLoading} onClick={handleExportData} className="dp-gh" style={{
                width:"100%",padding:"10px 0",borderRadius:12,border:"1px solid var(--dp-accent-border)",
                background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:13,fontWeight:600,
                cursor:exportLoading?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",
                justifyContent:"center",gap:8,transition:"all 0.2s",opacity:exportLoading?0.6:1,
              }}>
                <Download size={14} strokeWidth={2}/>
                {exportLoading?(t("settings.exporting")||"Generating..."):(t("settings.downloadExport")||"Download Export")}
              </button>
            </GlassCard>
          </Section>

          <Section title={t("settings.appearance")} delay={100}>
            <GlassCard padding={14} mb={6}>
              <div style={{fontSize:14,fontWeight:500,color:"var(--dp-text)",marginBottom:12}}>{t("settings.visualTheme")}</div>
              <div style={{display:"flex",gap:10}}>
                {[
                  {id:"default",label:t("settings.default"),sub:t("settings.dayNight"),icons:[Sun,Moon],preview:["#f0ecff","#7C3AED","#14B8A6","#F59E0B"]},
                  {id:"cosmos",label:t("settings.cosmos"),sub:t("settings.space"),icons:[Sparkles],preview:["#0F0A1E","#8B5CF6","#C4B5FD","#5DE5A8"]},
                  {id:"saturn",label:t("settings.saturn"),sub:t("settings.planets"),icons:[Globe],preview:["#0A0520","#EC4899","#8B5CF6","#14B8A6"]},
                ].map(th=>{const active=theme===th.id;return(
                  <button key={th.id} onClick={()=>setTheme(th.id)} aria-pressed={active} style={{
                    flex:1,padding:"16px 12px",borderRadius:16,border:active?"1px solid rgba(139,92,246,0.4)":("1px solid var(--dp-glass-border)"),
                    background:active?"var(--dp-accent-soft)":(isLight?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.02)"),
                    display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",transition:"all 0.2s",
                    fontFamily:"inherit",
                  }}>
                    {/* Theme color preview */}
                    <div style={{width:"100%",height:40,borderRadius:10,overflow:"hidden",display:"flex",border:"1px solid var(--dp-glass-border)"}}>
                      {th.preview.map(function(c,ci){return <div key={ci} style={{flex:1,background:c}} />;})}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {th.icons.map((I,i)=><I key={i} size={16} color={active?"var(--dp-accent)":"var(--dp-text-muted)"} strokeWidth={2}/>)}
                    </div>
                    <span style={{fontSize:13,fontWeight:active?600:500,color:active?"var(--dp-accent)":"var(--dp-text-primary)"}}>{th.label}</span>
                    <span style={{fontSize:11,color:"var(--dp-text-muted)"}}>{th.sub}</span>
                    {active&&<div style={{width:6,height:6,borderRadius:3,background:"var(--dp-accent)",boxShadow:"0 0 6px rgba(196,181,253,0.5)"}}/>}
                  </button>
                );})}
              </div>
            </GlassCard>
            {theme==="default"&&(
              <GlassCard padding={14} mb={6} style={{marginTop:6}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--dp-text)",marginBottom:10}}>{t("settings.timeOfDay")}</div>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {id:null,Icon:Monitor,label:t("settings.auto")},
                    {id:"day",Icon:Sun,label:t("settings.day")},
                    {id:"night",Icon:Moon,label:t("settings.night")},
                  ].map(m=>{const active=forceMode===m.id;return(
                    <button key={m.label} onClick={()=>setForceMode(m.id)} style={{
                      flex:1,padding:"10px 8px",borderRadius:12,
                      border:active?"1px solid rgba(139,92,246,0.3)":("1px solid var(--dp-glass-border)"),
                      background:active?"var(--dp-accent-soft)":"transparent",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",fontSize:12,fontFamily:"inherit",
                      color:active?"var(--dp-accent)":"var(--dp-text-tertiary)",transition:"all 0.2s",
                    }}>
                      <m.Icon size={16} strokeWidth={2}/>
                      <span style={{fontWeight:active?600:400}}>{m.label}</span>
                    </button>
                  );})}
                </div>
              </GlassCard>
            )}

            {/* ═══ ACCENT COLOR PICKER ═══ */}
            <GlassCard padding={14} mb={6} style={{marginTop:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <Palette size={16} color="var(--dp-accent)" strokeWidth={2}/>
                <div style={{fontSize:14,fontWeight:500,color:"var(--dp-text)"}}>Accent Color</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:10}}>
                {ACCENT_PRESETS.map(function(preset){
                  var isActive=accentColor.toUpperCase()===preset.color.toUpperCase();
                  return(
                    <button key={preset.color} onClick={function(){setAccentColor(preset.color);setShowCustomHex(false);apiPut(USERS.UPDATE_PROFILE,{accent_color:preset.color}).catch(function(){});}} title={preset.name} style={{
                      width:"100%",aspectRatio:"1",borderRadius:12,border:isActive?("2px solid "+preset.color):("2px solid var(--dp-glass-border)"),
                      background:preset.color,cursor:"pointer",position:"relative",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)",
                      boxShadow:isActive?("0 0 12px "+preset.color+"40"):"none",
                      transform:isActive?"scale(1.08)":"scale(1)",
                      fontFamily:"inherit",padding:0,
                    }}>
                      {isActive&&<Check size={18} color="#fff" strokeWidth={3} style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.5))"}}/>}
                    </button>
                  );
                })}
              </div>
              {/* Custom hex input */}
              <div style={{marginTop:12}}>
                <button onClick={function(){setShowCustomHex(!showCustomHex);setCustomHex(accentColor);}} className="dp-gh" style={{
                  width:"100%",padding:"10px 14px",borderRadius:12,
                  border:showCustomHex?"1px solid var(--dp-accent-border)":"1px solid var(--dp-glass-border)",
                  background:showCustomHex?"var(--dp-accent-soft)":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  cursor:"pointer",fontSize:13,fontWeight:500,fontFamily:"inherit",
                  color:showCustomHex?"var(--dp-accent)":"var(--dp-text-tertiary)",
                  transition:"all 0.2s",
                }}>
                  <Palette size={14} strokeWidth={2}/>
                  Custom
                </button>
                {showCustomHex&&(
                  <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:(/^#[0-9A-Fa-f]{6}$/.test(customHex)?customHex:"var(--dp-glass-bg)"),border:"1px solid var(--dp-glass-border)",flexShrink:0}}/>
                    <GlassInput value={customHex} onChange={function(e){setCustomHex(e.target.value);}} placeholder="#8B5CF6" maxLength={7} style={{flex:1,fontFamily:"monospace",fontSize:14}}/>
                    <button disabled={!/^#[0-9A-Fa-f]{6}$/.test(customHex)} onClick={function(){if(/^#[0-9A-Fa-f]{6}$/.test(customHex)){setAccentColor(customHex);apiPut(USERS.UPDATE_PROFILE,{accent_color:customHex}).catch(function(){});}}} style={{
                      padding:"8px 16px",borderRadius:10,border:"none",
                      background:/^#[0-9A-Fa-f]{6}$/.test(customHex)?"var(--dp-accent-soft)":"var(--dp-glass-bg)",
                      color:/^#[0-9A-Fa-f]{6}$/.test(customHex)?"var(--dp-accent)":"var(--dp-text-muted)",
                      fontSize:13,fontWeight:600,cursor:/^#[0-9A-Fa-f]{6}$/.test(customHex)?"pointer":"not-allowed",
                      fontFamily:"inherit",transition:"all 0.2s",
                    }}>Apply</button>
                  </div>
                )}
              </div>
            </GlassCard>
          </Section>

          <Section title={t("settings.soundsHaptics") || "Sounds & Haptics"} delay={150}>
            <Tile icon={Volume2} title={t("settings.sounds") || "Sounds"} sub={t("settings.soundsSub") || "Play sounds for notifications and actions"} color="#93C5FD" right={<Toggle on={soundsOn} onToggle={function(){var next=!soundsOn;setSoundsOn(next);setSoundEnabled(next);if(next)playSound("success");}}/>}/>
            <Tile icon={Smartphone} title={t("settings.haptics") || "Haptic Feedback"} sub={t("settings.hapticsSub") || "Vibration feedback for interactions"} color="#5EEAD4" right={<Toggle on={hapticsOn} onToggle={function(){var next=!hapticsOn;setHapticsOn(next);setHapticsEnabled(next);if(next)playHapticPattern("success");}}/>}/>
            {soundsOn && (
              <GlassCard padding={14} mb={6}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--dp-text)",marginBottom:10}}>{t("settings.previewSounds") || "Preview Sounds"}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {getSoundNames().map(function(name){return(
                    <button key={name} onClick={function(){playSound(name);if(hapticsOn)playHapticPattern(name);}} className="dp-gh" style={{
                      display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,
                      border:"1px solid var(--dp-glass-border)",background:"var(--dp-glass-bg)",
                      cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"inherit",
                      color:"var(--dp-text-primary)",transition:"all 0.15s",
                    }}>
                      <Play size={12} strokeWidth={2.5} color="var(--dp-accent)"/>
                      <span style={{textTransform:"capitalize"}}>{name}</span>
                    </button>
                  );})}
                </div>
              </GlassCard>
            )}
          </Section>

          <Section title={t("settings.preferences")} delay={250}>
            <Tile icon={Globe} title={t("settings.language")} sub={langLabel} onClick={()=>setShowLang(true)}/>
            <Tile icon={Clock} title={t("settings.timezone")} sub={TIMEZONES.find(tz_item=>tz_item.value===tz)?.label||tz} onClick={()=>setShowTz(true)}/>
            <Tile icon={BellRing} title={t("settings.pushNotifications")} right={<Toggle on={notifs.push} onToggle={function(){var next={...notifs,push:!notifs.push};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak,daily_summary_enabled:next.dailySummary});}}/>}/>
            <Tile icon={Mail} title={t("settings.emailNotifications")} right={<Toggle on={notifs.email} onToggle={function(){var next={...notifs,email:!notifs.email};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak,daily_summary_enabled:next.dailySummary});}}/>}/>
            <Tile icon={User} title={t("settings.buddyReminders")} right={<Toggle on={notifs.buddy} onToggle={function(){var next={...notifs,buddy:!notifs.buddy};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak,daily_summary_enabled:next.dailySummary});}}/>} color="#5EEAD4"/>
            <Tile icon={Calendar} title={t("settings.dailySummary")||"Daily Summary"} sub={t("settings.dailySummarySub")||"Morning schedule preview notification"} right={<Toggle on={notifs.dailySummary} onToggle={function(){var next={...notifs,dailySummary:!notifs.dailySummary};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak,daily_summary_enabled:next.dailySummary});}}/>} color="#93C5FD"/>
            <Tile icon={BellOff} title={t("settings.doNotDisturb")} sub={dndEnabled?(dndStart+" - "+dndEnd):undefined} right={<Toggle on={dndEnabled} onToggle={function(){var next=!dndEnabled;setDndEnabled(next);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,daily_summary_enabled:notifs.dailySummary,dndEnabled:next,dndStart:dndStart,dndEnd:dndEnd});}}/>}/>
            {dndEnabled&&(
              <GlassCard padding={14} mb={6}>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",marginBottom:6,display:"block"}}>{t("settings.from")}</label>
                    <GlassInput type="time" value={dndStart} onChange={function(e){setDndStart(e.target.value);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,daily_summary_enabled:notifs.dailySummary,dndEnabled:dndEnabled,dndStart:e.target.value,dndEnd:dndEnd});}}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",marginBottom:6,display:"block"}}>{t("settings.to")}</label>
                    <GlassInput type="time" value={dndEnd} onChange={function(e){setDndEnd(e.target.value);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,daily_summary_enabled:notifs.dailySummary,dndEnabled:dndEnabled,dndStart:dndStart,dndEnd:e.target.value});}}/>
                  </div>
                </div>
              </GlassCard>
            )}
            <Tile icon={Calendar} title={t("settings.googleCalendar")} sub={t("settings.syncEvents")} color="#93C5FD" onClick={()=>navigate("/calendar-connect")}/>
          </Section>

          {/* ═══ SMART NOTIFICATION TIMING ═══ */}
          <Section title="Smart Notification Timing" delay={300}>
            <GlassCard padding={16} mb={6}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:14,background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(93,229,168,0.15))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Brain size={20} color="var(--dp-accent)" strokeWidth={2}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)"}}>AI Notification Optimizer</div>
                  <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:2}}>Analyzes your activity patterns to find the best times to send notifications</div>
                </div>
              </div>

              <button disabled={timingLoading} onClick={handleOptimizeTiming} className="dp-gh" style={{
                width:"100%",padding:"12px 0",borderRadius:12,border:"1px solid var(--dp-accent-border)",
                background:"linear-gradient(135deg,var(--dp-accent-soft),rgba(93,229,168,0.08))",
                color:"var(--dp-accent)",fontSize:13,fontWeight:600,
                cursor:timingLoading?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",
                justifyContent:"center",gap:8,transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                opacity:timingLoading?0.7:1,
              }}>
                {timingLoading?(
                  <Loader2 size={16} strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>
                ):(
                  <Zap size={15} strokeWidth={2}/>
                )}
                {timingLoading?"Analyzing your patterns...":"Optimize with AI"}
              </button>
            </GlassCard>

            {/* ── Results ── */}
            {timingData&&timingData.suggestion&&showTimingSection&&(
              <>
                {/* Engagement Score */}
                <GlassCard padding={14} mb={6}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)"}}>Engagement Score</div>
                    <div style={{fontSize:20,fontWeight:700,color:timingData.suggestion.engagement_score>=0.7?"var(--dp-success)":timingData.suggestion.engagement_score>=0.4?"var(--dp-warning)":"var(--dp-text-muted)"}}>{Math.round(timingData.suggestion.engagement_score*100)}%</div>
                  </div>
                  <div style={{width:"100%",height:6,borderRadius:3,background:"var(--dp-glass-bg)",overflow:"hidden"}}>
                    <div style={{width:(timingData.suggestion.engagement_score*100)+"%",height:"100%",borderRadius:3,background:timingData.suggestion.engagement_score>=0.7?"var(--dp-success)":timingData.suggestion.engagement_score>=0.4?"var(--dp-warning)":"var(--dp-text-muted)",transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)"}}/>
                  </div>
                  <div style={{fontSize:11,color:"var(--dp-text-tertiary)",marginTop:6}}>
                    Based on {timingData.activity_summary?timingData.activity_summary.total_days_analyzed:0} days of activity and {timingData.activity_summary?timingData.activity_summary.notifications_analyzed:0} notifications
                  </div>
                </GlassCard>

                {/* Visual Timeline */}
                <GlassCard padding={14} mb={6}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",marginBottom:12}}>Optimal Notification Timeline</div>
                  <div style={{position:"relative",height:48,background:"var(--dp-glass-bg)",borderRadius:10,overflow:"hidden",border:"1px solid var(--dp-glass-border)"}}>
                    {/* Hour markers */}
                    {[0,6,12,18].map(function(h){return(
                      <div key={h} style={{position:"absolute",left:(h/24*100)+"%",top:0,bottom:0,borderLeft:"1px dashed var(--dp-glass-border)",zIndex:1}}>
                        <span style={{position:"absolute",top:2,left:3,fontSize:9,color:"var(--dp-text-muted)"}}>{formatHour(h)}</span>
                      </div>
                    );})}
                    {/* Quiet hours overlay */}
                    {timingData.suggestion.quiet_hours&&(function(){
                      var qs=timingData.suggestion.quiet_hours.start;
                      var qe=timingData.suggestion.quiet_hours.end;
                      if(qs>qe){
                        return(
                          <>
                            <div style={{position:"absolute",left:(qs/24*100)+"%",right:0,top:0,bottom:0,background:"rgba(239,68,68,0.08)",zIndex:0}}/>
                            <div style={{position:"absolute",left:0,width:(qe/24*100)+"%",top:0,bottom:0,background:"rgba(239,68,68,0.08)",zIndex:0}}/>
                          </>
                        );
                      }
                      return <div style={{position:"absolute",left:(qs/24*100)+"%",width:((qe-qs)/24*100)+"%",top:0,bottom:0,background:"rgba(239,68,68,0.08)",zIndex:0}}/>;
                    })()}
                    {/* Notification type markers */}
                    {timingData.suggestion.optimal_times.map(function(ot,idx){
                      var hue=(idx*137)%360;
                      return(
                        <div key={idx} title={getTypeLabel(ot.notification_type)+" at "+formatHour(ot.best_hour)} style={{
                          position:"absolute",left:(ot.best_hour/24*100)+"%",top:"50%",transform:"translate(-50%,-50%)",
                          width:10,height:10,borderRadius:"50%",
                          background:"hsl("+hue+",70%,65%)",
                          border:"2px solid var(--dp-glass-bg)",
                          zIndex:2,cursor:"pointer",
                          boxShadow:"0 0 6px hsla("+hue+",70%,65%,0.4)",
                        }}/>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:10,color:"var(--dp-text-muted)"}}>12 AM</span>
                    <span style={{fontSize:10,color:"var(--dp-text-muted)"}}>11 PM</span>
                  </div>
                </GlassCard>

                {/* Quiet Hours */}
                {timingData.suggestion.quiet_hours&&(
                  <GlassCard padding={14} mb={6}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:10,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <BellOff size={15} color="var(--dp-danger)" strokeWidth={2}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)"}}>Suggested Quiet Hours</div>
                        <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:2}}>{formatHour(timingData.suggestion.quiet_hours.start)} - {formatHour(timingData.suggestion.quiet_hours.end)}</div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Per-Type Timing */}
                <GlassCard padding={14} mb={6}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",marginBottom:10}}>Per-Type Recommendations</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {timingData.suggestion.optimal_times.map(function(ot,idx){
                      var hue=(idx*137)%360;
                      return(
                        <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-glass-border)"}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:"hsl("+hue+",70%,65%)",flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:500,color:"var(--dp-text)"}}>{getTypeLabel(ot.notification_type)}</div>
                            <div style={{fontSize:11,color:"var(--dp-text-tertiary)",marginTop:1}}>{ot.reason}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--dp-accent)"}}>{formatHour(ot.best_hour)}</div>
                            <div style={{fontSize:10,color:"var(--dp-text-muted)"}}>{getDayLabel(ot.best_day)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Apply All Button */}
                <button disabled={timingApplying} onClick={handleApplyTiming} className="dp-gh" style={{
                  width:"100%",padding:"14px 0",borderRadius:14,border:"none",
                  background:"linear-gradient(135deg,rgba(139,92,246,0.2),rgba(93,229,168,0.2))",
                  color:"var(--dp-accent)",fontSize:14,fontWeight:600,
                  cursor:timingApplying?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",
                  justifyContent:"center",gap:8,transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                  opacity:timingApplying?0.6:1,marginBottom:6,
                  boxShadow:"0 4px 20px rgba(139,92,246,0.15)",
                }}>
                  {timingApplying?(
                    <Loader2 size={16} strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>
                  ):(
                    <Check size={16} strokeWidth={2.5}/>
                  )}
                  {timingApplying?"Applying...":"Apply All Recommendations"}
                </button>

                {/* Currently Applied Info */}
                {timingData.current_timing&&timingData.current_timing.last_optimized&&(
                  <div style={{fontSize:11,color:"var(--dp-text-muted)",textAlign:"center",marginTop:4}}>
                    Last optimized: {new Date(timingData.current_timing.last_optimized).toLocaleDateString()}
                  </div>
                )}
              </>
            )}
          </Section>

          <Section title={t("settings.subscription")} delay={350}>
            <Tile icon={Crown} title={t("settings.manageSubscription")} sub={(user&&user.subscription)||"Free"} color="#FCD34D" onClick={()=>navigate("/subscription")}/>
            <Tile icon={ShoppingBag} title={t("settings.store")} color="#5EEAD4" onClick={()=>navigate("/store")}/>
          </Section>

          <Section title={t("settings.about")} delay={450}>
            <Tile icon={Info} title={t("settings.appVersion")} sub="1.0.0" color="rgba(255,255,255,0.85)" onClick={()=>navigate("/app-version")}/>
            <Tile icon={FileText} title={t("settings.terms")} color="rgba(255,255,255,0.85)" onClick={()=>navigate("/terms")}/>
            <Tile icon={Shield} title={t("settings.privacy")} color="rgba(255,255,255,0.85)" onClick={()=>navigate("/privacy")}/>
          </Section>

          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"550ms"}}>
            <button onClick={function(){logout();}} className="dp-gh" style={{width:"100%",padding:"14px 0",borderRadius:16,border:"1px solid rgba(246,154,154,0.15)",background:"rgba(246,154,154,0.06)",color:"var(--dp-danger)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s",marginBottom:16}}>
              <LogOut size={16} strokeWidth={2}/>{t("settings.signOut")}
            </button>
          </div>

          <Section title={t("settings.dangerZone") || "Danger Zone"} delay={600}>
            <GlassCard padding={14} mb={6} style={{border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.03)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:12,background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <AlertTriangle size={17} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--dp-text)"}}>{t("settings.deleteAccount") || "Delete Account"}</div>
                  <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:1}}>{t("settings.deleteAccountSub") || "Permanently delete your account and all data"}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:"var(--dp-text-tertiary)",lineHeight:1.5,marginBottom:12,padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.1)"}}>
                {t("settings.deleteWarningBrief") || "This will permanently delete all your dreams, goals, tasks, conversations, and achievements. Your account will be scheduled for deletion in 30 days."}
              </div>
              <button onClick={function(){setShowDelete(true);setDeleteText("");setDeletePassword("");}} className="dp-gh" style={{
                width:"100%",padding:"10px 0",borderRadius:12,border:"1px solid rgba(239,68,68,0.25)",
                background:"rgba(239,68,68,0.08)",color:"rgba(239,68,68,0.9)",fontSize:13,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",
                justifyContent:"center",gap:8,transition:"all 0.2s",
              }}>
                <Trash2 size={14} strokeWidth={2}/>{t("settings.deleteAccount") || "Delete Account"}
              </button>
            </GlassCard>
          </Section>

        </div>
      </main>

      {/* ═══ LANGUAGE PICKER ═══ */}
      <GlassModal open={showLang} onClose={()=>setShowLang(false)} variant="bottom" title={t("settings.chooseLanguage")}>
        <div style={{padding:"8px 12px 20px"}}>
          {LANGUAGES.map(l=>(
            <button key={l.code} onClick={()=>{setLocale(l.code);setShowLang(false);}} className="dp-gh" style={{
              width:"100%",padding:"12px 16px",borderRadius:12,border:"none",marginBottom:4,
              background:locale===l.code?"var(--dp-accent-soft)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
              transition:"all 0.15s",fontFamily:"inherit",
            }}>
              <span style={{fontSize:14,fontWeight:locale===l.code?600:400,color:locale===l.code?"var(--dp-accent)":"var(--dp-text-primary)"}}>{l.label}</span>
              {locale===l.code&&<Check size={16} color="var(--dp-accent)" strokeWidth={2.5}/>}
            </button>
          ))}
        </div>
      </GlassModal>

      {/* ═══ TIMEZONE PICKER ═══ */}
      <GlassModal open={showTz} onClose={()=>{setShowTz(false);setTzSearch("");}} variant="bottom" title={t("settings.chooseTimezone")}>
        <div style={{padding:"8px 12px 0",flexShrink:0}}>
          <GlassInput value={tzSearch} onChange={e=>setTzSearch(e.target.value)} placeholder={t("settings.searchTimezones")} autoFocus/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 12px 20px"}}>
          {TIMEZONES.filter(tz_item=>!tzSearch||tz_item.label.toLowerCase().includes(tzSearch.toLowerCase())||tz_item.value.toLowerCase().includes(tzSearch.toLowerCase())).map(tz_item=>(
            <button key={tz_item.value} onClick={()=>{setTz(tz_item.value);setShowTz(false);setTzSearch("");}} className="dp-gh" style={{
              width:"100%",padding:"12px 16px",borderRadius:12,border:"none",marginBottom:4,
              background:tz===tz_item.value?"var(--dp-accent-soft)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
              transition:"all 0.15s",fontFamily:"inherit",
            }}>
              <div>
                <span style={{fontSize:14,fontWeight:tz===tz_item.value?600:400,color:tz===tz_item.value?"var(--dp-accent)":"var(--dp-text-primary)"}}>{tz_item.label}</span>
                <span style={{fontSize:12,color:"var(--dp-text-muted)",marginLeft:8}}>UTC{tz_item.offset}</span>
              </div>
              {tz===tz_item.value&&<Check size={16} color="var(--dp-accent)" strokeWidth={2.5}/>}
            </button>
          ))}
        </div>
      </GlassModal>

      {/* ═══ EMAIL CHANGE DIALOG ═══ */}
      <GlassModal open={showEmailChange} onClose={function(){setShowEmailChange(false);setNewEmail("");}} variant="center" maxWidth={380} style={{padding:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"var(--dp-accent-soft)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Mail size={20} color="var(--dp-accent)" strokeWidth={2}/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("settings.changeEmail")}</div>
            <div style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{t("settings.verificationSent")}</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--dp-text-primary)",lineHeight:1.5,marginBottom:12}}>
          {t("settings.current")} <strong>{(user&&user.email)||""}</strong>
        </div>
        <GlassInput value={newEmail} onChange={function(e){setNewEmail(e.target.value);}} placeholder={t("settings.newEmail")} type="email" autoFocus style={{marginBottom:14}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={function(){setShowEmailChange(false);setNewEmail("");}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-glass-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("settings.cancel")||"Cancel"}</button>
          <button disabled={!newEmail||emailMutation.isPending} onClick={function(){var cleanEmail=sanitizeText(newEmail,254);if(!isValidEmail(cleanEmail)){showToast("Please enter a valid email address","error");return;}emailMutation.mutate({newEmail:cleanEmail});}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:newEmail?"rgba(139,92,246,0.2)":"var(--dp-glass-bg)",color:newEmail?"var(--dp-accent)":"var(--dp-text-muted)",fontSize:14,fontWeight:600,cursor:newEmail?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s"}}>{emailMutation.isPending?"Saving...":"Save"}</button>
        </div>
      </GlassModal>

      {/* ═══ DELETE ACCOUNT DIALOG ═══ */}
      <GlassModal open={showDelete} onClose={()=>setShowDelete(false)} variant="center" maxWidth={400} style={{padding:24,borderColor:"rgba(239,68,68,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <AlertTriangle size={20} color="rgba(239,68,68,0.9)" strokeWidth={2}/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("settings.deleteAccount") || "Delete Account"}</div>
            <div style={{fontSize:12,color:"rgba(239,68,68,0.7)"}}>{t("settings.cannotBeUndone") || "This action cannot be undone"}</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--dp-text-primary)",lineHeight:1.6,marginBottom:14,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.12)"}}>
          {t("settings.deleteConsequences") || "Deleting your account will:"}
          <ul style={{margin:"6px 0 0",paddingLeft:18,fontSize:12,color:"var(--dp-text-tertiary)"}}>
            <li>{t("settings.deleteConseq1") || "Permanently remove all your dreams, goals, and tasks"}</li>
            <li>{t("settings.deleteConseq2") || "Delete all conversations and AI chat history"}</li>
            <li>{t("settings.deleteConseq3") || "Remove achievements and progress data"}</li>
            <li>{t("settings.deleteConseq4") || "Cancel any active subscription"}</li>
          </ul>
        </div>
        <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginBottom:10}}>
          {t("settings.typeDeleteConfirm") || "Type"} <strong style={{color:"rgba(239,68,68,0.9)"}}>DELETE</strong> {t("settings.toConfirm") || "to confirm"}
        </div>
        <GlassInput value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder={t("settings.typeDelete") || 'Type "DELETE"'} style={{marginBottom:10}}/>
        <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginBottom:6}}>{t("settings.confirmPassword") || "Enter your password to confirm"}</div>
        <GlassInput value={deletePassword} onChange={function(e){setDeletePassword(e.target.value);}} placeholder={t("settings.enterPassword") || "Password"} type="password" style={{marginBottom:14}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowDelete(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-glass-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("settings.cancel") || "Cancel"}</button>
          <button disabled={deleteText!=="DELETE"||!deletePassword||deleteMutation.isPending} onClick={function(){deleteMutation.mutate({password:deletePassword});}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:(deleteText==="DELETE"&&deletePassword)?"rgba(239,68,68,0.2)":"var(--dp-glass-bg)",color:(deleteText==="DELETE"&&deletePassword)?"rgba(239,68,68,0.9)":"var(--dp-text-muted)",fontSize:14,fontWeight:600,cursor:(deleteText==="DELETE"&&deletePassword)?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s"}}>{deleteMutation.isPending?(t("settings.deleting")||"Deleting..."):(t("settings.iUnderstandDelete")||"I understand, delete my account")}</button>
        </div>
      </GlassModal>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.35);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}
