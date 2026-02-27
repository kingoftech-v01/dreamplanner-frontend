import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useT } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPut, apiPost, apiDelete } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { isValidEmail, sanitizeText } from "../../utils/sanitize";
import {
  ArrowLeft, User, Mail, Lock, Sun, Moon, Monitor, Sparkles,
  Globe, Clock, Bell, Calendar, Crown, ShoppingBag,
  Info, FileText, Shield, LogOut, Trash2, X, Check,
  ChevronRight, AlertTriangle, BellOff, BellRing
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Settings Screen v1
 *
 * Sections: Account, Appearance, Preferences, Subscription, About
 * Interactive: theme picker, language selector, notification toggles,
 *              delete account confirmation with "DELETE" typing
 * ═══════════════════════════════════════════════════════════════════ */

const LANGUAGES = [
  {code:"en",label:"English"},{code:"fr",label:"Français"},
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
  const{theme,setTheme,resolved,uiOpacity,forceMode,setForceMode,visualTheme}=useTheme();const isLight=resolved==="light";
  const{t,locale,setLocale}=useT();
  const[notifs,setNotifs]=useState({push:true,email:true,buddy:true,streak:true});
  const[dndEnabled,setDndEnabled]=useState(false);
  const[dndStart,setDndStart]=useState("22:00");
  const[dndEnd,setDndEnd]=useState("07:00");

  // Fetch notification preferences from API
  useQuery({
    queryKey:["notification-preferences"],
    queryFn:function(){return apiGet(USERS.NOTIFICATION_PREFS);},
    onSuccess:function(data){
      if(data){
        setNotifs({
          push:data.pushEnabled!=null?!!data.pushEnabled:true,
          email:data.emailEnabled!=null?!!data.emailEnabled:true,
          buddy:data.buddyReminders!=null?!!data.buddyReminders:true,
          streak:data.streakReminders!=null?!!data.streakReminders:true,
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

  // ─── Notification preferences mutation ─────────────────────────
  var notifMutation=useMutation({
    mutationFn:function(prefs){return apiPut(USERS.NOTIFICATION_PREFS,prefs);},
    onSuccess:function(){
      queryClient.invalidateQueries({queryKey:["user"]});
      showToast(t("settings.preferencesSaved")||"Preferences saved","success");
    },
    onError:function(err){
      showToast(err.message||"Failed to save preferences","error");
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
      showToast(err.message||"Failed to change email","error");
    },
  });

  // ─── Delete account mutation ───────────────────────────────────
  var deleteMutation=useMutation({
    mutationFn:function(body){return apiDelete(USERS.DELETE_ACCOUNT,{body:body});},
    onSuccess:function(){
      showToast(t("settings.accountDeleted")||"Account deleted","info");
      setShowDelete(false);
      logout();
    },
    onError:function(err){
      showToast(err.message||"Failed to delete account","error");
    },
  });

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  // Sync timezone preference to localStorage
  useEffect(()=>{
    try{localStorage.setItem("dp-timezone",tz);}catch(e){}
  },[tz]);


  const Toggle=({on,onToggle})=>{
    const{resolved:_r}=useTheme();const _isLight=_r==="light";
    return(
    <button onClick={onToggle} style={{width:44,height:26,borderRadius:13,padding:2,border:"none",cursor:"pointer",background:on?"rgba(93,229,168,0.3)":(_isLight?"rgba(139,92,246,0.12)":"rgba(255,255,255,0.08)"),transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)"}}>
      <div style={{width:22,height:22,borderRadius:11,background:on?"#5DE5A8":(_isLight?"rgba(26,21,53,0.25)":"rgba(255,255,255,0.3)"),transform:on?"translateX(18px)":"translateX(0)",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",boxShadow:on?"0 0 8px rgba(93,229,168,0.4)":"none"}}/>
    </button>
    );
  };

  const Tile=({icon:I,title,sub,right,onClick,color="#C4B5FD"})=>{
    const{resolved:_r}=useTheme();const _isLight=_r==="light";
    const _mc=color==="#C4B5FD"?(_isLight?"#6D28D9":"#C4B5FD"):color==="#FCD34D"?(_isLight?"#B45309":"#FCD34D"):color==="#5EEAD4"?(_isLight?"#0D9488":"#5EEAD4"):color==="#5DE5A8"?(_isLight?"#059669":"#5DE5A8"):color==="#F69A9A"?(_isLight?"#DC2626":"#F69A9A"):color==="rgba(255,255,255,0.85)"?(_isLight?"rgba(26,21,53,0.7)":"rgba(255,255,255,0.85)"):color;
    return(
    <div className="dp-g dp-gh" onClick={onClick} style={{padding:"12px 16px",marginBottom:6,cursor:onClick?"pointer":"default",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:36,height:36,borderRadius:12,background:`${color}10`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <I size={17} color={_mc} strokeWidth={2}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,color:_isLight?"#1a1535":"#fff"}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:_isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginTop:1}}>{sub}</div>}
      </div>
      {right||<ChevronRight size={16} color={_isLight?"rgba(26,21,53,0.4)":"rgba(255,255,255,0.3)"} strokeWidth={2}/>}
    </div>
    );
  };

  const Section=({title,delay,children})=>{
    const{resolved:_r}=useTheme();const _isLight=_r==="light";
    return(
    <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${delay}ms`}}>
      <div style={{fontSize:12,fontWeight:700,color:_isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,paddingLeft:4}}>{title}</div>
      {children}
      <div style={{height:12}}/>
    </div>
    );
  };

  const langLabel=LANGUAGES.find(l=>l.code===locale)?.label||"English";

  return(
    <div style={{width:"100%",height:"100dvh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",padding:"0 16px",gap:10,background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <button className="dp-ib" aria-label="Go back" onClick={()=>navigate(-1)}><ArrowLeft size={20} strokeWidth={2}/></button>
        <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>{t("settings.title")}</span>
      </header>

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"20px 16px 32px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%"}}>

          <Section title={t("settings.account")} delay={0}>
            <Tile icon={User} title={t("settings.editProfile")} sub={(user&&user.displayName)||""} onClick={()=>navigate("/edit-profile")}/>
            <Tile icon={Mail} title={t("settings.email")} sub={(user&&user.email)||""} onClick={function(){setShowEmailChange(true);setNewEmail("");}}/>
            <Tile icon={Lock} title={t("settings.changePassword")} onClick={()=>navigate("/change-password")}/>
          </Section>

          <Section title={t("settings.appearance")} delay={100}>
            <div className="dp-g" style={{padding:14,marginBottom:6}}>
              <div style={{fontSize:14,fontWeight:500,color:isLight?"#1a1535":"#fff",marginBottom:12}}>{t("settings.visualTheme")}</div>
              <div style={{display:"flex",gap:10}}>
                {[
                  {id:"default",label:"Default",sub:"Day & Night",icons:[Sun,Moon]},
                  {id:"cosmos",label:"Cosmos",sub:"Space",icons:[Sparkles]},
                  {id:"saturn",label:"Saturn",sub:"Planets",icons:[Globe]},
                ].map(th=>{const active=theme===th.id;return(
                  <button key={th.id} onClick={()=>setTheme(th.id)} style={{
                    flex:1,padding:"16px 12px",borderRadius:16,border:active?"1px solid rgba(139,92,246,0.4)":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"),
                    background:active?"rgba(139,92,246,0.12)":(isLight?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.02)"),
                    display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",transition:"all 0.2s",
                  }}>
                    <div style={{display:"flex",gap:4}}>
                      {th.icons.map((I,i)=><I key={i} size={18} color={active?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)")} strokeWidth={2}/>)}
                    </div>
                    <span style={{fontSize:13,fontWeight:active?600:500,color:active?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.7)":"rgba(255,255,255,0.85)")}}>{th.label}</span>
                    <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"}}>{th.sub}</span>
                    {active&&<div style={{width:6,height:6,borderRadius:3,background:isLight?"#7C3AED":"#C4B5FD",boxShadow:"0 0 6px rgba(196,181,253,0.5)"}}/>}
                  </button>
                );})}
              </div>
            </div>
            {theme==="default"&&(
              <div className="dp-g" style={{padding:14,marginTop:6,marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:500,color:isLight?"#1a1535":"#fff",marginBottom:10}}>{t("settings.timeOfDay")}</div>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {id:null,Icon:Monitor,label:t("settings.auto")},
                    {id:"day",Icon:Sun,label:t("settings.day")},
                    {id:"night",Icon:Moon,label:t("settings.night")},
                  ].map(m=>{const active=forceMode===m.id;return(
                    <button key={m.label} onClick={()=>setForceMode(m.id)} style={{
                      flex:1,padding:"10px 8px",borderRadius:12,
                      border:active?"1px solid rgba(139,92,246,0.3)":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"),
                      background:active?"rgba(139,92,246,0.1)":"transparent",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",fontSize:12,fontFamily:"inherit",
                      color:active?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.6)"),transition:"all 0.2s",
                    }}>
                      <m.Icon size={16} strokeWidth={2}/>
                      <span style={{fontWeight:active?600:400}}>{m.label}</span>
                    </button>
                  );})}
                </div>
              </div>
            )}
          </Section>

          <Section title={t("settings.preferences")} delay={200}>
            <Tile icon={Globe} title={t("settings.language")} sub={langLabel} onClick={()=>setShowLang(true)}/>
            <Tile icon={Clock} title={t("settings.timezone")} sub={TIMEZONES.find(tz_item=>tz_item.value===tz)?.label||tz} onClick={()=>setShowTz(true)}/>
            <Tile icon={BellRing} title={t("settings.pushNotifications")} right={<Toggle on={notifs.push} onToggle={function(){var next={...notifs,push:!notifs.push};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak});}}/>}/>
            <Tile icon={Mail} title={t("settings.emailNotifications")} right={<Toggle on={notifs.email} onToggle={function(){var next={...notifs,email:!notifs.email};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak});}}/>}/>
            <Tile icon={User} title={t("settings.buddyReminders")} right={<Toggle on={notifs.buddy} onToggle={function(){var next={...notifs,buddy:!notifs.buddy};setNotifs(next);notifMutation.mutate({pushEnabled:next.push,emailEnabled:next.email,buddyReminders:next.buddy,streakReminders:next.streak});}}/>} color="#5EEAD4"/>
            <Tile icon={BellOff} title="Do Not Disturb" sub={dndEnabled?(dndStart+" - "+dndEnd):undefined} right={<Toggle on={dndEnabled} onToggle={function(){var next=!dndEnabled;setDndEnabled(next);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,dndEnabled:next,dndStart:dndStart,dndEnd:dndEnd});}}/>}/>
            {dndEnabled&&(
              <div className="dp-g" style={{padding:14,marginBottom:6}}>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginBottom:6,display:"block"}}>From</label>
                    <input type="time" value={dndStart} onChange={function(e){setDndStart(e.target.value);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,dndEnabled:dndEnabled,dndStart:e.target.value,dndEnd:dndEnd});}}
                      style={{width:"100%",padding:"10px 12px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginBottom:6,display:"block"}}>To</label>
                    <input type="time" value={dndEnd} onChange={function(e){setDndEnd(e.target.value);notifMutation.mutate({pushEnabled:notifs.push,emailEnabled:notifs.email,buddyReminders:notifs.buddy,streakReminders:notifs.streak,dndEnabled:dndEnabled,dndStart:dndStart,dndEnd:e.target.value});}}
                      style={{width:"100%",padding:"10px 12px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                  </div>
                </div>
              </div>
            )}
            <Tile icon={Calendar} title={t("settings.googleCalendar")} sub="Sync your events" color="#93C5FD" onClick={()=>navigate("/calendar-connect")}/>
          </Section>

          <Section title={t("settings.subscription")} delay={300}>
            <Tile icon={Crown} title={t("settings.manageSubscription")} sub={(user&&user.subscription)||"Free"} color="#FCD34D" onClick={()=>navigate("/subscription")}/>
            <Tile icon={ShoppingBag} title={t("settings.store")} color="#5EEAD4" onClick={()=>navigate("/store")}/>
          </Section>

          <Section title={t("settings.about")} delay={400}>
            <Tile icon={Info} title={t("settings.appVersion")} sub="1.0.0" color="rgba(255,255,255,0.85)" onClick={()=>navigate("/app-version")}/>
            <Tile icon={FileText} title={t("settings.terms")} color="rgba(255,255,255,0.85)" onClick={()=>navigate("/terms")}/>
            <Tile icon={Shield} title={t("settings.privacy")} color="rgba(255,255,255,0.85)" onClick={()=>navigate("/privacy")}/>
          </Section>

          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"500ms"}}>
            <button onClick={function(){logout();}} style={{width:"100%",padding:"14px 0",borderRadius:16,border:"1px solid rgba(246,154,154,0.15)",background:"rgba(246,154,154,0.06)",color:isLight?"#DC2626":"#F69A9A",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s",marginBottom:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(246,154,154,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(246,154,154,0.06)"}>
              <LogOut size={16} strokeWidth={2}/>{t("settings.signOut")}
            </button>
            <button onClick={function(){setShowDelete(true);setDeleteText("");setDeletePassword("");}} style={{width:"100%",padding:"14px 0",borderRadius:16,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.04)",color:"rgba(239,68,68,0.8)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.04)"}>
              <Trash2 size={16} strokeWidth={2}/>{t("settings.deleteAccount")}
            </button>
          </div>

        </div>
      </main>

      {/* ═══ LANGUAGE PICKER ═══ */}
      {showLang&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={()=>setShowLang(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:420,maxHeight:"70vh",background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:"22px 22px 0 0",border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",borderBottom:"none",animation:"dpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Choose Language</span>
              <button className="dp-ib" aria-label="Close" style={{width:32,height:32}} onClick={()=>setShowLang(false)}><X size={16} strokeWidth={2}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 12px 20px"}}>
              {LANGUAGES.map(l=>(
                <button key={l.code} onClick={()=>{setLocale(l.code);setShowLang(false);}} style={{
                  width:"100%",padding:"12px 16px",borderRadius:12,border:"none",marginBottom:4,
                  background:locale===l.code?"rgba(139,92,246,0.1)":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
                  transition:"all 0.15s",fontFamily:"inherit",
                }}
                  onMouseEnter={e=>{if(locale!==l.code)e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.04)";}}
                  onMouseLeave={e=>{if(locale!==l.code)e.currentTarget.style.background="transparent";}}>
                  <span style={{fontSize:14,fontWeight:locale===l.code?600:400,color:locale===l.code?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)")}}>{l.label}</span>
                  {locale===l.code&&<Check size={16} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TIMEZONE PICKER ═══ */}
      {showTz&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={()=>{setShowTz(false);setTzSearch("");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:420,maxHeight:"70vh",background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:"22px 22px 0 0",border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",borderBottom:"none",animation:"dpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Choose Timezone</span>
              <button className="dp-ib" aria-label="Close" style={{width:32,height:32}} onClick={()=>{setShowTz(false);setTzSearch("");}}><X size={16} strokeWidth={2}/></button>
            </div>
            <div style={{padding:"8px 12px 0",flexShrink:0}}>
              <input value={tzSearch} onChange={e=>setTzSearch(e.target.value)} placeholder="Search timezones..." autoFocus style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 12px 20px"}}>
              {TIMEZONES.filter(tz_item=>!tzSearch||tz_item.label.toLowerCase().includes(tzSearch.toLowerCase())||tz_item.value.toLowerCase().includes(tzSearch.toLowerCase())).map(tz_item=>(
                <button key={tz_item.value} onClick={()=>{setTz(tz_item.value);setShowTz(false);setTzSearch("");}} style={{
                  width:"100%",padding:"12px 16px",borderRadius:12,border:"none",marginBottom:4,
                  background:tz===tz_item.value?"rgba(139,92,246,0.1)":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
                  transition:"all 0.15s",fontFamily:"inherit",
                }}
                  onMouseEnter={e=>{if(tz!==tz_item.value)e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.04)";}}
                  onMouseLeave={e=>{if(tz!==tz_item.value)e.currentTarget.style.background="transparent";}}>
                  <div>
                    <span style={{fontSize:14,fontWeight:tz===tz_item.value?600:400,color:tz===tz_item.value?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)")}}>{tz_item.label}</span>
                    <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)",marginLeft:8}}>UTC{tz_item.offset}</span>
                  </div>
                  {tz===tz_item.value&&<Check size={16} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMAIL CHANGE DIALOG ═══ */}
      {showEmailChange&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={function(){setShowEmailChange(false);setNewEmail("");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"90%",maxWidth:380,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.25s ease-out"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(139,92,246,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Mail size={20} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Change Email</div>
                <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>A verification email will be sent</div>
              </div>
            </div>
            <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.5,marginBottom:12}}>
              Current: <strong>{(user&&user.email)||""}</strong>
            </div>
            <input value={newEmail} onChange={function(e){setNewEmail(e.target.value);}} placeholder="New email address" type="email" autoFocus
              style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:14}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setShowEmailChange(false);setNewEmail("");}} style={{flex:1,padding:"12px",borderRadius:12,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("settings.cancel")||"Cancel"}</button>
              <button disabled={!newEmail||emailMutation.isPending} onClick={function(){var cleanEmail=sanitizeText(newEmail,254);if(!isValidEmail(cleanEmail)){showToast("Please enter a valid email address","error");return;}emailMutation.mutate({newEmail:cleanEmail});}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:newEmail?"rgba(139,92,246,0.2)":(isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)"),color:newEmail?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.3)":"rgba(255,255,255,0.2)"),fontSize:14,fontWeight:600,cursor:newEmail?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s"}}>{emailMutation.isPending?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE ACCOUNT DIALOG ═══ */}
      {showDelete&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setShowDelete(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"90%",maxWidth:380,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:"1px solid rgba(239,68,68,0.15)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.25s ease-out"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <AlertTriangle size={20} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{t("settings.deleteAccount")}</div>
                <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>This cannot be undone</div>
              </div>
            </div>
            <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.5,marginBottom:16}}>
              This will permanently delete your account, all dreams, progress, and data. Type <strong style={{color:"rgba(239,68,68,0.9)"}}>DELETE</strong> to confirm.
            </div>
            <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="Type DELETE"
              style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:10}}/>
            <input value={deletePassword} onChange={function(e){setDeletePassword(e.target.value);}} placeholder="Enter your password" type="password"
              style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:14}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowDelete(false)} style={{flex:1,padding:"12px",borderRadius:12,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("settings.cancel")}</button>
              <button disabled={deleteText!=="DELETE"||!deletePassword||deleteMutation.isPending} onClick={function(){deleteMutation.mutate({password:deletePassword});}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:(deleteText==="DELETE"&&deletePassword)?"rgba(239,68,68,0.2)":(isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)"),color:(deleteText==="DELETE"&&deletePassword)?"rgba(239,68,68,0.9)":(isLight?"rgba(26,21,53,0.3)":"rgba(255,255,255,0.2)"),fontSize:14,fontWeight:600,cursor:(deleteText==="DELETE"&&deletePassword)?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s"}}>{deleteMutation.isPending?"Deleting...":"Delete Forever"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.35);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}
